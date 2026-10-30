import type { Metadata } from "next";
import { LEGAL_UPDATED, infoOfficer, operatorDetails, operatorName, supportEmail } from "@/lib/legal";

export const metadata: Metadata = { title: "PAIA manual · Qless" };

export default function Paia() {
  const officer = infoOfficer();
  const { regNo, address } = operatorDetails();
  const email = supportEmail();
  return (
    <>
      <h1>PAIA and POPIA manual</h1>
      <p className="small muted">Last updated {LEGAL_UPDATED}</p>
      <p>
        This manual is published under section 51 of the Promotion of Access to Information Act, 2000 (PAIA) and explains
        how to ask {operatorName()} for records it holds, including your personal information under the Protection of
        Personal Information Act, 2013 (POPIA).
      </p>

      <h2>1. Who we are</h2>
      <ul>
        <li><b>Business:</b> {operatorName()}{regNo && <>, registration number <span className="mono">{regNo}</span></>}</li>
        {address && <li><b>Address:</b> {address}</li>}
        <li><b>Email:</b> <a href={`mailto:${email}`}>{email}</a></li>
        <li><b>What we do:</b> run Qless, a booking and live-queue app for barbers, nail techs, salons and other shops in South Africa.</li>
      </ul>

      <h2>2. Information Officer</h2>
      <p>Send all requests for records, and any questions or complaints about your personal information, to:</p>
      <div className="card stack">
        <b>{officer.name}</b>
        <a href={`mailto:${officer.email}`}>{officer.email}</a>
        {officer.phone && <span className="mono">{officer.phone}</span>}
      </div>

      <h2>3. The Information Regulator&apos;s guide</h2>
      <p>
        The Information Regulator publishes a guide on how to use PAIA and POPIA (section 10 of PAIA). You can get it from{" "}
        <a href="https://inforegulator.org.za" rel="noreferrer">inforegulator.org.za</a>, by emailing
        enquiries@inforegulator.org.za, or by asking our Information Officer for a copy.
      </p>

      <h2>4. Records available without a request</h2>
      <ul>
        <li>Our <a href="/privacy">privacy policy</a>, <a href="/terms">terms of use</a>, <a href="/vendor-agreement">vendor data agreement</a> and this manual.</li>
        <li>Shop listings, services, prices, opening hours and reviews shown in the app.</li>
        <li>Your own account data: download it any time from <b>Account &gt; Download my data</b>.</li>
      </ul>

      <h2>5. Records we hold</h2>
      <ul>
        <li><b>Customers:</b> name, cellphone number, email, bookings, check-ins, deposit and refund records, reviews, notification choices.</li>
        <li><b>Vendors and staff:</b> business details, CIPC number, address, bank details, staff names and numbers, photos, verification documents (deleted 90 days after review), plan and payout records.</li>
        <li><b>Company records:</b> founding and statutory records, tax and accounting records, supplier contracts.</li>
        <li><b>Technical records:</b> sign-in sessions and security logs.</li>
      </ul>
      <p className="small muted">
        Records kept under other laws include those under the Companies Act, the Income Tax Act, the VAT Act, the Consumer
        Protection Act, the Electronic Communications and Transactions Act and POPIA.
      </p>

      <h2>6. How we process personal information (POPIA)</h2>
      <ul>
        <li><b>Purpose:</b> to make and manage bookings, send reminders, take and refund deposits, check vendors, pay vendors out and prevent abuse.</li>
        <li><b>People we hold information about:</b> customers, vendors, vendor staff and our suppliers.</li>
        <li><b>Who receives it:</b> the shop you book with, PayFast (payments), Twilio (SMS and WhatsApp), our hosting and database providers, and Google Maps or OpenStreetMap (map tiles only).</li>
        <li><b>Outside South Africa:</b> some of these providers store data abroad under data protection terms comparable to POPIA (section 72).</li>
        <li><b>Security:</b> HTTPS everywhere, hashed sign-in codes and sessions, private document storage that only admins can open, admin access limited to named staff.</li>
        <li><b>Keeping it:</b> booking and payment records for up to 5 years, then deleted or anonymised.</li>
      </ul>

      <h2>7. How to request a record</h2>
      <ol>
        <li>Fill in Form 2 (Request for access to a record) from the Information Regulator&apos;s website.</li>
        <li>Email it to the Information Officer above with a copy of your ID. If you ask on someone else&apos;s behalf, include proof that you may.</li>
        <li>We reply within 30 days. We may extend this once by up to 30 days and will tell you why.</li>
      </ol>
      <p>
        Fees are set in the PAIA regulations and we tell you the amount before we start. There is no fee to ask for your own
        personal information, and you can ask us to correct or delete it at any time (POPIA section 24). We may refuse a
        request only on the grounds in Chapter 4 of Part 3 of PAIA, and we will give reasons.
      </p>

      <h2>8. If you are unhappy</h2>
      <p>
        You can complain to the Information Regulator at <a href="https://inforegulator.org.za" rel="noreferrer">inforegulator.org.za</a> or
        apply to a court within 180 days of our decision.
      </p>

      <h2>9. Where to get this manual</h2>
      <p>On this page, and on request from the Information Officer{address ? " or at our address above" : ""}, free of charge.</p>
    </>
  );
}
