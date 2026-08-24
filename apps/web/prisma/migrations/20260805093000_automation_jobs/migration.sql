CREATE TYPE "automation_job_status" AS ENUM ('queued', 'processing', 'sent', 'skipped', 'failed');

CREATE TABLE "automation_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" "automation_job_status" NOT NULL DEFAULT 'queued',
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "source" TEXT,
    "source_id" TEXT,
    "metadata" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "email_delivery_id" TEXT,
    "locked_at" TIMESTAMPTZ(6),
    "processed_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "automation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "automation_jobs_organization_id_idempotency_key_key" ON "automation_jobs"("organization_id", "idempotency_key");
CREATE INDEX "automation_jobs_organization_id_status_scheduled_for_idx" ON "automation_jobs"("organization_id", "status", "scheduled_for");
CREATE INDEX "automation_jobs_organization_id_client_id_trigger_scheduled_for_idx" ON "automation_jobs"("organization_id", "client_id", "trigger", "scheduled_for");

ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
