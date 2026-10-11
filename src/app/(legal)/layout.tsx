import { Logo } from "@/components/Logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <Logo />
      </header>
      <main className="main legal">{children}</main>
    </>
  );
}
