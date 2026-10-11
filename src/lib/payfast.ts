import { createHash } from "node:crypto";

// PayFast onsite redirect payments, ITN (instant transaction notification) checks and refunds.
// Docs: https://developers.payfast.co.za/docs

export function payfastConfigured(): boolean {
  return !!(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY);
}

export function payfastHost(): string {
  return process.env.PAYFAST_SANDBOX === "false" ? "https://www.payfast.co.za" : "https://sandbox.payfast.co.za";
}

/** PayFast's encoding: urlencode with spaces as "+" and upper-case escapes. */
function pfEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/** Signature over the fields in the order given, skipping blanks, plus the passphrase. */
export function pfSignature(fields: Array<[string, string]>, passphrase?: string): string {
  let s = fields
    .filter(([k, v]) => k !== "signature" && v !== "")
    .map(([k, v]) => `${k}=${pfEncode(v)}`)
    .join("&");
  if (passphrase) s += `&passphrase=${pfEncode(passphrase)}`;
  return createHash("md5").update(s).digest("hex");
}

export type PaymentRequest = {
  bookingId: string;
  ref: string;
  amountCents: number;
  itemName: string;
  customerPhone: string;
  appUrl: string;
};

/** Fields for the auto-submitting form that sends the customer to PayFast. */
export function paymentForm(p: PaymentRequest): { action: string; fields: Array<[string, string]> } {
  const fields: Array<[string, string]> = [
    ["merchant_id", process.env.PAYFAST_MERCHANT_ID!],
    ["merchant_key", process.env.PAYFAST_MERCHANT_KEY!],
    ["return_url", `${p.appUrl}/bookings/${p.bookingId}?paid=1`],
    ["cancel_url", `${p.appUrl}/bookings/${p.bookingId}?cancelled=1`],
    ["notify_url", `${p.appUrl}/api/payfast/notify`],
    ["cell_number", p.customerPhone.replace("+27", "0")],
    ["m_payment_id", p.bookingId],
    ["amount", (p.amountCents / 100).toFixed(2)],
    ["item_name", p.itemName.slice(0, 100)],
    ["item_description", `Qless deposit ${p.ref}`],
  ];
  fields.push(["signature", pfSignature(fields, process.env.PAYFAST_PASSPHRASE || undefined)]);
  return { action: `${payfastHost()}/eng/process`, fields };
}

/** Checks an ITN body: signature matches and PayFast confirms it sent it. */
export async function verifyItn(raw: string): Promise<{ ok: boolean; data: Record<string, string> }> {
  const pairs = [...new URLSearchParams(raw).entries()];
  const data = Object.fromEntries(pairs);
  const sig = pfSignature(pairs, process.env.PAYFAST_PASSPHRASE || undefined);
  if (sig !== data.signature) return { ok: false, data };
  const body = raw.split("&signature=")[0];
  const res = await fetch(`${payfastHost()}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = (await res.text()).trim();
  return { ok: text === "VALID", data };
}

/** Signed call to the PayFast API. Returns false if it could not be made or was refused. */
async function pfApi(method: "POST" | "PUT", path: string, body: Record<string, string>): Promise<boolean> {
  if (!payfastConfigured()) return false;
  const timestamp = new Date().toISOString().slice(0, 19);
  const headers: Record<string, string> = {
    "merchant-id": process.env.PAYFAST_MERCHANT_ID!,
    version: "v1",
    timestamp,
  };
  const all: Record<string, string> = { ...headers, ...body };
  if (process.env.PAYFAST_PASSPHRASE) all.passphrase = process.env.PAYFAST_PASSPHRASE;
  const sorted = Object.keys(all)
    .sort()
    .map((k) => `${k}=${pfEncode(all[k])}`)
    .join("&");
  const signature = createHash("md5").update(sorted).digest("hex");
  const testing = process.env.PAYFAST_SANDBOX === "false" ? "" : "?testing=true";
  try {
    const res = await fetch(`https://api.payfast.co.za${path}${testing}`, {
      method,
      headers: { ...headers, signature, "Content-Type": "application/json" },
      body: Object.keys(body).length ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) console.error("[payfast]", method, path, "failed", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[payfast]", method, path, "error", err);
    return false;
  }
}

/** Requests a refund through the PayFast API. Returns false if it could not be done automatically. */
export async function refund(pfPaymentId: string, amountCents: number, reason: string): Promise<boolean> {
  if (!pfPaymentId) return false;
  return pfApi("POST", `/refunds/${pfPaymentId}`, { amount: String(amountCents), reason, notify_buyer: "1" });
}

/** Cancels a recurring subscription by its PayFast token. */
export async function cancelSubscription(token: string): Promise<boolean> {
  if (!token) return false;
  return pfApi("PUT", `/subscriptions/${token}/cancel`, {});
}

export type SubscriptionRequest = {
  vendorId: string;
  amountCents: number;
  itemName: string;
  phone: string;
  appUrl: string;
};

/** m_payment_id prefix that marks an ITN as a vendor plan payment rather than a booking. */
export const PLAN_PREFIX = "plan-";

/** Fields for a monthly PayFast subscription (first payment today, then monthly until cancelled). */
export function subscriptionForm(p: SubscriptionRequest): { action: string; fields: Array<[string, string]> } {
  const amount = (p.amountCents / 100).toFixed(2);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const fields: Array<[string, string]> = [
    ["merchant_id", process.env.PAYFAST_MERCHANT_ID!],
    ["merchant_key", process.env.PAYFAST_MERCHANT_KEY!],
    ["return_url", `${p.appUrl}/vendor/plan?paid=1`],
    ["cancel_url", `${p.appUrl}/vendor/plan`],
    ["notify_url", `${p.appUrl}/api/payfast/notify`],
    ["cell_number", p.phone.replace("+27", "0")],
    ["m_payment_id", PLAN_PREFIX + p.vendorId],
    ["amount", amount],
    ["item_name", p.itemName.slice(0, 100)],
    ["subscription_type", "1"],
    ["billing_date", today],
    ["recurring_amount", amount],
    ["frequency", "3"],
    ["cycles", "0"],
  ];
  fields.push(["signature", pfSignature(fields, process.env.PAYFAST_PASSPHRASE || undefined)]);
  return { action: `${payfastHost()}/eng/process`, fields };
}
