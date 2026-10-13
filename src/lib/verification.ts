import type { DocKind, VendorLevel } from "@prisma/client";

export type SignupRules = { allowBasic: boolean; requireCipc: boolean; requireAddress: boolean; requireBank: boolean };

export const DOC_LABEL: Record<DocKind, string> = {
  ID: "Owner ID, passport or permit",
  ADDRESS: "Proof of business address",
  BANK: "Bank confirmation letter",
  CIPC: "CIPC registration certificate",
  SELFIE: "Selfie of the owner",
  SHOPFRONT: "Shop front photo",
};

export const DOC_HINT: Record<DocKind, string> = {
  ID: "SA ID, passport, asylum seeker permit (section 22) or refugee ID",
  ADDRESS: "Lease, utility bill or bank statement, under 3 months old",
  BANK: "So we can pay out your deposits. Must be in your or your business's name",
  CIPC: "CoR 14.3 from CIPC",
  SELFIE: "A clear photo of your face",
  SHOPFRONT: "Helps us and your customers find you",
};

/** The documents a vendor must hand in for a level, given the admin's sign-up rules. */
export function requiredDocs(level: VendorLevel, rules: SignupRules): DocKind[] {
  if (level === "BASIC") return ["SELFIE", "SHOPFRONT"];
  const docs: DocKind[] = ["ID"];
  if (rules.requireAddress) docs.push("ADDRESS");
  if (rules.requireBank) docs.push("BANK");
  if (rules.requireCipc) docs.push("CIPC");
  return docs;
}

/** Documents shown on the form but not required. */
export function optionalDocs(level: VendorLevel, rules: SignupRules): DocKind[] {
  if (level === "BASIC") return [];
  const docs: DocKind[] = ["SHOPFRONT"];
  if (!rules.requireCipc) docs.unshift("CIPC");
  return docs;
}

/** Basic shops can't take deposits, so no money flows through Qless for them. */
export function takesDeposits(vendor: { level: VendorLevel }): boolean {
  return vendor.level === "VERIFIED";
}

export const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_DOC_BYTES = 4_000_000;
/** Days after review before the uploaded file is wiped. */
export const DOC_KEEP_DAYS = 90;

export function validEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim()) && input.length <= 200;
}

/** "Lerato Mokoena" → "Lerato" */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Morning, afternoon or evening in South Africa. */
export function greeting(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", hour12: false }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
