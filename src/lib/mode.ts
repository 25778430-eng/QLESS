import "server-only";
import { cookies } from "next/headers";

// Staff work in "staff mode" (My bay, Bookings, Account). To book somewhere else they switch to client mode in Account.
export const MODE_COOKIE = "mode";

export function inClientMode(): boolean {
  return cookies().get(MODE_COOKIE)?.value === "client";
}
