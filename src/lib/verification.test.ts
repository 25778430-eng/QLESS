import { describe, expect, it } from "vitest";
import { firstName, greeting, optionalDocs, requiredDocs, takesDeposits, validEmail } from "./verification";

const all = { allowBasic: true, requireCipc: true, requireAddress: true, requireBank: true };

describe("requiredDocs", () => {
  it("asks Verified vendors for every switched-on document", () => {
    expect(requiredDocs("VERIFIED", all)).toEqual(["ID", "ADDRESS", "BANK", "CIPC"]);
  });
  it("drops CIPC when the admin switches it off, and offers it as optional", () => {
    const rules = { ...all, requireCipc: false };
    expect(requiredDocs("VERIFIED", rules)).toEqual(["ID", "ADDRESS", "BANK"]);
    expect(optionalDocs("VERIFIED", rules)).toContain("CIPC");
  });
  it("always needs an ID for Verified", () => {
    expect(requiredDocs("VERIFIED", { ...all, requireAddress: false, requireBank: false, requireCipc: false })).toEqual(["ID"]);
  });
  it("asks Basic vendors only for a selfie and shop photo", () => {
    expect(requiredDocs("BASIC", all)).toEqual(["SELFIE", "SHOPFRONT"]);
  });
});

describe("takesDeposits", () => {
  it("is only for Verified shops", () => {
    expect(takesDeposits({ level: "VERIFIED" })).toBe(true);
    expect(takesDeposits({ level: "BASIC" })).toBe(false);
  });
});

describe("helpers", () => {
  it("validates emails", () => {
    expect(validEmail("lerato.m@gmail.com")).toBe(true);
    expect(validEmail("lerato@")).toBe(false);
  });
  it("finds the first name", () => {
    expect(firstName("  Lerato Mokoena ")).toBe("Lerato");
  });
  it("greets by South African time", () => {
    expect(greeting(new Date("2026-10-13T06:00:00Z"))).toBe("Good morning"); // 08:00 SAST
    expect(greeting(new Date("2026-10-13T12:00:00Z"))).toBe("Good afternoon");
    expect(greeting(new Date("2026-10-13T17:00:00Z"))).toBe("Good evening");
  });
});
