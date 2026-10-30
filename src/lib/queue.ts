// Pure queue maths: estimated turn times, moving back, capacity and refund rules.
// Kept free of database calls so it can be unit tested.

export const ARRIVAL_WINDOW_MINS = 15;
export const REMINDER_MINS = [60, 20] as const;
export const BREAK_MINUTES = [10, 15, 30];

export type QueueEntry = {
  id: string;
  position: number;
  durationMins: number;
  staffId: string | null; // null means "anyone available"
  status: "WAITING" | "CALLED" | "IN_SERVICE";
  startedAt?: Date | null;
  calledAt?: Date | null;
  /** Booked for a set time: starts no earlier, and holds its chair at that time. */
  notBefore?: Date | null;
};

/** When a chair can take clients: not before `from` (start of shift or end of a break), and never inside a block (lunch). */
export type ChairHours = { from?: Date | null; blocks?: Array<[Date, Date]> };

export type EtaInput = {
  now: Date;
  staffIds: string[];
  entries: QueueEntry[];
  pausedUntil?: Date | null;
  chairHours?: Map<string, ChairHours>;
};

const MIN = 60_000;

/**
 * Simulates the day's queue to estimate when each waiting customer starts.
 * Each working staff member is a "chair" that frees up when their current
 * customer is done. Customers who picked a staff member wait for that chair;
 * "anyone" customers take whichever chair frees up first.
 */
export function estimateStarts({ now, staffIds, entries, pausedUntil, chairHours }: EtaInput): Map<string, Date> {
  const chairs = staffIds.length ? staffIds : ["_default"];
  const base = pausedUntil && pausedUntil > now ? pausedUntil.getTime() : now.getTime();
  const free = new Map<string, number>(chairs.map((c) => [c, Math.max(base, chairHours?.get(c)?.from?.getTime() ?? 0)]));

  // Customers already in the chair or called keep their chair busy.
  const active = entries
    .filter((e) => e.status !== "WAITING")
    .sort((a, b) => a.position - b.position);
  for (const e of active) {
    const chair = pickChair(free, e.staffId);
    const startedAt = e.status === "IN_SERVICE" && e.startedAt ? e.startedAt.getTime() : now.getTime();
    const done = Math.max(startedAt + e.durationMins * MIN, base);
    free.set(chair, Math.max(free.get(chair)!, done));
  }

  const out = new Map<string, Date>();
  // Booked times go first and hold their chair like lunch does, so the queue fills the gaps around them.
  const blocks = new Map<string, Array<[Date, Date]>>(chairs.map((c) => [c, [...(chairHours?.get(c)?.blocks ?? [])]]));
  const booked = entries
    .filter((e) => e.status === "WAITING" && e.notBefore)
    .sort((a, b) => a.notBefore!.getTime() - b.notBefore!.getTime());
  for (const e of booked) {
    const len = e.durationMins * MIN;
    const at = (c: string) => fitAround(Math.max(e.notBefore!.getTime(), free.get(c)!), len, blocks.get(c));
    const chair = e.staffId && free.has(e.staffId) ? e.staffId : chairs.reduce((best, c) => (at(c) < at(best) ? c : best), chairs[0]!);
    const start = at(chair);
    out.set(e.id, new Date(start));
    blocks.get(chair)!.push([new Date(start), new Date(start + len)]);
  }

  const waiting = entries
    .filter((e) => e.status === "WAITING" && !e.notBefore)
    .sort((a, b) => a.position - b.position);
  for (const e of waiting) {
    const chair = pickChair(free, e.staffId);
    const start = fitAround(free.get(chair)!, e.durationMins * MIN, blocks.get(chair));
    out.set(e.id, new Date(start));
    free.set(chair, start + e.durationMins * MIN);
  }
  return out;
}

/** Moves a start time past any block (like lunch) that the service would run into. */
function fitAround(start: number, length: number, blocks: Array<[Date, Date]> = []): number {
  let t = start;
  for (const [from, to] of [...blocks].sort((a, b) => a[0].getTime() - b[0].getTime())) {
    if (t < to.getTime() && t + length > from.getTime()) t = to.getTime();
  }
  return t;
}

