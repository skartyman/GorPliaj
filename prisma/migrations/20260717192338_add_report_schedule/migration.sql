-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('FINANCIAL', 'RESERVATIONS', 'TICKETS', 'MENU', 'EVENTS', 'STAFF', 'SUMMARY');

-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "frequency" "ReportFrequency" NOT NULL DEFAULT 'WEEKLY',
    "recipientEmail" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dayOfWeek" INTEGER,
    "hour" INTEGER NOT NULL DEFAULT 9,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportSchedule_reportType_idx" ON "ReportSchedule"("reportType");

-- CreateIndex
CREATE INDEX "ReportSchedule_frequency_idx" ON "ReportSchedule"("frequency");

-- CreateIndex
CREATE INDEX "ReportSchedule_isActive_idx" ON "ReportSchedule"("isActive");
