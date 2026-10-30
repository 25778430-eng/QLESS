import "server-only";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { isLang, LANG_COOKIE, type Lang } from "./i18n";

/** The signed-in user's language, or the cookie a signed-out visitor picked, or English. */
export function langFor(user: Pick<User, "lang"> | null): Lang {
  if (user && isLang(user.lang)) return user.lang;
  const c = cookies().get(LANG_COOKIE)?.value;
  return isLang(c) ? c : "en";
}
