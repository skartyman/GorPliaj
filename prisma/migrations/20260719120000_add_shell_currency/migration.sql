-- CreateEnum
CREATE TYPE "ShellTxType" AS ENUM ('TOPUP', 'EARN', 'SPEND', 'ADJUST');

-- CreateEnum
CREATE TYPE "ShellSource" AS ENUM ('REGISTRATION', 'TICKET_PURCHASE', 'MENU_ORDER', 'TOPUP', 'ADMIN_ADJUSTMENT');

-- AlterTable: Guest
ALTER TABLE "Guest" ADD COLUMN "shellBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable: Payment
ALTER TABLE "Payment" ADD COLUMN "guestId" INTEGER;

-- CreateTable
CREATE TABLE "ShellTransaction" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "type" "ShellTxType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "source" "ShellSource" NOT NULL,
    "description" TEXT,
    "referenceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShellTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShellTransaction_guestId_idx" ON "ShellTransaction"("guestId");

-- CreateIndex
CREATE INDEX "ShellTransaction_createdAt_idx" ON "ShellTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_guestId_idx" ON "Payment"("guestId");

-- AddForeignKey
ALTER TABLE "ShellTransaction" ADD CONSTRAINT "ShellTransaction_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
