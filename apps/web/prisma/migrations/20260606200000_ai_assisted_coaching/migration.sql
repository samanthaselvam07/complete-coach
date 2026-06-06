CREATE TYPE "ai_workflow_type" AS ENUM (
  'check-in-review',
  'message-draft',
  'resource-recommendation',
  'extraction-enhancement'
);

CREATE TYPE "ai_generation_status" AS ENUM (
  'running',
  'succeeded',
  'failed'
);

CREATE TYPE "ai_output_type" AS ENUM (
  'check-in-summary',
  'risk-flag',
  'workout-suggestion',
  'nutrition-suggestion',
  'message-draft',
  'resource-recommendation',
  'extraction-enhancement'
);

CREATE TYPE "ai_output_status" AS ENUM (
  'pending-approval',
  'approved',
  'rejected',
  'applied',
  'discarded'
);

CREATE TABLE "ai_prompt_versions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "workflow" "ai_workflow_type" NOT NULL,
  "version" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "system_prompt" TEXT NOT NULL,
  "user_prompt_template" TEXT NOT NULL,
  "output_schema" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_prompt_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_generations" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "workflow" "ai_workflow_type" NOT NULL,
  "status" "ai_generation_status" NOT NULL DEFAULT 'running',
  "prompt_version_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "client_id" TEXT,
  "target_type" TEXT,
  "target_id" TEXT,
  "input_hash" TEXT NOT NULL,
  "input_summary" JSONB NOT NULL,
  "redacted_input" JSONB,
  "output_json" JSONB,
  "error_message" TEXT,
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  "estimated_cost_cents" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "requested_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_outputs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "generation_id" TEXT NOT NULL,
  "client_id" TEXT,
  "target_type" TEXT,
  "target_id" TEXT,
  "type" "ai_output_type" NOT NULL,
  "status" "ai_output_status" NOT NULL DEFAULT 'pending-approval',
  "severity" TEXT,
  "title" TEXT NOT NULL,
  "content_markdown" TEXT NOT NULL,
  "data_json" JSONB,
  "requires_approval" BOOLEAN NOT NULL DEFAULT true,
  "approved_by_user_id" TEXT,
  "approved_at" TIMESTAMPTZ(6),
  "rejected_by_user_id" TEXT,
  "rejected_at" TIMESTAMPTZ(6),
  "rejection_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "ai_outputs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_prompt_versions_organization_id_workflow_version_key"
  ON "ai_prompt_versions"("organization_id", "workflow", "version");

CREATE INDEX "ai_prompt_versions_organization_id_workflow_is_active_idx"
  ON "ai_prompt_versions"("organization_id", "workflow", "is_active");

CREATE INDEX "ai_prompt_versions_created_by_user_id_idx"
  ON "ai_prompt_versions"("created_by_user_id");

CREATE INDEX "ai_generations_organization_id_workflow_created_at_idx"
  ON "ai_generations"("organization_id", "workflow", "created_at");

CREATE INDEX "ai_generations_organization_id_client_id_created_at_idx"
  ON "ai_generations"("organization_id", "client_id", "created_at");

CREATE INDEX "ai_generations_organization_id_target_type_target_id_idx"
  ON "ai_generations"("organization_id", "target_type", "target_id");

CREATE INDEX "ai_generations_prompt_version_id_idx"
  ON "ai_generations"("prompt_version_id");

CREATE INDEX "ai_generations_requested_by_user_id_idx"
  ON "ai_generations"("requested_by_user_id");

CREATE INDEX "ai_outputs_organization_id_status_created_at_idx"
  ON "ai_outputs"("organization_id", "status", "created_at");

CREATE INDEX "ai_outputs_organization_id_client_id_status_idx"
  ON "ai_outputs"("organization_id", "client_id", "status");

CREATE INDEX "ai_outputs_organization_id_target_type_target_id_idx"
  ON "ai_outputs"("organization_id", "target_type", "target_id");

CREATE INDEX "ai_outputs_generation_id_idx"
  ON "ai_outputs"("generation_id");

CREATE INDEX "ai_outputs_approved_by_user_id_idx"
  ON "ai_outputs"("approved_by_user_id");

CREATE INDEX "ai_outputs_rejected_by_user_id_idx"
  ON "ai_outputs"("rejected_by_user_id");

ALTER TABLE "ai_prompt_versions"
  ADD CONSTRAINT "ai_prompt_versions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_prompt_versions"
  ADD CONSTRAINT "ai_prompt_versions_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_generations"
  ADD CONSTRAINT "ai_generations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generations"
  ADD CONSTRAINT "ai_generations_prompt_version_id_fkey"
  FOREIGN KEY ("prompt_version_id") REFERENCES "ai_prompt_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_generations"
  ADD CONSTRAINT "ai_generations_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generations"
  ADD CONSTRAINT "ai_generations_requested_by_user_id_fkey"
  FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_outputs"
  ADD CONSTRAINT "ai_outputs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_outputs"
  ADD CONSTRAINT "ai_outputs_generation_id_fkey"
  FOREIGN KEY ("generation_id") REFERENCES "ai_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_outputs"
  ADD CONSTRAINT "ai_outputs_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_outputs"
  ADD CONSTRAINT "ai_outputs_approved_by_user_id_fkey"
  FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_outputs"
  ADD CONSTRAINT "ai_outputs_rejected_by_user_id_fkey"
  FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
