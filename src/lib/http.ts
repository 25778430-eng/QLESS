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
  // On Vercel, fall back to the project's own *.vercel.app address until APP_URL is set
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.APP_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
}
