ALTER TYPE "package_billing_interval" ADD VALUE IF NOT EXISTS 'weekly';
ALTER TYPE "package_billing_interval" ADD VALUE IF NOT EXISTS 'fortnightly';
ALTER TYPE "package_billing_interval" ADD VALUE IF NOT EXISTS 'annually';
ALTER TYPE "package_billing_interval" ADD VALUE IF NOT EXISTS 'custom';

ALTER TABLE "packages"
  ADD COLUMN "custom_billing_interval_count" INTEGER,
  ADD COLUMN "custom_billing_interval_unit" TEXT,
  ADD COLUMN "term_weeks" INTEGER,
  ADD COLUMN "scheduled_price_amount" INTEGER,
  ADD COLUMN "scheduled_price_currency" TEXT,
  ADD COLUMN "scheduled_price_starts_at" TIMESTAMPTZ(6);
