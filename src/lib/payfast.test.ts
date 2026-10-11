import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { pfSignature } from "./payfast";

describe("pfSignature", () => {
  it("signs fields in order, encodes spaces as +, and appends the passphrase", () => {
    const fields: Array<[string, string]> = [
      ["merchant_id", "10000100"],
      ["merchant_key", "46f0cd694581a"],
      ["amount", "50.00"],
      ["item_name", "Skin fade deposit"],
      ["email_address", ""],
    ];
    const expected = createHash("md5")
      .update("merchant_id=10000100&merchant_key=46f0cd694581a&amount=50.00&item_name=Skin+fade+deposit&passphrase=jt7NOE43FZPn")
      .digest("hex");
    expect(pfSignature(fields, "jt7NOE43FZPn")).toBe(expected);
  });

  it("ignores an existing signature field", () => {
    const a = pfSignature([["a", "1"]]);
    expect(pfSignature([["a", "1"], ["signature", "x"]])).toBe(a);
  });
});
