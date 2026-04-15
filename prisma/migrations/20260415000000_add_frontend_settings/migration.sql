-- CreateTable
CREATE TABLE "FrontendSettings" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "keywords" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "workingHours" JSONB,
    "socialMedia" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrontendSettings_pkey" PRIMARY KEY ("id")
);

-- Drop old table if exists (from drift)
DROP TABLE IF EXISTS "SiteSettings";
