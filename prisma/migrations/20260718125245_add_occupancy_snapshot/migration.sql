-- CreateTable
CREATE TABLE "OccupancySnapshot" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "beachOccupied" INTEGER NOT NULL DEFAULT 0,
    "beachCapacity" INTEGER NOT NULL DEFAULT 0,
    "beachPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "beachGuests" INTEGER NOT NULL DEFAULT 0,
    "tableOccupied" INTEGER NOT NULL DEFAULT 0,
    "tableCapacity" INTEGER NOT NULL DEFAULT 0,
    "tablePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tableGuests" INTEGER NOT NULL DEFAULT 0,
    "eveningEvents" INTEGER NOT NULL DEFAULT 0,
    "totalGuests" INTEGER NOT NULL DEFAULT 0,
    "onPremises" INTEGER NOT NULL DEFAULT 0,
    "arrived" INTEGER NOT NULL DEFAULT 0,
    "totalReservations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccupancySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OccupancySnapshot_date_key" ON "OccupancySnapshot"("date");

-- CreateIndex
CREATE INDEX "OccupancySnapshot_date_idx" ON "OccupancySnapshot"("date");
