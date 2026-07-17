CREATE TYPE "EventAdmissionMode" AS ENUM ('FREE', 'TICKETED');

ALTER TABLE "EventSession"
ADD COLUMN "admissionMode" "EventAdmissionMode" NOT NULL DEFAULT 'TICKETED';
