# Google Play Store pack

Everything needed to fill in Play Console for Qless. Images are in `store-assets/`.

## App details

| Field | Value |
| --- | --- |
| App name | Qless |
| Package name | `za.qless.app` (permanent once uploaded) |
| Default language | English (South Africa), en-ZA |
| App or game | App |
| Free or paid | Free |
| Category | Lifestyle (alternative: Beauty) |
| Contact email | the address in `SUPPORT_EMAIL` |
| Website | your domain |
| Privacy policy URL | `https://<your-domain>/privacy` |
| Account deletion URL | `https://<your-domain>/delete-account` |

## Store listing

**Short description** (80 characters max)

> Book your spot at barbers, nails and salons. Arrive when it's your turn.

**Full description** (4000 characters max)

> Skip the waiting room. Qless lets you join the queue at barbers, nail techs, hair salons and other walk-in shops near you, then arrive just in time.
>
> FOR CUSTOMERS
> • Find shops near you on the map or scan the QR code at the door
> • See how many people are waiting and your estimated turn before you join
> • Pick your service and, if you like, the staff member you want
> • Hold your spot with a small deposit that comes off your final price
> • Get reminders by push, SMS or WhatsApp 1 hour and 20 minutes before your turn, and when you're called
> • Running late? Move your spot back once
> • Cancel early enough and your deposit is refunded in full
> • Rebook your favourite shop in one tap and leave a review after your visit
> • Low-data mode hides maps and photos to save data
>
> FOR SHOPS
> • Open today's queue and choose which staff are working
> • Call the next customer, check them in with their code and add walk-ins
> • Pause the queue for load-shedding, a break or running late and everyone is told the new time
> • Print your QR poster so walk-ins can join from the door
> • See your daily summary: customers served, no-shows, walk-ins, deposits and takings
> • Every shop is verified with its CIPC business registration number
>
> Your details are protected under POPIA. We never sell your information.

**Graphics**

| Asset | File | Size |
| --- | --- | --- |
| App icon | `store-assets/play-icon-512.png` | 512 × 512 |
| Feature graphic | `store-assets/feature-graphic.png` | 1024 × 500 |
| Phone screenshots | `store-assets/screenshot-1..5.png` | 1080 × 1920 |

Screenshots were taken from the real app with the seeded demo shop. Retake them once real shops are live if you prefer.

## Content rating (IARC questionnaire)

- Category: **All other app types** (not a game, not social, not a reference/news app).
- Violence, sexuality, language, controlled substances, gambling: **No** to all.
- Users can interact or exchange content: **No**. Reviews are star ratings with short text about a shop, not chat between users. If the form asks about user-generated content, answer **Yes, reviews**, moderated (admins can remove them).
- Shares user location with other users: **No**.
- Digital purchases: **No** (deposits are for a real-world service, paid through PayFast).

Expected rating: Everyone / PEGI 3.

## Target audience

- Age groups: **18 and over** (bookings and payments). Do not tick any under-13 group.
- Appeals to children: **No**.

## Data safety

Data is encrypted in transit: **Yes**. Users can request deletion: **Yes** (in app and at `/delete-account`). Data shared with third parties for advertising: **No**.

| Data type | Collected | Shared | Optional | Purpose |
| --- | --- | --- | --- | --- |
| Name | Yes | Yes, with the shop booked | No | App functionality, account management |
| Phone number | Yes | Yes, with the shop booked; Twilio delivers SMS/WhatsApp | No | Account management, app functionality |
| Approximate/precise location | Yes, only when "near me" is tapped, not stored | No | Yes | App functionality |
| Purchase history (deposits) | Yes | Yes, with PayFast and the shop | No | App functionality |
| Photos (vendors only) | Yes | Shown publicly on the shop page | Yes | App functionality |
| Other user-generated content (reviews) | Yes | Shown publicly | Yes | App functionality |
| Device or other IDs (push token) | Yes | No | Yes | App functionality (notifications) |

Payment card details are entered on PayFast and never reach Qless, so do **not** tick "Financial info: payment info".

## Other declarations

- Ads: **No ads**.
- Government app: No. Financial features: No (deposits only, no lending or banking). Health: No.
- News app: No.
- App access: some features need sign-in. Give reviewers a test login. In production sign-in uses an SMS code, so either add a reviewer phone number you can read codes from, or tell Claude to add a fixed reviewer number and code.

## Android app (Trusted Web Activity)

The Play Store app is a thin Android wrapper that opens the live site full screen. It must point at the final HTTPS domain, so it is built after the site is live.

1. Deploy the web app to the domain and set `APP_URL`.
2. Build the signed `.aab` for package `za.qless.app` (Claude can do this once the domain is live).
3. Upload it to a testing track. In Play Console go to Test and release > App integrity and copy the SHA-256 fingerprints of the app signing key and the upload key.
4. Set `ANDROID_PACKAGE_NAME=za.qless.app` and `ANDROID_CERT_SHA256=<fingerprints, comma separated>` in hosting and redeploy. `https://<your-domain>/.well-known/assetlinks.json` then proves the app owns the domain, which removes the browser address bar.
