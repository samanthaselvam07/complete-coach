CREATE TABLE "supplement_coach_details" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "supplement_id" TEXT NOT NULL,
  "coach_dosage_instructions" TEXT,
  "coach_notes" TEXT,
  "affiliate_link" TEXT,
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "supplement_coach_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplement_coach_details_organization_id_supplement_id_key" ON "supplement_coach_details" ("organization_id", "supplement_id");
CREATE INDEX "supplement_coach_details_supplement_id_idx" ON "supplement_coach_details" ("supplement_id");
CREATE INDEX "supplement_coach_details_created_by_user_id_idx" ON "supplement_coach_details" ("created_by_user_id");
CREATE INDEX "supplement_coach_details_updated_by_user_id_idx" ON "supplement_coach_details" ("updated_by_user_id");

ALTER TABLE "supplement_coach_details" ADD CONSTRAINT "supplement_coach_details_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplement_coach_details" ADD CONSTRAINT "supplement_coach_details_supplement_id_fkey" FOREIGN KEY ("supplement_id") REFERENCES "supplement_library_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplement_coach_details" ADD CONSTRAINT "supplement_coach_details_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplement_coach_details" ADD CONSTRAINT "supplement_coach_details_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
