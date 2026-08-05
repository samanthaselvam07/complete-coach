CREATE TABLE "client_workout_sessions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "assignment_id" TEXT,
  "assignment_name" TEXT NOT NULL,
  "day_id" TEXT,
  "day_name" TEXT NOT NULL,
  "started_at" TIMESTAMPTZ(6) NOT NULL,
  "completed_at" TIMESTAMPTZ(6) NOT NULL,
  "duration_seconds" INTEGER NOT NULL DEFAULT 0,
  "exercises_json" JSONB NOT NULL,
  "personal_bests_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "client_workout_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_workout_sessions_organization_id_client_id_completed_at_idx"
  ON "client_workout_sessions"("organization_id", "client_id", "completed_at");

CREATE INDEX "client_workout_sessions_organization_id_client_id_assignment_name_day_name_idx"
  ON "client_workout_sessions"("organization_id", "client_id", "assignment_name", "day_name");

ALTER TABLE "client_workout_sessions"
  ADD CONSTRAINT "client_workout_sessions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_workout_sessions"
  ADD CONSTRAINT "client_workout_sessions_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
