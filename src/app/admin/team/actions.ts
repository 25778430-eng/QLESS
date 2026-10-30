"use server";
import { isAdminPhone, isSuperAdmin, requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalisePhone } from "@/lib/format";
import { back, str } from "@/lib/http";

const HERE = "/admin/team";

export async function addAdmin(form: FormData) {
  await requireSuperAdmin();
  const phone = normalisePhone(str(form, "phone"));
  if (!phone) back(HERE, { error: "Enter a South African cellphone number." });
  const user = await db.user.findUnique({ where: { phone } });
  if (!user) back(HERE, { error: "No account with that number yet. Ask them to sign in to Qless once, then add them." });
  if (user.banned) back(HERE, { error: `${user.name} is blocked. Unblock them on Users first.` });
  const superAdmin = form.get("super") === "on";
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN", superAdmin } });
  back(HERE, { notice: `${user.name} is now ${superAdmin ? "a super admin" : "an admin"}. They see Admin next time they open the app.` });
}

export async function removeAdmin(form: FormData) {
  const me = await requireSuperAdmin();
  const target = await db.user.findUnique({ where: { id: str(form, "id") }, include: { vendor: { select: { id: true } } } });
  if (!target || target.role !== "ADMIN") back(HERE, { error: "That person isn't an admin." });
  if (target.id === me.id) back(HERE, { error: "You can't remove yourself. Ask another super admin." });
  if (isAdminPhone(target.phone)) back(HERE, { error: "This number is in ADMIN_PHONES on Vercel. Remove it there first." });
  await db.user.update({ where: { id: target.id }, data: { role: target.vendor ? "VENDOR" : "CUSTOMER", superAdmin: false } });
  back(HERE, { notice: `${target.name} is no longer an admin.` });
}

export async function setSuperAdmin(form: FormData) {
  const me = await requireSuperAdmin();
  const on = str(form, "on") === "1";
  const target = await db.user.findUnique({ where: { id: str(form, "id") } });
  if (!target || target.role !== "ADMIN") back(HERE, { error: "That person isn't an admin." });
  if (target.id === me.id) back(HERE, { error: "You can't change your own access. Ask another super admin." });
  if (!on && isAdminPhone(target.phone)) back(HERE, { error: "This number is in ADMIN_PHONES on Vercel, so it is always a super admin." });
  await db.user.update({ where: { id: target.id }, data: { superAdmin: on } });
  const after = { ...target, superAdmin: on };
  back(HERE, { notice: isSuperAdmin(after) ? `${target.name} is now a super admin.` : `${target.name} is now a regular admin.` });
}
