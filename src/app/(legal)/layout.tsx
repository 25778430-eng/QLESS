import { Logo } from "@/components/Logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <Logo />
      </header>
      <main className="main legal">
        {children}
        <p className="small muted legal-foot">
          <a href="/help">Help</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/paia">PAIA manual</a> ·{" "}
          <a href="/vendor-agreement">Vendor data agreement</a>
        </p>
      </main>
    </>
  );
}
