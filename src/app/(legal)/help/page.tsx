import type { Metadata } from "next";
import { supportEmail } from "@/lib/legal";

export const metadata: Metadata = { title: "Help and contact · Qless" };

const CUSTOMER: [string, React.ReactNode][] = [
  ["How do I book?", "Find a shop on Home or the Map, or scan its QR code. Pick a service and a staff member (or anyone available), pay the deposit and you get a ticket with your place in the queue."],
  ["When must I leave home?", "We send a reminder 1 hour and 20 minutes before your turn by SMS, WhatsApp or push. When the shop calls you, you have 15 minutes to arrive and show your check-in code."],
  ["Can I get my deposit back?", "Yes, if you cancel before the shop's refund window (2 hours before your turn unless the shop says otherwise). Refunds go back to the card or account you paid with, usually within 5 working days. The small booking fee is not refunded."],
  ["I'm running late. What can I do?", "Open your booking and tap Move my spot back. You can do this once per booking, it's free and you keep your deposit."],
  ["The shop paused the queue. Do I lose my spot?", "No. When a shop pauses (load-shedding, a break or running late) everyone keeps their place and gets a new estimated time."],
  ["Why can't I book?", "You can hold 2 active bookings at a time. Three no-shows in 30 days blocks booking for 7 days."],
  ["I didn't get my sign-in code.", "Check the number starts with your cellphone number, wait a minute and tap Send again. Codes expire after a few minutes."],
];

const VENDOR: [string, React.ReactNode][] = [
  ["How do I list my business?", <>Open <b>Account &gt; List your business</b>, choose Verified or Basic and upload your documents. We check every business, usually within 1 working day.</>],
  ["What's the difference between Basic and Verified?", "Basic needs no ID documents but can only take walk-ins and free bookings, and shows as Not verified. Verified can take deposits and gets paid out."],
  ["When do I get paid?", "Deposits are collected by Qless through PayFast and paid out to the bank account on your profile. Your daily summary shows deposits kept and refunded."],
  ["How do my staff call clients?", <>Add each staff member with their cellphone number in <b>Shop profile &gt; Staff</b>. They sign in with that number and see their own chair with a Call next button.</>],
  ["What can I do with customer details?", <>Only use them for the booking. See the <a href="/vendor-agreement">vendor data agreement</a>.</>],
];

function Faq({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <div className="list">
      {items.map(([q, a]) => (
        <details key={q} className="li" style={{ display: "block" }}>
          <summary>{q}</summary>
          <p className="small muted" style={{ margin: "8px 0 0" }}>{a}</p>
        </details>
      ))}
    </div>
  );
}

export default function Help() {
  const email = supportEmail();
  return (
    <>
      <h1>Help and contact</h1>
      <h2>Booking a spot</h2>
      <Faq items={CUSTOMER} />
      <h2>Running a shop</h2>
      <Faq items={VENDOR} />
      <h2>Still stuck?</h2>
      <div className="card stack">
        <p style={{ margin: 0 }}>
          Email <a href={`mailto:${email}`}>{email}</a> with your cellphone number and, if it&apos;s about a booking, the shop
          and time. We reply within 1 working day.
        </p>
        <p className="small muted" style={{ margin: 0 }}>
          Questions about your personal information go to our Information Officer (see the <a href="/paia">PAIA manual</a>).
          To close your account, see <a href="/delete-account">delete your account</a>.
        </p>
      </div>
    </>
  );
}
