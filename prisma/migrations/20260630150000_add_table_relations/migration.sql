-- First clean up any orphaned references
DELETE FROM "TableOrder" WHERE "tableId" NOT IN (SELECT id FROM "VenueTable");
DELETE FROM "WaiterCall" WHERE "tableId" NOT IN (SELECT id FROM "VenueTable");

-- Add foreign key constraints
ALTER TABLE "TableOrder" ADD CONSTRAINT "TableOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "VenueTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WaiterCall" ADD CONSTRAINT "WaiterCall_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "VenueTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
