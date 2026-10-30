import { describe, expect, it } from "vitest";
import { poolSafeUrl } from "./db-url";

describe("poolSafeUrl", () => {
  const session = "postgresql://postgres.abc:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
  it("limits Supabase pooler links to one connection", () => {
    expect(poolSafeUrl(session)).toBe(`${session}?connection_limit=1&pool_timeout=20`);
  });
  it("adds pgbouncer mode for the transaction pooler", () => {
    expect(poolSafeUrl(session.replace(":5432/", ":6543/"))).toContain("pgbouncer=true");
  });
  it("keeps a link that already sets a limit, and other databases", () => {
    expect(poolSafeUrl(`${session}?connection_limit=3`)).toBe(`${session}?connection_limit=3`);
    expect(poolSafeUrl("postgresql://qless:qless@localhost:5432/qless")).toBe("postgresql://qless:qless@localhost:5432/qless");
    expect(poolSafeUrl(undefined)).toBeUndefined();
  });
});
