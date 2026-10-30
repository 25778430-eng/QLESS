import { randomInt } from "node:crypto";

// No 0, O, 1 or I, so a code printed on a poster can't be misread.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const SHOP_CODE_LENGTH = 6;

export function newShopCode(): string {
  return Array.from({ length: SHOP_CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/**
 * Cleans up what a customer typed: ignores spaces, dashes and case. Older codes (made when the feature launched)
 * can contain 0 and 1, so an O or I typed by mistake is read as 0 or 1.
 */
export function normaliseShopCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

/** Shows a code as two groups of three, like "K7Q 4MZ", so it's easy to read out. */
export function prettyShopCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}
