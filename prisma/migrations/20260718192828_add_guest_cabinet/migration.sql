-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "guestId" INTEGER;

-- CreateTable
CREATE TABLE "Guest" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestMagicLink" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestMagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestFavoriteUnit" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "tableId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestFavoriteUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guest_email_key" ON "Guest"("email");

-- CreateIndex
CREATE INDEX "Guest_phone_idx" ON "Guest"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "GuestMagicLink_token_key" ON "GuestMagicLink"("token");

-- CreateIndex
CREATE INDEX "GuestMagicLink_guestId_idx" ON "GuestMagicLink"("guestId");

-- CreateIndex
CREATE INDEX "GuestFavoriteUnit_guestId_idx" ON "GuestFavoriteUnit"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestFavoriteUnit_guestId_tableId_key" ON "GuestFavoriteUnit"("guestId", "tableId");

-- CreateIndex
CREATE INDEX "Reservation_guestId_idx" ON "Reservation"("guestId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestMagicLink" ADD CONSTRAINT "GuestMagicLink_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestFavoriteUnit" ADD CONSTRAINT "GuestFavoriteUnit_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestFavoriteUnit" ADD CONSTRAINT "GuestFavoriteUnit_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "VenueTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
