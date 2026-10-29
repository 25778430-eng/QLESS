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
  ["Can I book for another day?", "Yes. On the shop's page tap Book a later day, pick a service and a day in the next 2 weeks, then a free time. Come at that time; the shop calls you when it's your turn."],
  ["How do government and municipal queues work?", "They're free: no deposit and no booking fee. You get a ticket number like A027 and a list of what to bring. Watch the screen or your phone for your number."],
  ["How do I know my car or repair is ready?", "Car washes send \"your car is ready\" with your number plate. Repair shops show each stage of the job, send you a quote to approve or decline in the app, and tell you when it's ready to collect."],
  ["I walked in without the app.", "Give the shop your cellphone number and you'll get your ticket by SMS with a link to follow your place, or ask for a printed ticket with a QR code."],
  ["Can I use Qless in my language?", <>Yes: English, isiZulu, isiXhosa, Afrikaans and Sesotho. Change it in <b>Account &gt; Language</b>. Some screens are still in English while we finish the translations.</>],
  ["I didn't get my sign-in code.", "Check the number starts with your cellphone number, wait a minute and tap Send again. Codes expire after a few minutes."],
];

const VENDOR: [string, React.ReactNode][] = [
  ["How do I list my business?", <>Open <b>Account &gt; List your business</b>, choose Verified or Basic and upload your documents. We check every business, usually within 1 working day.</>],
  ["What's the difference between Basic and Verified?", "Basic needs no ID documents but can only take walk-ins and free bookings, and shows as Not verified. Verified can take deposits and gets paid out."],
  ["When do I get paid?", <>Deposits are collected by Qless through PayFast and paid out to the bank account on your profile. <b>Account &gt; Payouts</b> shows what you&apos;ve earned, what&apos;s been paid and what&apos;s still due.</>],
  ["How do my staff call clients?", <>Add each staff member with their cellphone number in <b>Account &gt; My team</b>. They sign in with that number and see their own chair, bay or counter with a Call next button.</>],
  ["Can I charge different prices, like by car size?", <>Yes. Open a service in <b>Shop profile &gt; Services and prices</b> and add options, one per line, like &quot;SUV | 120 | 45&quot;. You can also add extras and products customers add on, like wax or a drink.</>],
  ["How do I put the queue on a TV?", <>Open <b>Account &gt; Waiting-room TV screen</b>, make a link and open it on the TV or an old tablet. It shows ticket numbers only, never names.</>],
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
