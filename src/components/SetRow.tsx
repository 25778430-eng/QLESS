import Link from "next/link";

// App-style settings rows: an icon tile, a label and a chevron, grouped under a small heading.

const ICONS = {
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17h.01" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  shield: <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  doc: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>,
  switch: <path d="M4 8h14l-3-3M20 16H6l3 3" />,
  shop: <path d="M3 9h18l-2-5H5zM5 9v11h14V9" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  team: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .5 3.2 2 3.5 5" /></>,
  tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></>,
  pin: <><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  bank: <path d="M3 10h18L12 4zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />,
  card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  photo: <><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 17-5-5-9 8" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h2v2M18 18h2v2M14 20h2M20 14v2" /></>,
  tv: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  wrench: <path d="M14.5 5.5a4 4 0 0 0 5 5L12 18a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2zM6 21l-3-3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  admin: <><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  chair: <path d="M7 3v9h10V3M5 12h14l-1 4H6zM8 16l-1 5M16 16l1 5" />,
  leaf: <path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7" />,
  out: <path d="M10 5H5v14h5M15 8l4 4-4 4M19 12H9" />,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" aria-hidden>{ICONS[name]}</svg>;
}

export function SetGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="setgroup">
      {title && <h4>{title}</h4>}
      <div className="setlist">{children}</div>
    </section>
  );
}

type RowProps = { icon: IconName; title: string; sub?: string; href: string; external?: boolean; badge?: React.ReactNode };

export function SetRow({ icon, title, sub, href, external, badge }: RowProps) {
  const body = (
    <>
      <span className="ico"><Icon name={icon} /></span>
      <span className="grow"><b>{title}</b>{sub && <span>{sub}</span>}</span>
      {badge}
      <span className="chev" aria-hidden>›</span>
    </>
  );
  return external ? <a className="setrow" href={href}>{body}</a> : <Link className="setrow" href={href}>{body}</Link>;
}

/** The big round avatar, name and lines at the top of an account page. */
export function ProfileHead({ letter, name, lines, pills, corner }: { letter: string; name: string; lines: string[]; pills: React.ReactNode; corner?: React.ReactNode }) {
  return (
    <div className="phead">
      <span className="pav">{letter}</span>
      <div className="stack" style={{ gap: 2, minWidth: 0 }}>
        <h2>{name}</h2>
        {lines.map((l) => <span key={l} className="muted ell">{l}</span>)}
        <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>{pills}</div>
      </div>
      {corner && <div className="pcorner">{corner}</div>}
    </div>
  );
}

/** A page title with a back link, for the screens opened from Account. */
export function SubHead({ back, backLabel, title }: { back: string; backLabel: string; title: string }) {
  return (
    <div className="subhead">
      <Link href={back} className="small">‹ {backLabel}</Link>
      <h1>{title}</h1>
    </div>
  );
}
