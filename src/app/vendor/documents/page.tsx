import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { DOC_HINT, DOC_LABEL, optionalDocs, requiredDocs } from "@/lib/verification";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { PhotoInput } from "@/components/PhotoInput";
import { SubHead } from "@/components/SetRow";
import { uploadDocument } from "../actions";
import type { DocKind } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { text: string; kind: string }> = {
  PENDING: { text: "Waiting for check", kind: "sig" },
  APPROVED: { text: "Approved", kind: "ok" },
  REJECTED: { text: "Upload again", kind: "bad" },
};

export default async function Documents({ searchParams }: { searchParams: { error?: string; notice?: string; level?: string } }) {
  const { vendor } = await requireVendor();
  const rules = await getSettings();
  // A Basic shop can preview what Verified needs before asking to upgrade.
  const level = searchParams.level === "VERIFIED" ? "VERIFIED" : vendor.level;
  const docs = await db.document.findMany({ where: { vendorId: vendor.id }, select: { id: true, kind: true, fileName: true, status: true, note: true, createdAt: true } });
  const required = requiredDocs(level, rules);
  const optional = optionalDocs(level, rules);
  const missing = required.filter((k) => !docs.some((d) => d.kind === k));

  const row = (kind: DocKind, req: boolean) => {
    const d = docs.find((x) => x.kind === kind);
    const st = d ? STATUS[d.status] : null;
    return (
      <form key={kind} action={uploadDocument} className={`doc ${d ? "done" : ""}`}>
        <input type="hidden" name="kind" value={kind} />
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <span className="grow"><b>{DOC_LABEL[kind]}</b><br /><span className="small muted">{DOC_HINT[kind]}</span></span>
          {st ? <span className={`pill ${st.kind}`}>{st.text}</span> : <span className="small muted mono">{req ? "REQUIRED" : "OPTIONAL"}</span>}
        </div>
        {d && (
          <span className="row between small">
            <span className="muted ell">{d.fileName} · {shortDate(d.createdAt)}{d.note ? ` · ${d.note}` : ""}</span>
            <a className="btn sm alt" href={`/api/documents/${d.id}`} target="_blank" rel="noopener">View</a>
          </span>
        )}
        {d?.status !== "APPROVED" && (
          <div className="row">
            <PhotoInput name="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture={kind === "SELFIE" ? "user" : undefined} required className="grow" />
            <Submit className="btn sm">{d ? "Replace" : "Upload"}</Submit>
          </div>
        )}
      </form>
    );
  };

  return (
    <main className="main">
      <SubHead back="/vendor/account" backLabel="Account" title="Documents" />
      <p className="small muted">{vendor.name} · {level === "BASIC" ? "Basic" : "Verified"}</p>
      <Messages searchParams={searchParams} />
      <p className="small muted">Photos or PDFs up to 4 MB each (big phone photos are made smaller for you). Only Qless admins can see them, and we delete the files 90 days after we&apos;ve checked them.</p>
      {required.map((k) => row(k, true))}
      {optional.map((k) => row(k, false))}
      {missing.length === 0 ? (
        <div className="notice">All required documents are in. We&apos;ll check them and SMS you.</div>
      ) : (
        <div className="fill small">Still needed: {missing.map((k) => DOC_LABEL[k]).join(", ")}.</div>
      )}
      <Link className="btn alt" href={vendor.status === "APPROVED" ? "/vendor/account" : "/vendor"}>Done</Link>
    </main>
  );
}
