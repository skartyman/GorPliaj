ALTER TABLE "Reservation"
ADD COLUMN "bookingGroupId" TEXT,
ADD COLUMN "isGroupLead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "groupGuestCount" INTEGER;

CREATE INDEX "Reservation_bookingGroupId_idx" ON "Reservation"("bookingGroupId");
