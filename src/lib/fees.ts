// Qless booking fee: a fixed amount the customer pays on top of the deposit.
// Qless keeps it; it is not passed to vendors and not refunded on cancel.

export const DEFAULT_FEE_CENTS = 500;
export const MAX_FEE_CENTS = 5000;

export type FeeSetting = { bookingFeeOn: boolean; bookingFeeCents: number };

/** Fee for a new booking under the current setting. */
export function bookingFee(s: FeeSetting): number {
  return s.bookingFeeOn ? Math.max(0, s.bookingFeeCents) : 0;
}

/** What the customer pays through PayFast to hold their spot. */
export function amountDue(b: { depositCents: number; feeCents: number }): number {
  return b.depositCents + b.feeCents;
}

/** Parses an admin rand amount (e.g. "5" or "7.50") into cents. Null if out of range. */
export function parseFeeRand(input: string, maxCents = MAX_FEE_CENTS): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(input.trim())) return null;
  const cents = Math.round(Number(input) * 100);
  return cents >= 0 && cents <= maxCents ? cents : null;
}
