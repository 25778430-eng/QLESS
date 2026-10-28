-- AlterTable
ALTER TABLE "User" ADD COLUMN "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Everyone who is an admin today keeps full access, so nobody is locked out of the settings.
UPDATE "User" SET "superAdmin" = true WHERE "role" = 'ADMIN';
