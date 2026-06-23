-- AlterTable
ALTER TABLE "PositionType" ADD COLUMN     "defaultDeposit" DECIMAL(10,2),
ADD COLUMN     "defaultPrice" DECIMAL(10,2),
ADD COLUMN     "description" JSONB,
ADD COLUMN     "photoUrl" TEXT;
