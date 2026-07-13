ALTER TABLE "organizations"
  ADD COLUMN "platform_plan" TEXT,
  ADD COLUMN "platform_stripe_customer_id" TEXT,
  ADD COLUMN "platform_stripe_subscription_id" TEXT,
  ADD COLUMN "platform_subscription_status" TEXT,
  ADD COLUMN "platform_current_period_start" TIMESTAMPTZ(6),
  ADD COLUMN "platform_current_period_end" TIMESTAMPTZ(6),
  ADD COLUMN "platform_cancel_at" TIMESTAMPTZ(6);

CREATE INDEX "organizations_platform_plan_idx" ON "organizations"("platform_plan");
CREATE INDEX "organizations_platform_subscription_status_idx" ON "organizations"("platform_subscription_status");
CREATE UNIQUE INDEX "organizations_platform_stripe_customer_id_key" ON "organizations"("platform_stripe_customer_id");
CREATE UNIQUE INDEX "organizations_platform_stripe_subscription_id_key" ON "organizations"("platform_stripe_subscription_id");
