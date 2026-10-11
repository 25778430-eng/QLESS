import { describe, expect, it } from "vitest";
import { normalisePhone, rand, slugify, validCipc, sastDate } from "./format";

describe("format", () => {
  it("normalises SA cellphone numbers", () => {
    expect(normalisePhone("082 555 0147")).toBe("+27825550147");
    expect(normalisePhone("+27 82 555 0147")).toBe("+27825550147");
    expect(normalisePhone("27825550147")).toBe("+27825550147");
    expect(normalisePhone("12345")).toBeNull();
  });
  it("checks CIPC numbers", () => {
    expect(validCipc("2021/483920/07")).toBe(true);
    expect(validCipc("2021-483920-07")).toBe(false);
  });
  it("formats rand", () => {
    expect(rand(5000)).toBe("R50");
    expect(rand(132000)).toBe("R1,320");
    expect(rand(12050)).toBe("R120.50");
  });
  it("slugifies names", () => {
    expect(slugify("Sharp Lines Barbershop!")).toBe("sharp-lines-barbershop");
  });
  it("uses South African dates", () => {
    expect(sastDate(new Date("2026-10-10T23:30:00Z"))).toBe("2026-10-11");
  });
});
