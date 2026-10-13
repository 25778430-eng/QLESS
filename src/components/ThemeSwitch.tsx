"use client";
import { useState } from "react";
import { THEME_COOKIE, THEMES, type Theme } from "@/lib/theme";

const LABELS: Record<Theme, string> = { auto: "Auto", light: "Light", dark: "Dark" };

/** Auto / Light / Dark switch. Saved in a cookie on this device so the server renders the right colours. */
export function ThemeSwitch({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(t: Theme) {
    setTheme(t);
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=${365 * 86400}; samesite=lax`;
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="seg" role="group" aria-label="Appearance">
        {THEMES.map((t) => (
          <button key={t} type="button" aria-pressed={theme === t} onClick={() => choose(t)}>{LABELS[t]}</button>
        ))}
      </div>
      <p className="small muted">Auto matches your phone&apos;s light or dark setting.</p>
    </div>
  );
}
