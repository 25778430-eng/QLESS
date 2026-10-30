"use client";
import { useEffect, useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

const SUN = <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></>;
const MOON = <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />;

/** One round button: a sun in light mode, a moon in dark mode. Tapping switches between them. */
export function ThemeButton({ initial }: { initial: Theme }) {
  const [dark, setDark] = useState(initial === "dark");
  useEffect(() => {
    if (initial === "auto") setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, [initial]);

  function toggle() {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${365 * 86400}; samesite=lax`;
  }

  return (
    <button type="button" className="themebtn" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      <svg viewBox="0 0 24 24" aria-hidden>{dark ? MOON : SUN}</svg>
    </button>
  );
}
