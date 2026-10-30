import type { Metadata } from "next";
import { LEGAL_UPDATED, infoOfficer, operatorName } from "@/lib/legal";

export const metadata: Metadata = { title: "Vendor data agreement · Qless" };

export default function VendorAgreement() {
  const officer = infoOfficer();
  return (
    <>
      <h1>Vendor data agreement</h1>
      <p className="small muted">Last updated {LEGAL_UPDATED}</p>
      <p>
        This agreement is between {operatorName()} (&quot;Qless&quot;) and every business listed on Qless (&quot;you&quot;). It
        covers the personal information of customers that you see through the app, as required by the Protection of
        Personal Information Act, 2013 (POPIA). You accept it when you list your business, together with the{" "}
        <a href="/terms">terms of use</a>.
      </p>

      <h2>1. What you get</h2>
      <p>
        For each booking you and your staff see the customer&apos;s name, cellphone number, service, chosen staff member,
        queue position, check-in status and deposit status.
      </p>

      <h2>2. What you may use it for</h2>
      <ul>
        <li>Only to serve that booking: calling the customer, checking them in, and contacting them about the visit.</li>
        <li>Not for marketing, unless the customer opted in to offers in Qless, and then only through Qless.</li>
        <li>Never sell, share or publish it, or copy it into other lists, groups or systems.</li>
      </ul>

      <h2>3. Keeping it safe</h2>
      <ul>
        <li>Give app access only to staff who need it, each with their own login. Remove staff who leave.</li>
        <li>Lock the phones and tablets used for Qless with a PIN and keep them up to date.</li>
        <li>Don&apos;t screenshot or forward customer details.</li>
        <li>Make sure your staff know and follow this agreement. You are responsible for what they do with the data.</li>
      </ul>

      <h2>4. If something goes wrong</h2>
      <p>
        If you think customer information has been lost, stolen or seen by someone who shouldn&apos;t have it (for example a
        stolen phone), tell Qless within 24 hours at <a href={`mailto:${officer.email}`}>{officer.email}</a>. We will help
        you contain it and, where POPIA section 22 requires it, notify the Information Regulator and the people affected.
      </p>

      <h2>5. What Qless does</h2>
      <ul>
        <li>Keeps the app and its data secure, with HTTPS, hashed sign-in codes and limited admin access.</li>
        <li>Handles your own and your staff&apos;s information as set out in the <a href="/privacy">privacy policy</a>, and deletes your verification documents 90 days after review.</li>
        <li>Tells you without delay if a breach affects your shop or your customers.</li>
        <li>Answers customers&apos; requests to see, correct or delete their information.</li>
      </ul>

      <h2>6. When you leave</h2>
      <p>
        When your listing closes your access to customer details ends. Delete any customer details you hold outside the app.
        Qless keeps booking and payment records for up to 5 years for accounting and disputes, then deletes or anonymises them.
      </p>

      <h2>7. Breaking this agreement</h2>
      <p>
        If you misuse customer information we may suspend or remove your listing. You remain responsible under POPIA for any
        misuse by you or your staff.
      </p>
    </>
  );
}
