CREATE TABLE "MenuCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuItem" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MenuCategory_slug_key" ON "MenuCategory"("slug");
CREATE INDEX "MenuCategory_sortOrder_idx" ON "MenuCategory"("sortOrder");
CREATE INDEX "MenuCategory_isActive_idx" ON "MenuCategory"("isActive");

CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");
CREATE INDEX "MenuItem_sortOrder_idx" ON "MenuItem"("sortOrder");
CREATE INDEX "MenuItem_isActive_idx" ON "MenuItem"("isActive");
CREATE INDEX "MenuItem_isAvailable_idx" ON "MenuItem"("isAvailable");

ALTER TABLE "MenuItem"
ADD CONSTRAINT "MenuItem_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
