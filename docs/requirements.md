# Qless requirements

Working requirements for the first version of Qless. Items marked **(proposed)** are defaults that still need Sammy's confirmation.

## 1. Product

- A booking and live-queue **web app** (web first) for vendors: barbers, nail technicians, hair salons and other walk-in businesses.
- Market: South Africa. Prices in Rand (ZAR).
- Both customers and vendors have accounts. There is also an admin role for vendor approval.
- No platform fee or subscription for now.

## 2. Customers

### Sign-up and security
- Sign up with name and cellphone number, verified by a 6-digit SMS code (phone OTP).
- POPIA consent at sign-up: required consent for booking reminders by SMS, WhatsApp and push; separate optional consent for offers. Consent can be changed in settings, and customers can request a copy of their data.

### Finding a vendor
- Nearby map search with a list sorted by distance, and category filters (barbers, nails, hair).
- Scan a vendor's QR code at the door to open their queue.
- Low-data mode that hides the map and photos.

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

### Live queue
- Shows position, people ahead and estimated turn time, plus a check-in code to show on arrival.
- Reminders at **1 hour** and **20 minutes** before the turn, by push, SMS and WhatsApp. SMS/WhatsApp provider: Twilio **(proposed)**.
- When called, the customer has **15 minutes** to arrive, or loses the spot (and the deposit).
- Move my spot back: once per booking, free, keeps the deposit, vendor is told automatically.
- Cancel booking with the refund rule above.

### After the visit
- Rate and review. Reviews only allowed after a completed booking.
- My bookings: upcoming and past visits, with one-tap rebooking.

## 3. Vendors

### Registration and verification
- Register with business name, type, street address, owner cellphone and **CIPC business registration number** (required).
- Admin approves each vendor before it goes live.

### Shop setup
- Vendor sets own open days and hours.
- Services with name, duration and price.
- Booking deposit amount and refund window.

### Running the day
- Before the queue opens, vendor sets the number of staff working today. Capacity follows from staff count; **bookings close when the queue is full**.
- Live queue with booked customers and **walk-ins** in one line.
- Call next (notifies the customer, who then has 15 minutes to arrive).
- Check in arrivals with their code.
- Pause the queue (load-shedding, staff break, running late, other) for a set time; everyone waiting is notified with a new estimated time and nobody loses their deposit.
- QR poster to print for the shop door.

### Daily summary
- Customers served, no-shows, walk-ins.
- Takings, deposits kept and refunded, PayFast payouts.
- Customers by hour and per staff member.

## 4. Admin

- Vendor approval list: check each CIPC number before approving or rejecting. Rejected vendors get an SMS with the reason.

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

- Deposits are collected into one Qless PayFast account. Paying vendors their share (deposits kept from no-shows) is manual for now.
- Customers join today's live queue only; there is no booking for a future day yet.
- A customer can hold 2 active bookings at once. 3 no-shows in 30 days blocks booking for 7 days.
- Unpaid bookings are released after 15 minutes.
- Daily capacity is staff working × opening hours ÷ average service length.
- Vendor photos are stored in the database (up to 12 per shop, 1.5 MB each).
