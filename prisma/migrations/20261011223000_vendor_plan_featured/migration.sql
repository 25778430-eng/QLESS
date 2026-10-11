-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredRank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "featuredUntil" TIMESTAMP(3),
ADD COLUMN     "planAmountCents" INTEGER,
ADD COLUMN     "planPaidUntil" TIMESTAMP(3),
ADD COLUMN     "planToken" TEXT,
ADD COLUMN     "planWaived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "planOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planOnSince" TIMESTAMP(3),
ADD COLUMN     "planPriceCents" INTEGER NOT NULL DEFAULT 14900,
ADD COLUMN     "planTrialDays" INTEGER NOT NULL DEFAULT 14;

