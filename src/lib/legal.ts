import { appUrl } from "./http";

/** Contact details shown on the privacy, terms, PAIA and account-deletion pages. */
export function supportEmail(): string {
  if (process.env.SUPPORT_EMAIL) return process.env.SUPPORT_EMAIL;
  return `support@${new URL(appUrl()).hostname}`;
}

export function operatorName(): string {
  return process.env.OPERATOR_NAME || "Qless";
}

/** Registered business details for the PAIA manual. Blank until set in the environment. */
export function operatorDetails() {
  return {
    regNo: process.env.OPERATOR_REG_NO || "",
    address: process.env.OPERATOR_ADDRESS || "",
  };
}

/** The Information Officer registered with the Information Regulator (POPIA section 55). */
export function infoOfficer() {
  return {
    name: process.env.INFO_OFFICER_NAME || `The Information Officer, ${operatorName()}`,
    email: process.env.INFO_OFFICER_EMAIL || supportEmail(),
    phone: process.env.INFO_OFFICER_PHONE || "",
  };
}

export const LEGAL_UPDATED = "29 October 2026";
