-- CreateEnum
CREATE TYPE "MapUsageMode" AS ENUM ('DAY', 'EVENING', 'EVENT');

-- CreateEnum
CREATE TYPE "BookingKind" AS ENUM ('TABLE', 'BEACH');

-- AlterTable
ALTER TABLE "Map"
ADD COLUMN "usageMode" "MapUsageMode" NOT NULL DEFAULT 'DAY';

-- AlterTable
ALTER TABLE "VenueTable"
ADD COLUMN "bookingKind" "BookingKind" NOT NULL DEFAULT 'TABLE',
ADD COLUMN "serviceName" JSONB,
ADD COLUMN "serviceDescription" JSONB,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Reservation"
ADD COLUMN "bookingKind" "BookingKind" NOT NULL DEFAULT 'TABLE';

-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "preferredMapUsageMode" "MapUsageMode";

-- Backfill beach-oriented positions
UPDATE "VenueTable"
SET "bookingKind" = 'BEACH'
WHERE "positionType" IN ('BUNGALOW', 'KROVAT', 'PIER');

-- Backfill obvious evening/event maps by slug
UPDATE "Map"
SET "usageMode" = 'EVENING'
WHERE LOWER("slug") LIKE '%night%'
   OR LOWER("slug") LIKE '%evening%'
   OR LOWER("slug") LIKE '%event%'
   OR LOWER("slug") LIKE '%concert%';

-- CreateIndex
CREATE INDEX "Map_usageMode_idx" ON "Map"("usageMode");

-- CreateIndex
CREATE INDEX "VenueTable_bookingKind_idx" ON "VenueTable"("bookingKind");

-- CreateIndex
CREATE INDEX "VenueTable_sortOrder_idx" ON "VenueTable"("sortOrder");

-- CreateIndex
CREATE INDEX "Reservation_bookingKind_idx" ON "Reservation"("bookingKind");

-- CreateIndex
CREATE INDEX "Event_preferredMapUsageMode_idx" ON "Event"("preferredMapUsageMode");
