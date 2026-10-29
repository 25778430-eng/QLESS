# Qless requirements

Working requirements for the first version of Qless. Items marked **(proposed)** are defaults that still need Sammy's confirmation.

## 1. Product

- A booking and live-queue **web app** (web first) for vendors: barbers, nail technicians, hair salons and other walk-in businesses.
- Market: South Africa. Prices in Rand (ZAR).
- Both customers and vendors have accounts. There is also an admin role for vendor approval.
- Qless earns from a fixed **customer booking fee** (default R5), a **vendor monthly plan** (default R149) and **featured listings**. All are switched off until the admin turns them on (see 2, Booking fee; 3, Monthly plan; 4, Admin).

## 2. Customers

### Sign-up and security
- Sign up with name and cellphone number, verified by a 6-digit SMS code (phone OTP).
- POPIA consent at sign-up: required consent for booking reminders by SMS, WhatsApp and push; separate optional consent for offers. Consent can be changed in settings, and customers can request a copy of their data.

### Finding a vendor
- Nearby map search with a list sorted by distance, and category filters (barbers, nails, hair).
- Scan a vendor's QR code at the door to open their queue, or type the shop code printed under it.
- Search shops by name, area or service on Home and on the Map.
- Low-data mode that hides the map and photos.
- Appearance: Auto (follows the phone), Light or Dark, chosen on the Account page and saved on the device.

### Vendor page
- Rating and reviews, address, verified-business badge, opening hours.
- Live stats: people in queue, estimated wait, staff working.
- Photo gallery of recent work.
- Services listed with duration and price.
- Choose a specific staff member or "anyone available".

### Booking and deposit
- Joining the queue requires a fixed deposit, set by the vendor, which is deducted from the final price.
- Payment provider: PayFast **(proposed)**.
- Full refund if the customer cancels early enough (default 2 hours or more before their turn). Inside that window the vendor keeps the deposit.
- No-show forfeits the deposit **(proposed)**.

### Booking fee
- A fixed Qless booking fee (default **R5**) is added on top of the deposit and paid in the same PayFast payment. If a vendor takes no deposit, the customer pays just the fee.
- Shown on the vendor page and itemised on the payment screen before the customer pays.
- Qless keeps it; it is not part of the service price and is not passed to vendors.
- **Not refunded** on cancel, early or late. Only the deposit is refunded.
- Walk-ins added by the vendor pay no fee.
- The admin sets the amount (R0 to R50) and switches it on or off. **Off by default.** Changes apply to new bookings only.

### Live queue
- Shows position, people ahead and estimated turn time, plus a check-in code to show on arrival.
- Reminders at **1 hour** and **20 minutes** before the turn, by push, SMS and WhatsApp. SMS/WhatsApp provider: Twilio **(proposed)**.
- When called, the customer has **15 minutes** to arrive, or loses the spot (and the deposit).
- Move my spot back: once per booking, free, keeps the deposit, vendor is told automatically.
- Cancel booking with the refund rule above.

### After the visit
- Rate and review. Reviews only allowed after a completed booking.
- My bookings: upcoming and past visits, with one-tap rebooking.

