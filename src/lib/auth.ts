import "server-only";
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { db } from "./db";

const COOKIE = "qless_session";
const SESSION_DAYS = 60;
const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS = 3; // per phone per 10 minutes

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set to a long random string");
  return s;
}

function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a 6-digit code for this phone. Returns null when the phone has asked too often. */
export async function createOtp(phone: string): Promise<string | null> {
  const since = new Date(Date.now() - 10 * 60_000);
  const recent = await db.otpCode.count({ where: { phone, createdAt: { gte: since } } });
  if (recent >= OTP_MAX_SENDS) return null;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.otpCode.create({
    data: { phone, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000) },
  });
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const otp = await db.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) return false;
  if (otp.codeHash !== hashOtp(phone, code)) {
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
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const token = cookies().get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookies().delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
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
