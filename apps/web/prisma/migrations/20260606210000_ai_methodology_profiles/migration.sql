CREATE TABLE "ai_methodology_profiles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "methodology" TEXT NOT NULL,
  "description" TEXT,
  "tone" TEXT,
  "principles_json" JSONB NOT NULL DEFAULT '[]',
  "check_in_sections_json" JSONB NOT NULL DEFAULT '[]',
  "red_flag_rules_json" JSONB NOT NULL DEFAULT '[]',
  "adjustment_rules_json" JSONB NOT NULL DEFAULT '[]',
  "forbidden_recommendations_json" JSONB NOT NULL DEFAULT '[]',
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "ai_methodology_profiles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_generations"
  ADD COLUMN "methodology_profile_id" TEXT;

CREATE INDEX "ai_methodology_profiles_organization_id_is_active_is_default_idx"
  ON "ai_methodology_profiles"("organization_id", "is_active", "is_default");

CREATE INDEX "ai_methodology_profiles_organization_id_name_idx"
  ON "ai_methodology_profiles"("organization_id", "name");

CREATE INDEX "ai_methodology_profiles_created_by_user_id_idx"
  ON "ai_methodology_profiles"("created_by_user_id");

CREATE INDEX "ai_generations_methodology_profile_id_idx"
  ON "ai_generations"("methodology_profile_id");

ALTER TABLE "ai_methodology_profiles"
  ADD CONSTRAINT "ai_methodology_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_methodology_profiles"
  ADD CONSTRAINT "ai_methodology_profiles_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_generations"
  ADD CONSTRAINT "ai_generations_methodology_profile_id_fkey"
  FOREIGN KEY ("methodology_profile_id") REFERENCES "ai_methodology_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
