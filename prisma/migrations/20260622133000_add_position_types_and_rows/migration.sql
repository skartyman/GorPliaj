-- Create PositionType table
CREATE TABLE "PositionType" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "code" TEXT NOT NULL,
    "requiresSide" BOOLEAN NOT NULL DEFAULT false,
    "bookingKind" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PositionType_value_key" ON "PositionType"("value");

-- Create BeachRow table
CREATE TABLE "BeachRow" (
    "id" SERIAL NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeachRow_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BeachRow" ADD CONSTRAINT "BeachRow_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Alter VenueTable: convert positionType enum to text
ALTER TABLE "VenueTable" ALTER COLUMN "positionType" TYPE TEXT;

-- Alter VenueTable: add rowId column
ALTER TABLE "VenueTable" ADD COLUMN "rowId" INTEGER;

ALTER TABLE "VenueTable" ADD CONSTRAINT "VenueTable_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "BeachRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the now-unused enum
DROP TYPE IF EXISTS "VenuePositionType";
