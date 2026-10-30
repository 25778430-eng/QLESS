// Service prices: one price, or options like car sizes, plus extras sold on top. Pure, no database access.

export type PriceOption = { label: string; priceCents: number; durationMins: number };
type ServiceLike = { name: string; priceCents: number; durationMins: number; options: unknown };
type ExtraLike = { name: string; priceCents: number; durationMins: number };

/** Reads the options stored on a service, dropping anything malformed. */
export function serviceOptions(s: Pick<ServiceLike, "options">): PriceOption[] {
  if (!Array.isArray(s.options)) return [];
  return s.options.flatMap((o) => {
    const r = (o ?? {}) as Partial<PriceOption>;
    return typeof r.label === "string" && r.label && Number.isInteger(r.priceCents) && Number.isInteger(r.durationMins)
      ? [{ label: r.label, priceCents: r.priceCents!, durationMins: r.durationMins! }]
      : [];
  });
}

/**
 * Parses the owner's option lines, one per line: "Small car | 80 | 30" (label, price in rand, minutes).
 * Minutes can be left out to use the service's time. Returns an error message for a bad line.
 */
export function parseOptionLines(text: string, defaultMins: number): PriceOption[] | string {
  const out: PriceOption[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const [label, price, mins] = line.split("|").map((p) => p.trim());
    const priceCents = Math.round(Number((price ?? "").replace(/^R/i, "")) * 100);
    const durationMins = mins ? Math.round(Number(mins)) : defaultMins;
    if (!label || !(priceCents > 0) || !(durationMins >= 5 && durationMins <= 480)) {
      return `Check this line: "${line}". Use: name | price | minutes, like "Small car | 80 | 30".`;
    }
    if (out.length >= 8) return "Up to 8 options per service.";
    out.push({ label: label.slice(0, 40), priceCents, durationMins });
  }
  return out;
}

export function optionLines(options: PriceOption[]): string {
  return options.map((o) => `${o.label} | ${o.priceCents / 100} | ${o.durationMins}`).join("\n");
}

/** "R80" or "from R80" when the price depends on an option. */
export function priceFrom(s: ServiceLike): { cents: number; from: boolean } {
  const opts = serviceOptions(s);
  if (!opts.length) return { cents: s.priceCents, from: false };
  return { cents: Math.min(...opts.map((o) => o.priceCents)), from: new Set(opts.map((o) => o.priceCents)).size > 1 };
}

export type Quote = { priceCents: number; durationMins: number; optionLabel: string | null; extrasCents: number; extras: string };

/** Total price and time for a service with an optional option and extras. Null if the option doesn't exist. */
export function quote(s: ServiceLike, optionLabel: string | null, extras: ExtraLike[] = []): Quote | null {
  const opts = serviceOptions(s);
  let priceCents = s.priceCents;
  let durationMins = s.durationMins;
  let label: string | null = null;
  if (opts.length) {
    const o = opts.find((x) => x.label === optionLabel) ?? (optionLabel ? null : opts[0]);
    if (!o) return null;
    priceCents = o.priceCents;
    durationMins = o.durationMins;
    label = o.label;
  }
  const extrasCents = extras.reduce((sum, e) => sum + e.priceCents, 0);
  return {
    priceCents: priceCents + extrasCents,
    durationMins: durationMins + extras.reduce((sum, e) => sum + e.durationMins, 0),
    optionLabel: label,
    extrasCents,
    extras: extras.map((e) => e.name).join(", "),
  };
}

/** The next ticket number for a letter today: A001, A002… Without a letter: 001, 002… */
export function nextTicketNo(letter: string | null, taken: Array<string | null>): string {
  const prefix = (letter ?? "").toUpperCase();
  let max = 0;
  for (const t of taken) {
    if (!t || !t.startsWith(prefix)) continue;
    const rest = t.slice(prefix.length);
    if (/^\d+$/.test(rest)) max = Math.max(max, Number(rest));
  }
  return prefix + String(max + 1).padStart(3, "0");
}
