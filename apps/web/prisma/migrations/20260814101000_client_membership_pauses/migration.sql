ALTER TABLE "client_subscriptions"
  ADD COLUMN "pause_start_at" TIMESTAMPTZ(6),
  ADD COLUMN "pause_resume_at" TIMESTAMPTZ(6);

CREATE INDEX "client_subscriptions_organization_id_status_pause_window_idx"
  ON "client_subscriptions" ("organization_id", "status", "pause_start_at", "pause_resume_at");
