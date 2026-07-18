-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "onPremises" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onPremisesNote" TEXT;
