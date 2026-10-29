import { describe, expect, it } from "vitest";
import {
  arrivalExpired,
  dailyCapacity,
  dueReminders,
  estimateStarts,
  peopleAhead,
  positionAfterMoveBack,
  refundOnCancel,
  type QueueEntry,
} from "./queue";

const now = new Date("2026-10-10T08:00:00Z");
const at = (mins: number) => new Date(now.getTime() + mins * 60_000);
const w = (id: string, position: number, durationMins: number, staffId: string | null = null): QueueEntry => ({
  id,
  position,
  durationMins,
  staffId,
  status: "WAITING",
});

describe("estimateStarts", () => {
  it("serves one chair in order", () => {
    const s = estimateStarts({ now, staffIds: ["a"], entries: [w("1", 1, 30), w("2", 2, 20), w("3", 3, 10)] });
    expect(s.get("1")).toEqual(at(0));
    expect(s.get("2")).toEqual(at(30));
    expect(s.get("3")).toEqual(at(50));
  });

  it("spreads anyone-customers across chairs", () => {
    const s = estimateStarts({ now, staffIds: ["a", "b"], entries: [w("1", 1, 30), w("2", 2, 30), w("3", 3, 30)] });
    expect(s.get("1")).toEqual(at(0));
    expect(s.get("2")).toEqual(at(0));
    expect(s.get("3")).toEqual(at(30));
  });

  it("makes a customer who picked a staff member wait for them", () => {
    const s = estimateStarts({
      now,
      staffIds: ["a", "b"],
      entries: [w("1", 1, 30, "a"), w("2", 2, 30, "a"), w("3", 3, 30)],
    });
    expect(s.get("2")).toEqual(at(30));
    expect(s.get("3")).toEqual(at(0));
  });

  it("accounts for someone already in the chair", () => {
    const s = estimateStarts({
      now,
      staffIds: ["a"],
      entries: [{ ...w("0", 0, 30), status: "IN_SERVICE", startedAt: at(-10) }, w("1", 1, 30)],
    });
    expect(s.get("1")).toEqual(at(20));
  });

  it("pushes everything back while paused", () => {
    const s = estimateStarts({ now, staffIds: ["a"], entries: [w("1", 1, 30)], pausedUntil: at(30) });
    expect(s.get("1")).toEqual(at(30));
  });
});

describe("estimateStarts with staff hours and breaks", () => {
  it("holds a chair until its staff member is back from a break", () => {
    const s = estimateStarts({
      now,
      staffIds: ["a"],
      entries: [w("1", 1, 30, "a"), w("2", 2, 30, "a")],
      chairHours: new Map([["a", { from: at(15) }]]),
    });
    expect(s.get("1")).toEqual(at(15));
    expect(s.get("2")).toEqual(at(45));
  });

  it("sends anyone clients to the chair that is not on a break", () => {
    const s = estimateStarts({
      now,
      staffIds: ["a", "b"],
      entries: [w("1", 1, 30)],
      chairHours: new Map([["a", { from: at(20) }]]),
    });
    expect(s.get("1")).toEqual(at(0));
  });

  it("moves a service that would run into lunch to after lunch", () => {
    const s = estimateStarts({
      now,
      staffIds: ["a"],
      entries: [w("1", 1, 30, "a"), w("2", 2, 30, "a")],
      chairHours: new Map([["a", { blocks: [[at(40), at(70)]] }]]),
    });
    expect(s.get("1")).toEqual(at(0));
    expect(s.get("2")).toEqual(at(70));
  });
});

describe("moving back", () => {
  const entries = [w("1", 1, 30), w("2", 2, 30), w("3", 3, 30), w("4", 4, 30)];

  it("moves one place back", () => {
    const p = positionAfterMoveBack(entries, "2", 1);
    expect(p).toBeGreaterThan(3);
    expect(p).toBeLessThan(4);
  });

  it("moves to the end when asked for more places than exist", () => {
    expect(positionAfterMoveBack(entries, "3", 5)).toBeGreaterThan(4);
  });

  it("counts people ahead after the move", () => {
    const moved = entries.map((e) => (e.id === "1" ? { ...e, position: positionAfterMoveBack(entries, "1", 2) } : e));
    expect(peopleAhead(moved, "1")).toBe(2);
  });
});

describe("rules", () => {
  it("works out daily capacity", () => {
    expect(dailyCapacity(2, "08:00", "18:00", 30)).toBe(40);
    expect(dailyCapacity(0, "08:00", "18:00", 30)).toBe(0);
  });

  it("refunds only outside the window", () => {
    expect(refundOnCancel(now, at(121), 120)).toBe(true);
    expect(refundOnCancel(now, at(60), 120)).toBe(false);
  });

  it("expires the arrival window after 15 minutes", () => {
    expect(arrivalExpired(at(15), now)).toBe(false);
    expect(arrivalExpired(at(16), now)).toBe(true);
  });

  it("sends the 1 hour then the 20 minute reminder once each", () => {
    expect(dueReminders(now, at(90), { reminded60: false, reminded20: false })).toEqual([]);
    expect(dueReminders(now, at(55), { reminded60: false, reminded20: false })).toEqual([60]);
    expect(dueReminders(now, at(55), { reminded60: true, reminded20: false })).toEqual([]);
    expect(dueReminders(now, at(18), { reminded60: true, reminded20: false })).toEqual([20]);
    expect(dueReminders(now, at(18), { reminded60: false, reminded20: false })).toEqual([20]);
  });
});
