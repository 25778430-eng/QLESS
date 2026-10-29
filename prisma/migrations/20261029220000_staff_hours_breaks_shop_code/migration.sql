-- Staff hours and breaks
ALTER TABLE "Staff" ADD COLUMN "workDays" TEXT NOT NULL DEFAULT '1111111';
ALTER TABLE "Staff" ADD COLUMN "startTime" TEXT;
ALTER TABLE "Staff" ADD COLUMN "endTime" TEXT;
ALTER TABLE "Staff" ADD COLUMN "lunchStart" TEXT;
ALTER TABLE "Staff" ADD COLUMN "lunchEnd" TEXT;
ALTER TABLE "Staff" ADD COLUMN "breakUntil" TIMESTAMP(3);

-- Shop code printed under the QR poster
ALTER TABLE "Vendor" ADD COLUMN "code" TEXT;
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");

-- Give every existing shop a code. md5 is hex, so codes never contain O or I.
UPDATE "Vendor" SET "code" = upper(substr(md5("id" || random()::text), 1, 6)) WHERE "code" IS NULL;
