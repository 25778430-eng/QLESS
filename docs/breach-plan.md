# Qless data breach plan

What Qless does if personal information may have been accessed, lost or changed by someone who shouldn't have it.
POPIA section 22 requires us to tell the Information Regulator and the people affected "as soon as reasonably possible".

This is a working plan, not legal advice. Have it checked by someone who knows POPIA before launch.

## Who does what

| Role | Who | Job |
| --- | --- | --- |
| Information Officer | Set in `INFO_OFFICER_NAME` / `INFO_OFFICER_EMAIL` (registered with the Information Regulator) | Leads the response, decides on notices, signs the report |
| Technical lead | Whoever runs Vercel and Supabase | Contains the breach, keeps evidence, fixes the cause |
| Support | `SUPPORT_EMAIL` inbox | Answers customers and vendors once notices go out |

Keep a phone list for these people outside Qless (on paper or in a password manager), in case the app or email is down.

## What counts as a breach

- Someone outside Qless gets into the database, Vercel, Supabase, PayFast, Twilio, GitHub or an admin account.
- A secret leaks: `DATABASE_URL`, `CRON_SECRET`, PayFast or Twilio keys, a super admin's phone and session.
- Vendor verification documents (IDs, bank letters) are seen by someone who isn't a Qless admin.
- A bug shows one person's bookings, phone number or documents to another person.
- A laptop or phone with admin access is lost or stolen.
- A shop misuses customer details it got through Qless (see the vendor data agreement).

If in doubt, treat it as a breach and follow the steps. Standing down is cheap.

## The first hour: contain

1. **Write down the time** you found out and what you saw. Start a log (who, what, when) and keep adding to it.
2. **Stop the leak.**
   - Leaked database password: change it in Supabase and update `DATABASE_URL` in Vercel, then redeploy.
   - Leaked API key: rotate it at PayFast or Twilio and update Vercel.
   - Leaked `CRON_SECRET`: set a new one in Vercel and cron-job.org.
   - Admin account taken over: remove the number from `ADMIN_PHONES` or take away the admin role in Admin > Team; delete their rows in the `Session` table to sign everyone out.
   - Bug showing other people's data: roll back to the last good deployment in Vercel (Deployments > ... > Promote to Production).
3. **Keep evidence.** Don't delete logs. Export the Vercel logs and Supabase logs for the time window.
4. If the app itself is unsafe, put it in maintenance: pause the Vercel project or roll back.

## Within 24 hours: assess

Answer these and add them to the log:

- What data: names, cellphone numbers, emails, bookings, number plates, ID documents, bank details?
- How many people, and which: customers, vendors, staff?
- Is it still happening? Was it copied, or only viewable?
- Could it be used to harm people: identity fraud (ID documents), payout fraud (bank details), harassment (phone numbers)?

ID documents and bank details are the most serious. Treat any exposure of the `Document` table as high risk.

## Within 72 hours: tell people

1. **Information Regulator.** Use the breach notification form on the Information Regulator's website
   (inforegulator.org.za) and email it to the address given there. Include: what happened, when, what data, how many
   people, what we've done, and the Information Officer's contact details.
2. **The people affected.** By SMS and email (and in-app if possible). Plain language:
   - what happened and when,
   - what of theirs was involved,
   - what we've done,
   - what they should do (for example: watch for SMS scams pretending to be Qless; vendors: tell their bank),
   - who to contact (`SUPPORT_EMAIL`, Information Officer).
3. **PayFast and Twilio** if their keys or systems were involved.
4. **SAPS** if it was a crime (theft, hacking); get a case number for the log.

You only need to hold back notice if SAPS or the Regulator says it would get in the way of an investigation.

## Afterwards: fix and learn

- Fix the cause and add a test for it if it was a bug.
- Write a short report: timeline, cause, impact, what changed. Keep it with the log for at least 5 years.
- Check the rest of the checklist below still holds.

## Things that lower the risk (already in Qless)

- Sign-in by one-time SMS code, codes hashed and deleted after 30 days.
- Verification files wiped 90 days after review; only admins can open them.
- Old bookings anonymised and quiet customer accounts deleted after 5 years (daily clean-up in the cron tick).
- Waiting-room TV and walk-in ticket links show ticket numbers only, no names or phone numbers.
- Super admin actions (remove user, payouts, switches) need a super admin.

## Before launch checklist

- [ ] Information Officer registered with the Information Regulator.
- [ ] `INFO_OFFICER_*` and `SUPPORT_EMAIL` set in Vercel.
- [ ] Supabase password changed (it was shared in chat on 2026-10-13).
- [ ] Phone list for the people above kept outside Qless.
- [ ] This plan checked by someone who knows POPIA.
