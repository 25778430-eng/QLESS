-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "durationMins" INTEGER,
ADD COLUMN     "extras" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "extrasCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "item" TEXT,
ADD COLUMN     "jobStage" TEXT,
ADD COLUMN     "optionLabel" TEXT,
ADD COLUMN     "plate" TEXT,
ADD COLUMN     "quoteApproved" BOOLEAN,
ADD COLUMN     "quoteCents" INTEGER,
ADD COLUMN     "quoteNote" TEXT,
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "ticketNo" TEXT,
ADD COLUMN     "walkInPhone" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "bring" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isExtra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "options" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "ticketLetter" TEXT;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "cleanupAt" TIMESTAMP(3),
ADD COLUMN     "disabledTypes" TEXT[] DEFAULT ARRAY['GOVERNMENT']::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lang" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "businessType" TEXT NOT NULL DEFAULT 'SALON',
ADD COLUMN     "tvKey" TEXT;

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payout_vendorId_createdAt_idx" ON "Payout"("vendorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Existing shops: barbers, nails and hair are SALON (the default); "Other" becomes PRIVATE.
UPDATE "Vendor" SET "businessType" = 'PRIVATE' WHERE "category" = 'Other';
