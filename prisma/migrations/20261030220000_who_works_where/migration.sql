-- A readable list of who works where, for looking at in the Supabase table editor.
-- One row per shop owner and per staff member, with the shop's name instead of ids.
CREATE VIEW "WhoWorksWhere" WITH (security_invoker = true) AS
SELECT v."name" AS "shop", 'Owner' AS "role", u."name" AS "person", u."phone" AS "cellphone",
       CASE WHEN v."status" = 'APPROVED' THEN 'Active' ELSE initcap(v."status"::text) END AS "status",
       v."openTime" || ' to ' || v."closeTime" AS "hours", v."id" AS "vendorId"
FROM "Vendor" v
JOIN "User" u ON u."id" = v."ownerId"
UNION ALL
SELECT v."name", 'Staff', s."name", s."phone",
       CASE WHEN s."active" THEN 'Active' ELSE 'Removed' END,
       COALESCE(s."startTime", v."openTime") || ' to ' || COALESCE(s."endTime", v."closeTime"), v."id"
FROM "Staff" s
JOIN "Vendor" v ON v."id" = s."vendorId";

-- Keep it away from Supabase's public API keys, like the tables.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "WhoWorksWhere" FROM anon, authenticated;
  END IF;
END $$;
