ALTER TABLE "MenuItem"
ADD COLUMN "likesCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "MenuItem_likesCount_idx" ON "MenuItem"("likesCount");
