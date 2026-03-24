-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventCtaType" AS ENUM ('BOOKING', 'TICKETS', 'BOTH');

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_mapId_fkey";

-- AlterTable
ALTER TABLE "Event"
  DROP COLUMN IF EXISTS "mapId",
  DROP COLUMN IF EXISTS "name",
  DROP COLUMN IF EXISTS "description",
  ADD COLUMN "title" TEXT,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "fullDescription" TEXT,
  ADD COLUMN "posterImage" TEXT,
  ALTER COLUMN "endAt" DROP NOT NULL,
  ADD COLUMN "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ctaType" "EventCtaType" NOT NULL DEFAULT 'BOOKING',
  ADD COLUMN "ticketUrl" TEXT;

-- Backfill from old schema where possible
UPDATE "Event"
SET
  "title" = COALESCE("title", 'Event #' || "id"),
  "slug" = COALESCE("slug", 'event-' || "id");

ALTER TABLE "Event"
  ALTER COLUMN "title" SET NOT NULL,
  ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_slug_idx" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_startAt_idx" ON "Event"("startAt");

-- CreateIndex
CREATE INDEX "Event_isFeatured_idx" ON "Event"("isFeatured");
