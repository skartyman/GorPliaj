-- CreateTable
CREATE TABLE "VenueTableOverride" (
    "id" SERIAL NOT NULL,
    "tableId" INTEGER NOT NULL,
    "eventId" INTEGER,
    "ruleDate" TIMESTAMP(3),
    "deposit" DECIMAL(10,2),
    "isActive" BOOLEAN,
    "isBookable" BOOLEAN,
    "photoUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueTableOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueTableOverride_tableId_idx" ON "VenueTableOverride"("tableId");

-- CreateIndex
CREATE INDEX "VenueTableOverride_eventId_idx" ON "VenueTableOverride"("eventId");

-- CreateIndex
CREATE INDEX "VenueTableOverride_ruleDate_idx" ON "VenueTableOverride"("ruleDate");

-- CreateIndex
CREATE UNIQUE INDEX "VenueTableOverride_table_event_unique_idx"
ON "VenueTableOverride"("tableId", "eventId")
WHERE "eventId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VenueTableOverride_table_date_unique_idx"
ON "VenueTableOverride"("tableId", "ruleDate")
WHERE "eventId" IS NULL AND "ruleDate" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "VenueTableOverride"
ADD CONSTRAINT "VenueTableOverride_tableId_fkey"
FOREIGN KEY ("tableId") REFERENCES "VenueTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueTableOverride"
ADD CONSTRAINT "VenueTableOverride_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
