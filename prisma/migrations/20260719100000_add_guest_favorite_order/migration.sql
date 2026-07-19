-- CreateTable
CREATE TABLE "GuestFavoriteOrder" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestFavoriteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestFavoriteOrder_guestId_idx" ON "GuestFavoriteOrder"("guestId");

-- AddForeignKey
ALTER TABLE "GuestFavoriteOrder" ADD CONSTRAINT "GuestFavoriteOrder_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
