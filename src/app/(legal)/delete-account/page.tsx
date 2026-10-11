import type { Metadata } from "next";
import { supportEmail } from "@/lib/legal";

export const metadata: Metadata = { title: "Delete your account · Qless" };

export default function DeleteAccount() {
  const email = supportEmail();
  return (
    <>
      <h1>Delete your Qless account</h1>
      <h2>In the app</h2>
      <ol>
        <li>Sign in and open <b>Account</b>.</li>
        <li>Finish or cancel any current bookings.</li>
        <li>Open <b>Delete my account</b>, type DELETE and confirm.</li>
      </ol>
      <h2>By email</h2>
      <p>
        If you can&apos;t sign in, email <a href={`mailto:${email}?subject=Delete%20my%20Qless%20account`}>{email}</a> from
        any address with the cellphone number on your account. We will confirm by SMS and delete it within 30 days. Vendor
        accounts are closed this way too.
      </p>
      <h2>What gets deleted</h2>
      <p>
        Your name, cellphone number, notification settings, push tokens and sign-in sessions are removed straight away. Past
        booking and payment records are kept without your name or number for up to 5 years for accounting and disputes.
        Reviews you wrote stay, shown as &quot;Deleted user&quot;.
      </p>
    </>
  );
}
