"use client";
export function PrintButton() {
  return <button className="btn noprint" type="button" onClick={() => window.print()}>Print poster</button>;
}