export type Slot = { at: string; free: boolean };

/**
 * Times a customer can book on a later day, every `stepMins` from opening until the service would run past closing.
 * A time is free while fewer than `chairs` booked visits overlap it (or none, for a chosen staff member).
 */
export function slotsFor(opts: {
  openTime: string;
  closeTime: string;
  durationMins: number;
  chairs: number;
  booked: Array<{ start: string; durationMins: number; staffId: string | null }>;
  staffId?: string | null;
  stepMins?: number;
}): Slot[] {
  const step = opts.stepMins ?? 30;
  const open = toMinutes(opts.openTime);
  const close = toMinutes(opts.closeTime);
  const out: Slot[] = [];
  for (let m = open; m + opts.durationMins <= close; m += step) {
    const overlapping = opts.booked.filter((b) => {
      const s = toMinutes(b.start);
      return s < m + opts.durationMins && m < s + b.durationMins;
    });
    const free = opts.staffId
      ? !overlapping.some((b) => b.staffId === opts.staffId) && overlapping.length < Math.max(1, opts.chairs)
      : overlapping.length < Math.max(1, opts.chairs);
    out.push({ at: fromMinutes(m), free });
  }
  return out;
}

export function fromMinutes(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function pickChair(free: Map<string, number>, staffId: string | null): string {
  if (staffId && free.has(staffId)) return staffId;
  let best = "";
  let bestT = Infinity;
  for (const [c, t] of free) {
    if (t < bestT) {
      best = c;
      bestT = t;
    }
  }
  return best;
}

/** Number of waiting customers ahead of this booking (same staff, or anyone, counts). */
export function peopleAhead(entries: QueueEntry[], id: string): number {
  const me = entries.find((e) => e.id === id);
  if (!me) return 0;
  return entries.filter(
    (e) => e.id !== id && e.status === "WAITING" && e.position < me.position,
  ).length;
}

/**
 * New position after moving back `places` spots among waiting customers.
 * Returns a value between the neighbours so no other rows need updating.
 */
export function positionAfterMoveBack(entries: QueueEntry[], id: string, places: number): number {
  const waiting = entries
    .filter((e) => e.status === "WAITING")
    .sort((a, b) => a.position - b.position);
  const idx = waiting.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Booking is not waiting");
  const others = waiting.filter((e) => e.id !== id);
  const target = Math.min(idx + places, others.length); // insert before others[target]
  const before = target > 0 ? others[target - 1].position : waiting[idx].position - 1;
  const after = target < others.length ? others[target].position : before + 2;
  return (before + after) / 2;
}

/** How many customers a day can take: chairs × open minutes ÷ average service length. */
export function dailyCapacity(staffCount: number, openTime: string, closeTime: string, avgServiceMins: number): number {
  const mins = toMinutes(closeTime) - toMinutes(openTime);
  if (mins <= 0 || staffCount <= 0) return 0;
  return staffCount * Math.floor(mins / Math.max(5, avgServiceMins));
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Full refund when cancelling at least `windowMins` before the estimated turn. */
export function refundOnCancel(now: Date, estimatedStart: Date | null | undefined, windowMins: number): boolean {
  if (!estimatedStart) return true;
  return estimatedStart.getTime() - now.getTime() >= windowMins * MIN;
}

/** True once a called customer has used up their arrival window. */
export function arrivalExpired(now: Date, calledAt: Date): boolean {
  return now.getTime() - calledAt.getTime() > ARRIVAL_WINDOW_MINS * MIN;
}

/** Which reminders are due now, given the estimated start and what was already sent. */
export function dueReminders(
  now: Date,
  estimatedStart: Date,
  sent: { reminded60: boolean; reminded20: boolean },
): Array<60 | 20> {
  const left = (estimatedStart.getTime() - now.getTime()) / MIN;
  const due: Array<60 | 20> = [];
  if (left <= 20) {
    if (!sent.reminded20) due.push(20);
  } else if (left <= 60 && !sent.reminded60) {
    due.push(60);
  }
  return due;
}
