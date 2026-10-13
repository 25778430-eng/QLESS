-- CreateEnum
CREATE TYPE "VendorLevel" AS ENUM ('BASIC', 'VERIFIED');

-- CreateEnum
CREATE TYPE "DocKind" AS ENUM ('ID', 'ADDRESS', 'BANK', 'CIPC', 'SELFIE', 'SHOPFRONT');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "allowBasic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireAddress" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireBank" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireCipc" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNo" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "level" "VendorLevel" NOT NULL DEFAULT 'VERIFIED',
ADD COLUMN     "upgradeRequested" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "cipc" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "kind" "DocKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_vendorId_kind_idx" ON "Document"("vendorId", "kind");

-- CreateIndex
CREATE INDEX "Staff_phone_idx" ON "Staff"("phone");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
