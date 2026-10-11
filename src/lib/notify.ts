import "server-only";
import webpush from "web-push";
import type { User } from "@prisma/client";
import { db } from "./db";

// SMS and WhatsApp go through Twilio; push uses VAPID web push.
// Without keys, messages are printed to the server console so the app still works in development.

const twilioReady = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

async function twilioSend(to: string, from: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) console.error("[twilio] send failed", res.status, await res.text());
}

export async function sendSms(to: string, body: string): Promise<void> {
  if (!twilioReady() || !process.env.TWILIO_SMS_FROM) {
    console.log(`[sms -> ${to}] ${body}`);
    return;
  }
  await twilioSend(to, process.env.TWILIO_SMS_FROM, body);
}

export async function sendWhatsapp(to: string, body: string): Promise<void> {
  if (!twilioReady() || !process.env.TWILIO_WHATSAPP_FROM) {
    console.log(`[whatsapp -> ${to}] ${body}`);
    return;
  }
  await twilioSend(`whatsapp:${to}`, `whatsapp:${process.env.TWILIO_WHATSAPP_FROM.replace(/^whatsapp:/, "")}`, body);
}

let vapidSet = false;
function pushReady(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!vapidSet) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@qless.co.za", pub, priv);
    vapidSet = true;
  }
  return true;
}

export async function sendPush(userId: string, title: string, body: string, url = "/bookings"): Promise<void> {
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;
  if (!pushReady()) {
    console.log(`[push -> ${userId}] ${title}: ${body}`);
    return;
  }
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, url }),
        );
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } });
        else console.error("[push] failed", err);
      }
    }),
  );
}

/**
 * Sends a booking message on every channel the customer allowed.
 * Only users who gave POPIA consent for reminders get SMS or WhatsApp.
 */
export async function notifyCustomer(user: User, title: string, body: string, url?: string): Promise<void> {
  const jobs: Promise<void>[] = [sendPush(user.id, title, body, url)];
  if (user.consentReminders) {
    if (user.notifySms) jobs.push(sendSms(user.phone, body));
    if (user.notifyWhatsapp) jobs.push(sendWhatsapp(user.phone, body));
  }
  await Promise.allSettled(jobs);
}
