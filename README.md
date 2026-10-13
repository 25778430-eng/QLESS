# Qless

Book your spot in the queue and arrive when it's your turn.

Qless is a booking and live-queue web app for vendors such as barbers, nail technicians and hair salons in South Africa. Customers find a vendor nearby or by scanning a QR code, pay a small deposit to join the queue, and get reminders so they only head over when their turn is close.

- [Requirements](docs/requirements.md)
- [Clickable mock-up](mockup/index.html) (open the file in a browser; all data is sample data)

## What's in the app

**Customers:** sign up with a cellphone number and SMS code (with POPIA consent), find shops on a map or by searching, scan a shop's QR code, pick a service and a staff member (or anyone available), pay the deposit with PayFast, follow their live place in the queue, move back once, cancel (refund if 2+ hours before), get reminders 1 hour and 20 minutes before, get 15 minutes to arrive when called, rate the visit, see past bookings and rebook, download their data, and switch on low-data mode.

**Vendors:** register with a CIPC number, wait for approval, set open days, hours, services, prices, deposit, refund window, staff and a photo gallery, choose who's working before opening the day's queue (capacity follows from that), call the next customer per staff member, check customers in with their code, add walk-ins, mark no-shows, pause the queue (load-shedding, break, running late) with everyone notified, see a daily summary, and print a QR poster.

**Admin:** approve or reject vendors after checking their CIPC number. Rejected vendors get an SMS with the reason.

**Rules built in:** deposit comes off the final price; no-shows and late cancels forfeit it; unpaid bookings expire after 15 minutes; a customer can hold 2 bookings at once; 3 no-shows in 30 days blocks booking for 7 days; reviews only after a completed visit; OTP codes are rate limited.

## Running it locally

You need Node 20+ and PostgreSQL.

```bash
cp .env.example .env          # then set DATABASE_URL and AUTH_SECRET
npm install
npx prisma migrate deploy     # creates the tables
npm run db:seed               # optional demo shops
npm run dev                   # http://localhost:3000
```

With no Twilio or PayFast keys, the app still works in development: SMS and WhatsApp messages are printed in the terminal, the sign-in code is shown on screen, and deposits use a test payment button.

Demo accounts after seeding: admin `082 000 0000`, Sharp Lines owner `071 234 5678`. Any other number signs up as a new customer.

Checks: `npm test` (queue maths, PayFast signatures, formatting), `npm run typecheck`, `npm run lint`, `npm run build`.

## Keys to add before going live

All keys go in environment variables (see `.env.example`).

| What | Variables | Where to get it |
| --- | --- | --- |
| Database | `DATABASE_URL` | Any PostgreSQL host (Supabase, Neon, Railway, etc.) |
| Sessions | `AUTH_SECRET` | Any long random string, e.g. `openssl rand -hex 32` |
| Your admin number | `ADMIN_PHONES` | Your cellphone in `+27…` form |
| SMS and WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM` | Twilio console. WhatsApp needs an approved WhatsApp sender, and business-started messages need approved templates. |
| Deposits and refunds | `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_SANDBOX` | PayFast dashboard. Start with sandbox (`true`), then set `false` for real payments. |
| Push notifications | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Run `npx web-push generate-vapid-keys` |
| Reminders and no-shows | `CRON_SECRET` | Any random string. Something must call `GET /api/cron/tick` with header `Authorization: Bearer <CRON_SECRET>` every minute. On Vercel's free plan use a free service like cron-job.org (see below). |
| Public address | `APP_URL` | The live URL, e.g. `https://qless.co.za`. Used in QR codes and PayFast links. |

Maps use Google Maps when `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set (Google Cloud, Maps JavaScript API, billing on; restrict the key to your domain). Without it they fall back to OpenStreetMap, which needs no key.

## Hosting on Vercel

1. In Vercel, **Add New > Project**, import the `QLESS` GitHub repo. Leave the build settings as they are.
2. Under **Environment Variables**, add at least `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PHONES` and `CRON_SECRET`, then the Twilio, PayFast and VAPID keys when you have them. Use the database's **direct** connection string (port 5432), not a pooled one, so the tables can be created during the build.
3. Click **Deploy**. Each build runs `prisma migrate deploy`, so the tables are created on the first deploy and kept up to date after that. If you already ran `database/qless.sql`, nothing is re-created.
4. Add `APP_URL` with your `https://….vercel.app` address (or your own domain later) and redeploy. Until it's set the app uses the Vercel address automatically.
5. Reminders: Vercel's free plan only runs crons once a day, so `vercel.json` has a daily safety run. For the every-minute run, create a free job at cron-job.org that calls `https://<your-app>/api/cron/tick` every minute with header `Authorization: Bearer <CRON_SECRET>`. On a paid Vercel plan you can instead change the schedule in `vercel.json` to `* * * * *`.
6. PayFast needs no extra setup: the app sends `https://<your-app>/api/payfast/notify` with each payment.

Pushing to `main` redeploys automatically.

## Tech

Next.js 14 (App Router, server actions), TypeScript, Prisma with PostgreSQL, Leaflet for maps, Twilio over HTTPS, PayFast onsite payments with ITN, and web push. Queue maths lives in `src/lib/queue.ts`; booking rules in `src/lib/bookings.ts`.
