ALTER TABLE "clients"
  ADD COLUMN "requires_online_payment" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "client_profiles"
  ADD COLUMN "weight_measurement" TEXT,
  ADD COLUMN "check_in_frequency" TEXT,
  ADD COLUMN "check_in_days" JSONB,
  ADD COLUMN "default_exercise_metric_unit" TEXT;
