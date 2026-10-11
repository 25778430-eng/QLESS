"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentUser, endSession, requireUser } from "@/lib/auth";
import { back, str } from "@/lib/http";

export async function toggleLowData() {
  const user = await currentUser();
  if (user) {
    await db.user.update({ where: { id: user.id }, data: { lowData: !user.lowData } });
  } else {
    const on = cookies().get("lowData")?.value === "1";
    cookies().set("lowData", on ? "0" : "1", { path: "/", maxAge: 365 * 86400 });
  }
  revalidatePath("/", "layout");
}

export async function updateAccount(form: FormData) {
  const user = await requireUser();
  const name = str(form, "name");
  if (!name) back("/account", { error: "Enter your name." });
  const consentReminders = form.get("consentReminders") === "on";
  await db.user.update({
    where: { id: user.id },
    data: {
      name,
      consentReminders,
      consentOffers: form.get("consentOffers") === "on",
      consentAt: consentReminders !== user.consentReminders ? new Date() : user.consentAt,
      notifySms: form.get("notifySms") === "on",
      notifyWhatsapp: form.get("notifyWhatsapp") === "on",
      lowData: form.get("lowData") === "on",
    },
  });
  back("/account", { notice: "Saved." });
}

/** POPIA: removes personal details but keeps anonymous booking records for the vendors' books. */
export async function deleteAccount(form: FormData) {
  const user = await requireUser();
  if (str(form, "confirm").toUpperCase() !== "DELETE") back("/account", { error: "Type DELETE to confirm." });
  const active = await db.booking.count({ where: { customerId: user.id, status: { in: ["PENDING_PAYMENT", "WAITING", "CALLED", "IN_SERVICE"] } } });
  if (active) back("/account", { error: "Cancel or finish your current bookings first." });
  if (await db.vendor.findUnique({ where: { ownerId: user.id } })) back("/account", { error: "Vendor accounts are closed by Qless support. Contact us to close your shop." });
  await endSession();
  await db.$transaction([
    db.session.deleteMany({ where: { userId: user.id } }),
    db.pushSubscription.deleteMany({ where: { userId: user.id } }),
    db.user.update({
      where: { id: user.id },
      data: { name: "Deleted user", phone: `deleted:${user.id}`, consentReminders: false, consentOffers: false, notifySms: false, notifyWhatsapp: false },
    }),
  ]);
  redirect("/");
}

export async function signOutAction() {
  await endSession();
  redirect("/");
}
