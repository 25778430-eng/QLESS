import Link from "next/link";

export function Logo({ size = 34, href = "/" }: { size?: number; href?: string }) {
  return (
    <Link href={href} className="logo" style={{ ["--s" as string]: `${size}px` }} aria-label="Qless home">
      <span className="tile"><i /></span>
      <span className="name">Qless</span>
    </Link>
  );
}
