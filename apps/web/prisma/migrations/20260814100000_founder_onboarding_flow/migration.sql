ALTER TABLE "organizations"
  ADD COLUMN "founder_onboarding_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "founder_onboarding_completed_at" TIMESTAMPTZ(6),
  ADD COLUMN "founder_onboarding_focus" TEXT,
  ADD COLUMN "founder_onboarding_roster_size" TEXT,
  ADD COLUMN "founder_onboarding_platform" TEXT,
  ADD COLUMN "founder_onboarding_other_platform" TEXT;

CREATE INDEX "organizations_founder_onboarding_required_founder_onboarding_completed_at_idx"
  ON "organizations"("founder_onboarding_required", "founder_onboarding_completed_at");
