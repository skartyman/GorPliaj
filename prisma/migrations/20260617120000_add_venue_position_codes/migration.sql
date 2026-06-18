CREATE TYPE "VenuePositionType" AS ENUM ('BUNGALOW', 'KROVAT', 'PIER', 'RESTAURANT', 'TERRACE');

CREATE TYPE "VenuePositionSide" AS ENUM ('LEFT', 'RIGHT');

ALTER TABLE "VenueTable"
  ADD COLUMN "positionType" "VenuePositionType",
  ADD COLUMN "positionSide" "VenuePositionSide";
