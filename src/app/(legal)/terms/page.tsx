import type { Metadata } from "next";
import { LEGAL_UPDATED, operatorName, supportEmail } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of use · Qless" };

export default function Terms() {
  const email = supportEmail();
  return (
    <>
      <h1>Terms of use</h1>
      <p className="small muted">Last updated {LEGAL_UPDATED}</p>
      <p>
        These terms apply when you use Qless, run by {operatorName()}. By creating an account you agree to them. Qless
        connects customers with independent shops; the shop, not Qless, provides the service you book.
      </p>

      <h2>Bookings and deposits</h2>
      <ul>
        <li>Most shops ask for a deposit when you book. It is paid through PayFast and deducted from your final price.</li>
        <li>An unpaid booking is released after 15 minutes.</li>
        <li>
          If you cancel before the shop&apos;s refund window (2 hours before your turn unless the shop shows otherwise), your
          deposit is refunded in full. Inside that window the shop keeps it.
        </li>
        <li>When you are called you have 15 minutes to arrive and check in. If you don&apos;t, you lose your spot and your deposit.</li>
        <li>If a shop pauses its queue or runs late, you keep your spot and your deposit.</li>
        <li>You can hold 2 active bookings at once. 3 no-shows in 30 days blocks booking for 7 days.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>Use your own cellphone number and real name, and keep sign-in codes to yourself.</li>
        <li>Reviews must be honest and about a booking you completed. We may remove abusive or fake reviews.</li>
        <li>We may suspend accounts that abuse the queue, other users or shops.</li>
      </ul>

      <h2>Vendors</h2>
      <ul>
        <li>Vendors must give a valid CIPC registration number and be approved before they appear in the app.</li>
        <li>Vendors are responsible for their prices, services, staff and the accuracy of their listing.</li>
        <li>Vendors must handle customer information in line with POPIA and only use it for the booking.</li>
      </ul>

      <h2>Liability</h2>
      <p>
        We work to keep Qless available and accurate, but queue times are estimates and the service is provided as is. To the
        extent the law allows, we are not liable for the service a shop provides or for losses caused by delays, outages or
        load-shedding. Nothing here limits your rights under the Consumer Protection Act.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We will tell you in the app before material changes take effect. Questions: <a href={`mailto:${email}`}>{email}</a>.
        These terms are governed by South African law. See also our <a href="/privacy">privacy policy</a>.
      </p>
    </>
  );
}
