CREATE TYPE "client_activity_log_domain" AS ENUM ('training', 'nutrition', 'supplementation');

CREATE TYPE "client_activity_log_status" AS ENUM ('completed', 'missed');

CREATE TABLE "client_activity_logs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "domain" "client_activity_log_domain" NOT NULL,
  "log_date" DATE NOT NULL,
  "status" "client_activity_log_status" NOT NULL DEFAULT 'completed',
  "source_type" TEXT,
  "source_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "client_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_activity_logs_organization_id_client_id_domain_log_date_key"
  ON "client_activity_logs"("organization_id", "client_id", "domain", "log_date");

CREATE INDEX "client_activity_logs_organization_id_client_id_log_date_idx"
  ON "client_activity_logs"("organization_id", "client_id", "log_date");

CREATE INDEX "client_activity_logs_organization_id_domain_log_date_idx"
  ON "client_activity_logs"("organization_id", "domain", "log_date");

ALTER TABLE "client_activity_logs"
  ADD CONSTRAINT "client_activity_logs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_activity_logs"
  ADD CONSTRAINT "client_activity_logs_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
