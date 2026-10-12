/** Appearance setting, stored per device in a cookie. "auto" follows the phone's light/dark setting. */
export type Theme = "auto" | "light" | "dark";
export const THEME_COOKIE = "theme";
export const THEMES: Theme[] = ["auto", "light", "dark"];

export function parseTheme(value: string | undefined | null): Theme {
  return value === "light" || value === "dark" ? value : "auto";
}
