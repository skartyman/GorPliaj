-- AlterTable
ALTER TABLE "TicketOrder" ADD COLUMN "downloadToken" TEXT;

-- Backfill existing orders before making the token required.
UPDATE "TicketOrder"
SET "downloadToken" = md5(random()::text || clock_timestamp()::text || "id"::text)
WHERE "downloadToken" IS NULL;

ALTER TABLE "TicketOrder" ALTER COLUMN "downloadToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TicketOrder_downloadToken_key" ON "TicketOrder"("downloadToken");
