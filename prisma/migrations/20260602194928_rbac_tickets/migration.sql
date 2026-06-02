/*
  Warnings:

  - The `shortDescription` column on the `Event` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fullDescription` column on the `Event` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `title` column on the `FrontendSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `description` column on the `FrontendSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `keywords` column on the `FrontendSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `address` column on the `FrontendSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `description` column on the `Map` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `label` column on the `MapObject` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `description` column on the `MenuItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `title` on the `Event` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `Map` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `MenuCategory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `MenuItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `title` on the `News` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `body` on the `News` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `VenueTable` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `Zone` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReservationSource" ADD VALUE 'INSTAGRAM';
ALTER TYPE "ReservationSource" ADD VALUE 'FACEBOOK';

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "title",
ADD COLUMN     "title" JSONB NOT NULL,
DROP COLUMN "shortDescription",
ADD COLUMN     "shortDescription" JSONB,
DROP COLUMN "fullDescription",
ADD COLUMN     "fullDescription" JSONB;

-- AlterTable
ALTER TABLE "FrontendSettings" ADD COLUMN     "footerText" JSONB,
ADD COLUMN     "heroSubtitle" JSONB,
ADD COLUMN     "heroTitle" JSONB,
ADD COLUMN     "mapEmbedUrl" TEXT,
DROP COLUMN "title",
ADD COLUMN     "title" JSONB,
DROP COLUMN "description",
ADD COLUMN     "description" JSONB,
DROP COLUMN "keywords",
ADD COLUMN     "keywords" JSONB,
DROP COLUMN "address",
ADD COLUMN     "address" JSONB;

-- AlterTable
ALTER TABLE "Map" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL,
DROP COLUMN "description",
ADD COLUMN     "description" JSONB;

-- AlterTable
ALTER TABLE "MapObject" DROP COLUMN "label",
ADD COLUMN     "label" JSONB;

-- AlterTable
ALTER TABLE "MenuCategory" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "MenuItem" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL,
DROP COLUMN "description",
ADD COLUMN     "description" JSONB;

-- AlterTable
ALTER TABLE "News" DROP COLUMN "title",
ADD COLUMN     "title" JSONB NOT NULL,
DROP COLUMN "body",
ADD COLUMN     "body" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "arrivedGuests" INTEGER,
ADD COLUMN     "ticketCode" TEXT;

-- AlterTable
ALTER TABLE "VenueTable" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Zone" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL;
