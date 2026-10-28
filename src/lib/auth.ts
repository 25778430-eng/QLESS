import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { db } from "./db";

const COOKIE = "qless_session";
const SESSION_DAYS = 60;
const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS = 3; // per phone per 10 minutes
const OTP_MAX_SENDS_PER_IP = 10; // per hour, so one person can't text hundreds of numbers (SMS pumping)

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set to a long random string");
  return s;
}

function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");
}

/** Compares two strings without leaking how many characters matched. */
export function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The visitor's IP address. Vercel sets these headers itself, so they can't be faked. */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a 6-digit code for this phone. Returns null when the phone or the visitor has asked too often. */
export async function createOtp(phone: string): Promise<string | null> {
  const since = new Date(Date.now() - 10 * 60_000);
  const recent = await db.otpCode.count({ where: { phone, createdAt: { gte: since } } });
  if (recent >= OTP_MAX_SENDS) return null;
  const ip = await clientIp();
  if (ip) {
    const fromIp = await db.otpCode.count({ where: { ip, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } } });
    if (fromIp >= OTP_MAX_SENDS_PER_IP) return null;
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.otpCode.create({
    data: { phone, ip, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000) },
  });
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const otp = await db.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) return false;
  if (!sameSecret(otp.codeHash, hashOtp(phone, code))) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  return true;
}

export function isAdminPhone(phone: string): boolean {
  return (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .includes(phone);
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || session.user.banned) return null;
  return session.user;
}

export async function requireUser(role?: Role): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (role && user.role !== role && user.role !== "ADMIN") redirect("/");
  return user;
}

export async function requireVendor() {
  const user = await requireUser();
  const vendor = await db.vendor.findUnique({ where: { ownerId: user.id } });
  if (!vendor) redirect("/vendor/register");
  return { user, vendor };
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** Active staff records for this user's phone number, across shops. */
export async function staffFor(user: Pick<User, "phone">) {
  return db.staff.findMany({ where: { phone: user.phone, active: true, vendor: { status: "APPROVED" } }, include: { vendor: true } });
}

export async function requireStaff() {
  const user = await requireUser();
  const [staff] = await staffFor(user);
  if (!staff) redirect("/account");
  return { user, staff, vendor: staff.vendor };
}
