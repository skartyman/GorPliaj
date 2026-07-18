-- AlterTable GuestFavoriteUnit: make polymorphic (table OR menuItem favorites)
ALTER TABLE "GuestFavoriteUnit" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'table',
ADD COLUMN "tableId" INTEGER,
ADD COLUMN "menuItemId" INTEGER;

-- Drop old single unique constraint on (guestId, tableId)
ALTER TABLE "GuestFavoriteUnit" DROP CONSTRAINT IF EXISTS "GuestFavoriteUnit_guestId_tableId_key";

-- Recreate as composite with kind
CREATE UNIQUE INDEX "GuestFavoriteUnit_guestId_kind_tableId_key" ON "GuestFavoriteUnit"("guestId", "kind", "tableId");
CREATE UNIQUE INDEX "GuestFavoriteUnit_guestId_kind_menuItemId_key" ON "GuestFavoriteUnit"("guestId", "kind", "menuItemId");

-- Make the original tableId column nullable so menu favorites can leave it null
ALTER TABLE "GuestFavoriteUnit" ALTER COLUMN "tableId" DROP NOT NULL;

-- Keep the old tableId FK (now nullable)
ALTER TABLE "GuestFavoriteUnit" DROP CONSTRAINT IF EXISTS "GuestFavoriteUnit_tableId_fkey";
ALTER TABLE "GuestFavoriteUnit" ADD CONSTRAINT "GuestFavoriteUnit_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "VenueTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add menuItem relation
ALTER TABLE "GuestFavoriteUnit" ADD CONSTRAINT "GuestFavoriteUnit_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for menuItem back-relation
CREATE INDEX "GuestFavoriteUnit_menuItemId_idx" ON "GuestFavoriteUnit"("menuItemId");
