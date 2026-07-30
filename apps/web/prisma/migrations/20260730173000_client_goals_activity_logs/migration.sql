CREATE TYPE "client_account_activity_type" AS ENUM (
  'training_plan_updated',
  'nutrition_plan_updated',
  'supplement_plan_updated',
  'billing_started',
  'billing_paused',
  'billing_failed',
  'billing_cancelled',
  'client_goal_created',
  'client_profile_target_updated'
);

CREATE TABLE "client_goals" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "roadmap_phase_id" TEXT,
  "title" TEXT NOT NULL,
  "target_date" DATE NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "client_goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_account_activity_logs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "type" "client_account_activity_type" NOT NULL,
  "title" TEXT NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "client_account_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_goals_organization_id_client_id_target_date_idx"
  ON "client_goals"("organization_id", "client_id", "target_date");

CREATE INDEX "client_goals_organization_id_roadmap_phase_id_idx"
  ON "client_goals"("organization_id", "roadmap_phase_id");

CREATE INDEX "client_account_activity_logs_organization_id_client_id_occurred_at_idx"
  ON "client_account_activity_logs"("organization_id", "client_id", "occurred_at");

CREATE INDEX "client_account_activity_logs_organization_id_type_occurred_at_idx"
  ON "client_account_activity_logs"("organization_id", "type", "occurred_at");

CREATE INDEX "client_account_activity_logs_actor_user_id_idx"
  ON "client_account_activity_logs"("actor_user_id");

ALTER TABLE "client_goals"
  ADD CONSTRAINT "client_goals_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_goals"
  ADD CONSTRAINT "client_goals_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_goals"
  ADD CONSTRAINT "client_goals_roadmap_phase_id_fkey"
  FOREIGN KEY ("roadmap_phase_id") REFERENCES "client_roadmap_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_account_activity_logs"
  ADD CONSTRAINT "client_account_activity_logs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_account_activity_logs"
  ADD CONSTRAINT "client_account_activity_logs_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_account_activity_logs"
  ADD CONSTRAINT "client_account_activity_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
