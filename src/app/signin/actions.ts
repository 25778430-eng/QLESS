"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createOtp, endSession, isAdminPhone, startSession, verifyOtp } from "@/lib/auth";
import { sendSms } from "@/lib/notify";
import { normalisePhone } from "@/lib/format";
import { back, str } from "@/lib/http";
import { validEmail } from "@/lib/verification";

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function sendCode(form: FormData) {
  const next = safeNext(str(form, "next") || "/");
  const phone = normalisePhone(str(form, "phone"));
  const here = `/signin?next=${encodeURIComponent(next)}`;
  if (!phone) back(here, { error: "Enter a valid South African cellphone number." });
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing?.banned) back(here, { error: "This account is blocked. Contact Qless support if you think this is a mistake." });
  const name = [str(form, "firstName"), str(form, "surname")].filter(Boolean).join(" ").slice(0, 80);
  const email = str(form, "email").toLowerCase();
  if (!existing && str(form, "mode") === "in") {
    const staff = await db.staff.findFirst({ where: { phone, active: true }, include: { vendor: true } });
    back(`/signin?next=${encodeURIComponent(next)}`, {
      error: staff
        ? `${staff.vendor.name} added you as staff. Create your account below with this number to see your chair.`
        : "There's no Qless account with that number yet. Create one below.",
    });
  }
  if (!existing) {
    if (!str(form, "firstName") || !str(form, "surname")) back(here, { error: "Enter your first name and surname." });
    if (!validEmail(email)) back(here, { error: "Enter a valid email address." });
    if (form.get("adult") !== "on") back(here, { error: "Confirm you're 18 or older, or have a parent's permission." });
    if (form.get("consentReminders") !== "on") back(here, { error: "Tick the first box so we can send your booking reminders." });
  }
  const code = await createOtp(phone);
  if (!code) back(here, { error: "Too many codes requested. Wait 10 minutes and try again." });
  await sendSms(phone, `Your Qless code is ${code}. It expires in 10 minutes.`);
  const params = new URLSearchParams({ phone, next });
  if (!existing) {
    params.set("name", name);
    params.set("email", email);
    if (form.get("consentOffers") === "on") params.set("offers", "1");
  }
  if (process.env.NODE_ENV !== "production" && !process.env.TWILIO_ACCOUNT_SID) params.set("dev", code);
  redirect(`/signin/verify?${params}`);
}

export async function checkCode(form: FormData) {
  const phone = normalisePhone(str(form, "phone"));
  const next = safeNext(str(form, "next") || "/");
  if (!phone) redirect("/signin");
  const code = str(form, "code").replace(/\D/g, "");
  if (!(await verifyOtp(phone, code))) {
    const params = new URLSearchParams({ phone, next, name: str(form, "name"), email: str(form, "email"), error: "That code is wrong or has expired." });
    if (str(form, "offers")) params.set("offers", "1");
    redirect(`/signin/verify?${params}`);
  }
  let user = await db.user.findUnique({ where: { phone } });
  if (user?.banned) back("/signin", { error: "This account is blocked. Contact Qless support if you think this is a mistake." });
  if (!user) {
    user = await db.user.create({
      data: {
        phone,
        name: str(form, "name") || "Qless user",
        email: validEmail(str(form, "email")) ? str(form, "email").toLowerCase() : null,
        consentReminders: true,
        consentOffers: str(form, "offers") === "1",
        consentAt: new Date(),
        role: isAdminPhone(phone) ? "ADMIN" : "CUSTOMER",
      },
    });
  } else if (isAdminPhone(phone) && user.role !== "ADMIN") {
    user = await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }
  await startSession(user.id);
  redirect(next);
}

export async function signOut() {
  await endSession();
  redirect("/");
}
