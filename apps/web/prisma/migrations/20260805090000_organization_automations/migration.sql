CREATE TABLE "organization_automations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "delay_amount" INTEGER NOT NULL DEFAULT 0,
    "delay_interval" TEXT NOT NULL DEFAULT 'Minutes',
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organization_automations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_automations_organization_id_trigger_key" ON "organization_automations"("organization_id", "trigger");
CREATE INDEX "organization_automations_organization_id_email_enabled_idx" ON "organization_automations"("organization_id", "email_enabled");
CREATE INDEX "organization_automations_created_by_user_id_idx" ON "organization_automations"("created_by_user_id");

ALTER TABLE "organization_automations" ADD CONSTRAINT "organization_automations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_automations" ADD CONSTRAINT "organization_automations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
