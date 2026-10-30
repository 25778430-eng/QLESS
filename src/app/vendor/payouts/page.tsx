import Link from "next/link";
import { SubHead } from "@/components/SetRow";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand, shortDate } from "@/lib/format";
import { vendorBalance } from "@/lib/money";

export const dynamic = "force-dynamic";

const LINE: Record<string, string> = { APPLIED: "Came off the bill", FORFEITED: "Kept: no-show or late cancel", PAID: "Held until the visit", REFUNDED: "Refunded", REFUND_PENDING: "Refund on its way" };

/** Deposits Qless collected for the shop, what has been paid out, and what is still due. */
export default async function Payouts() {
  const { vendor } = await requireVendor();
  const [deposits, payouts] = await Promise.all([
    db.booking.findMany({
      where: { vendorId: vendor.id, depositCents: { gt: 0 }, depositStatus: { not: "NONE" } },
      select: { vendorId: true, depositCents: true, depositStatus: true, ref: true, createdAt: true, customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.payout.findMany({ where: { vendorId: vendor.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const bal = vendorBalance(deposits, payouts.map((p) => p.amountCents));
  return (
    <main className="main">
      <SubHead back="/vendor/money" backLabel="Money" title="Payouts" />
      {vendor.level === "BASIC" ? (
        <div className="fill">Basic shops don&apos;t take deposits, so there&apos;s nothing to pay out. <Link href="/vendor/account"><b>Become Verified</b></Link> to take deposits.</div>
      ) : (
        <>
          <div className="stub dark">
            <span className="l"><span className="k">Due to you</span><span className="t mono" style={{ fontSize: 28 }}>{rand(bal.due)}</span><span className="s" style={{ color: "inherit", opacity: 0.7 }}>Paid into {vendor.bankAccountNo ? `${vendor.bankName} ····${vendor.bankAccountNo.slice(-4)}` : "your bank account (add it in Account)"}</span></span>
            <span className="r"><span><b>{payouts.length}</b><span>payouts</span></span></span>
          </div>
          <div className="stat">
            <div><b className="mono" style={{ fontSize: 18 }}>{rand(bal.owed)}</b><span>earned from deposits</span></div>
            <div><b className="mono" style={{ fontSize: 18 }}>{rand(bal.paidOut)}</b><span>paid out</span></div>
            <div><b className="mono" style={{ fontSize: 18 }}>{rand(bal.held)}</b><span>held for visits</span></div>
          </div>

          <h3>Paid to you</h3>
          {payouts.length === 0 && <p className="muted">No payouts yet.</p>}
          <div className="list">
            {payouts.map((p) => (
              <div key={p.id} className="li"><span className="grow"><b className="mono">{rand(p.amountCents)}</b><span>{shortDate(p.createdAt)}{p.reference ? ` · ref ${p.reference}` : ""}</span></span><span className="pill ok">Paid</span></div>
            ))}
          </div>

          <h3>Deposits</h3>
          {deposits.length === 0 && <p className="muted">No deposits yet.</p>}
          <div className="list">
            {deposits.slice(0, 50).map((d) => (
              <div key={d.ref} className="li"><span className="grow"><b>{d.customer?.name ?? "Customer"} · <span className="mono">{rand(d.depositCents)}</span></b><span>{shortDate(d.createdAt)} · #{d.ref} · {LINE[d.depositStatus] ?? d.depositStatus}</span></span></div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