- Sign-up (2026-10-13) asks for first name, surname, email and cellphone, plus confirmation the person is 18+ or has a parent's permission (POPIA). Home greets the customer by first name and shows their live ticket.
- Maps use Google Maps when `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set, otherwise OpenStreetMap.

## 3. Vendors

### Registration and verification
- Register with business name, type, street address and owner cellphone, then pick a level (added 2026-10-13):
  - **Verified**: uploads an owner ID (SA ID, passport, asylum seeker permit or refugee ID), proof of business address, a bank confirmation letter plus bank details, and a CIPC number and certificate. The admin can switch the CIPC, address and bank requirements on or off. Verified shops can take deposits.
  - **Basic**: no documents, just a selfie and shop photo. Walk-ins and free bookings only, no deposits or booking fee, shown to customers as "Not verified". Can ask to upgrade to Verified later. The admin can switch Basic listings off.
- Documents are private (admins and the owner only) and the files are deleted 90 days after review.
- Staff can be given a cellphone number. They sign in with it to their own "My chair" screen, see the clients who picked them plus "anyone" clients, and call their own next client. The owner still sees every chair.
- Vendor Account is a business hub: shop profile and hours, services, staff, QR, bank and payouts, plan, documents, daily summary, and a switch to customer view.
- Admin approves each vendor before it goes live.

### Shop setup
- Vendor sets own open days and hours.
- Services with name, duration and price.
- Booking deposit amount and refund window.
- **My team** page: the owner adds and removes staff, gives each one a login cellphone, and sets each person's working days, start and finish times and lunch (blank times mean the shop's hours). Staff who don't work today aren't ticked when the queue opens. A customer can't book a staff member whose day would end before the service finishes, and nobody is booked into a lunch.

### Monthly plan
- When the admin switches the plan on, vendors pay a monthly price (default **R149**) through a PayFast subscription (card or debit order), billed monthly until cancelled.
- Every shop gets a free trial first (default **14 days**): from the day the plan is switched on for existing shops, from approval for new ones.
- Shops without a plan after the trial are hidden from search, their page says they aren't taking bookings, and they can't open a queue. Bookings already made are not affected.
- Each payment covers a month plus 3 days' grace, so a late debit order doesn't hide the shop.
- Vendors see their trial or plan status at the top of their screens and can subscribe or cancel on the Monthly plan page. Cancelling keeps them listed until the paid period ends.
- A price change applies to new subscriptions; existing subscribers keep paying what they signed up at.
- The admin can waive the plan for any shop.

### Running the day
- Before the queue opens, vendor sets the number of staff working today. Capacity follows from staff count; **bookings close when the queue is full**.
- Live queue with booked customers and **walk-ins** in one line.
- Call next (notifies the customer, who then has 15 minutes to arrive).
- Check in arrivals with their code.
- Pause the queue (load-shedding, staff break, running late, other) for a set time; everyone waiting is notified with a new estimated time and nobody loses their deposit.
- QR poster to print for the shop door, with a 6-character shop code under the QR (no 0, O, 1 or I). Customers whose camera won't scan type the code on the Scan screen.
- Staff chair screen: a Call button on every waiting client so staff can pick who's next (for example a walk-in who is already there), plus a 10, 15 or 30 minute break for one chair. During a break that chair's own clients get new times and a message and keep their deposits, "anyone" clients move to other chairs, and customers see the staff member as on a break. Calling a client ends the break.

### Daily summary
- Customers served, no-shows, walk-ins.
- Takings, deposits kept and refunded, PayFast payouts.
- Customers by hour and per staff member.

## 4. Admin

- Two admin levels. **Admins** approve vendors, check documents and block customers and vendors. **Super admins** can also change sign-up rules, the booking fee, the monthly plan (and waivers) and featured listings, see Money, block regular admins, and add or remove admins on the Team page. Numbers in `ADMIN_PHONES` are always super admins. Super admins can't be blocked, and nobody can remove or demote themselves.
- Vendor approval list: open each uploaded document, ask for a single document again, or approve or reject the whole application (or a Basic shop's upgrade). Rejected vendors get an SMS with the reason.
- Vendor sign-up rules: switches for CIPC, proof of address, bank details, and Basic listings.
- Customer booking fee: amount, on/off switch, and fees collected in the last 30 days.
- Vendor monthly plan: price, free-trial length, on/off switch (**off by default**), number of shops subscribed, and per-shop plan status with a waive switch.
- Money dashboard: Qless income (booking fees, plan payments, featured payments) for this month, per month for the last 12 months and per day for the last 30 days. Deposits owed to each vendor for a chosen month: deposits that came off a customer's bill or were kept for a no-show or late cancel, plus deposits still held and refunded. Featured payments are entered by the admin when featuring a shop.
- Users page: search customers and vendors by name, cellphone or shop name; filter by customers, vendors or blocked. Each user shows their bookings, no-shows (all time and last 30 days) and fees. The admin can block a user (signed out, can't sign in or book, and their shop is hidden) with a private reason, unblock them, or lift an automatic no-show booking pause. Only a super admin can block a regular admin; super admins can't be blocked. A super admin can also remove a user for good (type REMOVE to confirm): their name, number and email are wiped, they can't sign in again and any shop they own is taken off Qless; booking and payment records stay without their details. Not allowed while they're in a queue, for yourself, or for ADMIN_PHONES numbers.
- Featured listings: per shop, the admin switches featuring on or off, sets a rank (higher shows first) and an optional end date. Featured shops show first in search with a "Featured" badge. A featured shop still needs its plan to be listed. Admin-controlled only for now; vendors can't buy featuring themselves yet.

## 5. Security and abuse (proposed set)

- Phone OTP for all accounts.
- Admin vendor approval with CIPC check.
- POPIA compliance.
- Check-in code to confirm arrival.
- Abuse limits (for example, limits on repeated bookings and no-shows).
- Reviews only after a completed booking.

## 6. Branding

- Logo: white stylised Q on black.
- Palette: black and white, with yellow used only for alerts (your turn, queue marker, pause banner).

## 7. Open questions

- Confirm PayFast, Twilio and the no-show rule.
- Confirm the security set in section 5.
- Tech stack and hosting are not decided yet.

## 8. Build notes

The first version of the app implements everything above. Decisions taken while building, which can be changed:

- Deposits are collected into one Qless PayFast account. Paying vendors their share (deposits kept from no-shows) is manual for now. Booking fees, plan payments and featuring stay with Qless.
- Customers join today's live queue, or book a set time on a later day (up to 14 days ahead, in 30-minute steps). Booked times hold their chair and the live queue fills the gaps around them.
- A customer can hold 2 active bookings at once. 3 no-shows in 30 days blocks booking for 7 days.
- Unpaid bookings are released after 15 minutes.
- Daily capacity is staff working × opening hours ÷ average service length.
- Vendor photos are stored in the database (up to 12 per shop, 1.5 MB each).

## 9. Every kind of queue business (October 2026)

Qless is for any business with a queue, not only barbers. Each shop picks a type at sign-up, which sets its wording and tools:

| Type | Served at | Extra tools |
| --- | --- | --- |
| Hair and beauty | chair | — |
| Car wash | bay | price by car size, number plate, "car ready" alert |
| Clinic or practice | room | — |
| Repair shop | counter | job card stages, quote the customer approves in the app, "ready to collect" alert |
| Private clients | desk | — |
| Government or municipal | counter | free tickets (no deposit or fee), ticket letters like A027, "bring with you" list |

- The super admin switches each type on or off (Admin > Types). Off types are hidden from search and can't sign up. Government starts off.
- Services can have price options (one per line: name | price | minutes) and extras or products sold on top.
- Every booking gets a ticket number (per letter per day, e.g. A001, or 001 without a letter).
- Walk-ins can leave a cellphone number to get their ticket by SMS with a live link (/t/REF), or get a printed ticket with a QR code. The link shows ticket, place and time only.
- Waiting-room TV screen at a secret link the owner can reset: now serving (ticket and station), next up, and a QR to join. Ticket numbers only, no names.
- Payouts page for verified shops: deposits earned, paid out and still due. The super admin records each EFT payout in Admin > Money and the shop gets an SMS.
- Languages: English, isiZulu, isiXhosa, Afrikaans and Sesotho on the main customer screens (tab bar, Home, joining). Translations need checking by native speakers; other screens are still English.
- POPIA: a daily clean-up deletes sign-in codes after 30 days, anonymises bookings older than 5 years (names, numbers, plates and review text removed) and deletes customer accounts with no sign-in or booking for 5 years. Breach plan: docs/breach-plan.md.
