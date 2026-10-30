"use client";
export function PrintButton({ label = "Print poster", auto = false }: { label?: string; auto?: boolean }) {
  // `auto` opens the print dialog as soon as the page loads, for printed walk-in tickets.
  return (
    <>
      {auto && <script dangerouslySetInnerHTML={{ __html: "addEventListener('load',()=>setTimeout(()=>print(),300))" }} />}
      <button className="btn noprint" type="button" onClick={() => window.print()}>{label}</button>
    </>
  );
}
