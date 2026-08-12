UPDATE "forms"
SET "status" = 'published'::"form_status"
WHERE "status" = 'draft'::"form_status";

ALTER TABLE "forms"
ALTER COLUMN "status" SET DEFAULT 'published'::"form_status";
