ALTER TABLE "forms" ADD COLUMN "share_slug" TEXT;

UPDATE "forms"
SET "share_slug" = substr(md5("id" || random()::text || clock_timestamp()::text), 1, 24)
WHERE "share_slug" IS NULL;

ALTER TABLE "forms" ALTER COLUMN "share_slug" SET NOT NULL;
ALTER TABLE "forms" ALTER COLUMN "share_slug" SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 24);

CREATE UNIQUE INDEX "forms_organization_id_share_slug_key" ON "forms" ("organization_id", "share_slug");
