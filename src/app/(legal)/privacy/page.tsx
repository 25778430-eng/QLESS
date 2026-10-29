import type { Metadata } from "next";
import { LEGAL_UPDATED, infoOfficer, operatorName, supportEmail } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy policy · Qless" };

export default function Privacy() {
  const email = supportEmail();
  const officer = infoOfficer();
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="small muted">Last updated {LEGAL_UPDATED}</p>
      <p>
        Qless is a booking and live-queue app for barbers, nail techs, salons and other walk-in businesses in South Africa. It
        is run by {operatorName()} (&quot;we&quot;). This policy explains what personal information we collect, why, and the
        rights you have under the Protection of Personal Information Act, 2013 (POPIA).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your name, email address and cellphone number.</li>
        <li><b>Bookings:</b> the shop, service, staff member, time, queue position, booking status and arrival check-in.</li>
        <li><b>Payments:</b> deposit amounts and payment status. Card and bank details are entered on PayFast and never reach us.</li>
        <li><b>Reviews</b> you write after a completed booking.</li>
        <li><b>Location:</b> only when you tap &quot;near me&quot;, to show nearby shops. We do not store it or track you in the background.</li>
        <li><b>Notification settings:</b> your consent choices and, if you allow push notifications, a push token for your device.</li>
        <li><b>Vendors also give us:</b> business name, CIPC registration number (when required), address, map location, phone number, bank account details, services, prices, staff names, staff cellphone numbers and photos.</li>
        <li><b>Verification documents from vendors:</b> an ID document (SA ID, passport, asylum seeker or refugee permit), proof of address, a bank confirmation letter, a CIPC certificate, or for Basic listings a selfie and a shop photo. Only Qless admins can open them.</li>
        <li><b>Technical data:</b> a sign-in cookie and the basic server logs needed to keep the service secure.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To sign you in with a one-time SMS code.</li>
        <li>To make, manage and remind you about bookings (SMS, WhatsApp and push, 1 hour and 20 minutes before, and when you are called).</li>
        <li>To take and refund deposits.</li>
        <li>To verify vendors before they appear in the app.</li>
        <li>To prevent abuse, for example repeated no-shows.</li>
        <li>To send offers from shops you have visited, only if you opted in.</li>
      </ul>
      <p>We do not sell your information and we do not show third-party adverts.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li><b>The shop you book with</b> sees your name, cellphone number and booking details.</li>
        <li><b>PayFast</b> processes deposits and refunds.</li>
        <li><b>Twilio</b> delivers SMS and WhatsApp messages.</li>
        <li><b>Our hosting and database providers</b> store the app&apos;s data.</li>
        <li><b>Google Maps</b> (or OpenStreetMap) shows the map, which means your device&apos;s IP address reaches their servers when a map loads. We don&apos;t send them your name or bookings.</li>
      </ul>
      <p>
        Some of these providers process data outside South Africa. We only use providers bound by data protection terms that
        give a level of protection comparable to POPIA (section 72).
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account while you use Qless. Sign-in codes expire after a few minutes. Booking and payment records are
        kept for up to 5 years for accounting and dispute purposes, then deleted or anonymised. Vendor verification documents
        are deleted 90 days after we&apos;ve reviewed them; we keep only a note of what was checked and when.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li><b>See your data:</b> download everything we hold about you from Account &gt; Download my data.</li>
        <li><b>Correct it:</b> edit your name and notification choices in Account.</li>
        <li><b>Delete it:</b> see <a href="/delete-account">how to delete your account</a>.</li>
        <li><b>Withdraw consent</b> for reminders or offers at any time in Account.</li>
        <li><b>Complain</b> to us at {email}, or to the Information Regulator (inforegulator.org.za).</li>
      </ul>

      <h2>Security</h2>
      <p>
        Data travels over HTTPS. Sign-in codes and session tokens are stored only as hashes. Access to the admin tools is
        limited to approved staff.
      </p>

      <h2>Children</h2>
      <p>Under POPIA anyone under 18 is a child. People under 18 may only use Qless with a parent or guardian&apos;s permission, which we ask for at sign-up.</p>

      <h2>Contact</h2>
      <p>
        Information Officer: {officer.name}, <a href={`mailto:${officer.email}`}>{officer.email}</a>
        {officer.phone && <>, <span className="mono">{officer.phone}</span></>}. To ask for records we hold, see our{" "}
        <a href="/paia">PAIA manual</a>. Shops that see your details are bound by our <a href="/vendor-agreement">vendor data agreement</a>.
      </p>
    </>
  );
}
