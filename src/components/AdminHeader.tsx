import { Logo } from "./Logo";
import { Nav } from "./Nav";
import { ADMIN_NAV } from "./nav-items";

/** Admin pages get the same app shell as the rest of Qless: tabs at the bottom on phones, at the top on laptops. */
export async function AdminHeader(_: { current?: string }) {
  return (
    <>
      <header className="topbar applike"><Logo href="/admin" size={28} /><span className="small muted">Qless HQ</span></header>
      <Nav items={ADMIN_NAV} />
    </>
  );
}
