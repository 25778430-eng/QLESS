import "server-only";
import { db } from "./db";

/** The single app-wide settings row, created with defaults (fee off) on first use. */
export function getSettings() {
  return db.setting.upsert({ where: { id: "global" }, create: { id: "global" }, update: {} });
}
