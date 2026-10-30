// Each Vercel function instance opens its own database pool. Supabase's pooler only allows a few connections,
// so several instances with Prisma's default pool (about 5 each) run out and every page fails with
// "Max client connections reached". One connection per instance keeps well under the limit.

export function poolSafeUrl(url: string | undefined): string | undefined {
  if (!url || !/pooler\.supabase\.com/.test(url) || /[?&]connection_limit=/.test(url)) return url;
  const extra = "connection_limit=1&pool_timeout=20" + (/:6543\//.test(url) && !/pgbouncer=/.test(url) ? "&pgbouncer=true" : "");
  return url + (url.includes("?") ? "&" : "?") + extra;
}
