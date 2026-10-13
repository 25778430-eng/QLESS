import { appUrl } from "./http";

/** Contact details shown on the privacy, terms and account-deletion pages. */
export function supportEmail(): string {
  if (process.env.SUPPORT_EMAIL) return process.env.SUPPORT_EMAIL;
  return `support@${new URL(appUrl()).hostname}`;
}

export function operatorName(): string {
  return process.env.OPERATOR_NAME || "Qless";
}

export const LEGAL_UPDATED = "13 October 2026";
