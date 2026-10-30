import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone, shortDate } from "@/lib/format";
import { isFeatured, planState, type PlanState } from "@/lib/plans";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { SubHead } from "@/components/SetRow";
import { getSettings } from "@/lib/settings";
import { saveFeatured, setPlanWaived } from "../actions";

function planLabel(p: PlanState): string {
  switch (p.kind) {
    case "OFF": return "Plan off";
    case "WAIVED": return "Plan waived";
    case "ACTIVE": return `Plan paid to ${shortDate(p.until)}`;
    case "TRIAL": return `Trial to ${shortDate(p.until)}`;
    case "EXPIRED": return `Hidden: no plan since ${shortDate(p.since)}`;
  }
}

/** YYYY-MM-DD in South Africa, for a date input. */
function dateInput(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(d) : "";
}

export const dynamic = "force-dynamic";

/** Every live shop, with its monthly plan and featured settings. */
export default async function Shops({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  await requireSuperAdmin();
  const settings = await getSettings();
  const now = new Date();
  const vendors = await db.vendor.findMany({ where: { status: "APPROVED" }, orderBy: [{ featured: "desc" }, { name: "asc" }], take: 200 });
  return (
    <>
      <AdminHeader />
      <main className="main app">
        <SubHead back="/admin" backLabel="Admin" title="Shops" />
        <Messages searchParams={searchParams} />
        {vendors.length === 0 && <p className="muted">No live shops yet.</p>}
        {vendors.map((v) => (
          <div key={v.id} className="card stack">
            <div className="row between"><b>{v.name}</b>{isFeatured(v, now) && <span className="pill sig">Featured</span>}</div>
            <span className="small muted">{v.category} · {v.address} · <span className="mono">{prettyPhone(v.phone)}</span></span>
            <Link className="small" href={`/v/${v.slug}`}>Open shop page ›</Link>
            {v.status === "APPROVED" && (
              <>
                <form action={setPlanWaived} className="row between">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="waived" value={v.planWaived ? "0" : "1"} />
                  <span className="small">{planLabel(planState(v, settings, now))}</span>
                  <Submit className="btn sm alt">{v.planWaived ? "Require plan" : "Waive plan"}</Submit>
                </form>
                <form action={saveFeatured} className="stack" style={{ gap: 8 }}>
                  <input type="hidden" name="id" value={v.id} />
                  <div className="row between">
                    <label className="row small"><input type="checkbox" name="featured" defaultChecked={v.featured} /> Featured</label>
                    {isFeatured(v, now) && <span className="pill">Featured now</span>}
                  </div>
                  <div className="row">
                    <label className="f grow">Rank (higher shows first)<input className="i mono" type="number" min="0" max="100" step="1" name="rank" defaultValue={v.featuredRank} /></label>
                    <label className="f grow">Until (optional)<input className="i" type="date" name="until" defaultValue={dateInput(v.featuredUntil)} /></label>
                  </div>
                  <label className="f">Amount paid for featuring (R, optional, shows on Money)<input className="i mono" type="number" min="0" step="0.01" name="paid" placeholder="0" /></label>
                  <Submit className="btn sm alt">Save featured</Submit>
                </form>
              </>
            )}
          </div>
        ))}
      </main>
    </>
  );
}
