-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "feeCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "bookingFeeOn" BOOLEAN NOT NULL DEFAULT false,
    "bookingFeeCents" INTEGER NOT NULL DEFAULT 500,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
