import "server-only";
import { redirect } from "next/navigation";

/** Sends the user back to a page with an error or notice shown at the top. */
export function back(path: string, opts: { error?: string; notice?: string }): never {
  const url = new URL(path, "http://x");
  if (opts.error) url.searchParams.set("error", opts.error);
  if (opts.notice) url.searchParams.set("notice", opts.notice);
  redirect(url.pathname + url.search);
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
