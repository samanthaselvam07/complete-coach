CREATE TABLE "coach_profiles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "professional_title" TEXT,
  "phone" TEXT,
  "photo_file_name" TEXT,
  "bio" TEXT,
  "philosophy" TEXT,
  "specialities_json" JSONB,
  "credentials_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "coach_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coach_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "coach_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "coach_profiles_organization_id_user_id_key" ON "coach_profiles"("organization_id", "user_id");
CREATE INDEX "coach_profiles_user_id_idx" ON "coach_profiles"("user_id");
