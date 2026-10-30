import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone, shortDate } from "@/lib/format";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { getSettings } from "@/lib/settings";
import { approveVendor, rejectDocument, rejectVendor } from "../actions";
import { DOC_LABEL, requiredDocs } from "@/lib/verification";
import { typeInfo } from "@/lib/business-types";

export const dynamic = "force-dynamic";

/** Shops waiting to go live or to become Verified. Each document is a tile that opens the file. */
export default async function Approvals({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  await requireAdmin();
  const settings = await getSettings();
  const vendors = await db.vendor.findMany({
    where: { OR: [{ status: "PENDING" }, { upgradeRequested: true }] },
    include: { owner: { select: { name: true } }, documents: { select: { id: true, kind: true, status: true, fileName: true, mime: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return (
    <>
      <AdminHeader />
      <main className="main app wide">
        <div className="row between" style={{ alignItems: "flex-end" }}>
          <div className="hello"><small>Qless HQ</small>Approvals</div>
          <span className={`pill ${vendors.length ? "sig" : "ok"}`}>{vendors.length} waiting</span>
        </div>
        <Messages searchParams={searchParams} />
        {vendors.length === 0 && <p className="muted">Nothing waiting. Nice.</p>}
        <div className="cardgrid">
        {vendors.map((v) => {
          const missing = requiredDocs(v.upgradeRequested ? "VERIFIED" : v.level, settings).filter((k) => !v.documents.some((d) => d.kind === k));
          return (
            <div key={v.id} className="acard">
              <div className="row between">
                <b className="grow" style={{ fontSize: 17 }}>{v.name}</b>
                {v.upgradeRequested ? <span className="pill sig">Wants Verified</span> : <span className="pill">New · {v.level === "VERIFIED" ? "Verified" : "Basic"}</span>}
              </div>
              <span className="small muted">{typeInfo(v.businessType).label} · {v.address}</span>
              <span className="small muted">{v.owner.name} · <span className="mono">{prettyPhone(v.phone)}</span> · since {shortDate(v.createdAt)}</span>
              {v.cipc && <span className="small mono">CIPC {v.cipc}</span>}
              {v.bankAccountNo && <span className="small muted">Bank: {v.bankName} · {v.bankAccountName} · <span className="mono">{v.bankAccountNo}</span></span>}
              <div className="doctiles">
                {v.documents.map((d) => (
                  <div key={d.id} className={`doct ${d.status === "REJECTED" ? "bad" : d.status === "APPROVED" ? "ok" : ""}`}>
                    <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener">
                      {d.mime.startsWith("image/")
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={`/api/documents/${d.id}`} alt={DOC_LABEL[d.kind]} loading="lazy" />
                        : <span className="pdf">PDF</span>}
                      <b>{DOC_LABEL[d.kind]}</b>
                    </a>
                    {d.status === "PENDING" ? (
                      <form action={rejectDocument}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className="linkbtn">Ask again</button>
                      </form>
                    ) : (
                      <span className="small">{d.status === "APPROVED" ? "OK" : "Asked again"}</span>
                    )}
                  </div>
                ))}
                {missing.map((k) => <div key={k} className="doct miss"><span className="pdf">Missing</span><b>{DOC_LABEL[k]}</b></div>)}
              </div>
              <form action={approveVendor}><input type="hidden" name="id" value={v.id} /><Submit className="btn">{v.upgradeRequested ? "Make Verified" : "Approve"}</Submit></form>
              <details>
                <summary className="small muted">Reject with a reason</summary>
                <form action={rejectVendor} className="row" style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={v.id} />
                  <input className="i grow" name="reason" placeholder="What they need to fix" />
                  <Submit className="btn sm warn">Reject</Submit>
                </form>
              </details>
            </div>
          );
        })}
        </div>
      </main>
    </>
  );
}
