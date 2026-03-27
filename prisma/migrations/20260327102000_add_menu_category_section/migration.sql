-- CreateEnum
CREATE TYPE "MenuSection" AS ENUM ('KITCHEN', 'BAR');

-- AlterTable
ALTER TABLE "MenuCategory"
ADD COLUMN "section" "MenuSection" NOT NULL DEFAULT 'KITCHEN';

-- CreateIndex
CREATE INDEX "MenuCategory_section_idx" ON "MenuCategory"("section");
