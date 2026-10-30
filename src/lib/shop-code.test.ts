import { describe, expect, it } from "vitest";
import { newShopCode, normaliseShopCode, prettyShopCode, SHOP_CODE_LENGTH } from "./shop-code";

describe("shop codes", () => {
  it("makes codes without look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const c = newShopCode();
      expect(c).toHaveLength(SHOP_CODE_LENGTH);
      expect(c).not.toMatch(/[01OI]/);
    }
  });

  it("ignores spaces, dashes and case", () => {
    expect(normaliseShopCode(" k7q-4mz ")).toBe("K7Q4MZ");
  });

  it("reads a typed O or I as 0 or 1 for older codes", () => {
    expect(normaliseShopCode("a0b1c2")).toBe("A0B1C2");
    expect(normaliseShopCode("aObIc2")).toBe("A0B1C2");
  });

  it("splits a code into two groups of three", () => {
    expect(prettyShopCode("K7Q4MZ")).toBe("K7Q 4MZ");
  });
});
