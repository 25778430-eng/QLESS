import { describe, expect, it } from "vitest";
import { amountDue, bookingFee, parseFeeRand } from "./fees";

describe("bookingFee", () => {
  it("is zero while switched off", () => {
    expect(bookingFee({ bookingFeeOn: false, bookingFeeCents: 500 })).toBe(0);
  });
  it("is the set amount when switched on", () => {
    expect(bookingFee({ bookingFeeOn: true, bookingFeeCents: 500 })).toBe(500);
  });
});

describe("amountDue", () => {
  it("adds the fee on top of the deposit", () => {
    expect(amountDue({ depositCents: 5000, feeCents: 500 })).toBe(5500);
    expect(amountDue({ depositCents: 0, feeCents: 500 })).toBe(500);
  });
});

describe("parseFeeRand", () => {
  it("parses rand amounts to cents", () => {
    expect(parseFeeRand("5")).toBe(500);
    expect(parseFeeRand("7.50")).toBe(750);
    expect(parseFeeRand("0")).toBe(0);
  });
  it("rejects bad or too large amounts", () => {
    expect(parseFeeRand("-1")).toBeNull();
    expect(parseFeeRand("abc")).toBeNull();
    expect(parseFeeRand("51")).toBeNull();
    expect(parseFeeRand("1.234")).toBeNull();
  });
});
