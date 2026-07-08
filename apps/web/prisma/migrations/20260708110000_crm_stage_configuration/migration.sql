-- Store organization-scoped CRM stage configuration so pipeline labels,
-- colours, and custom stages are durable and isolated per organization.
CREATE TABLE "crm_stages" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT 'gray',
  "position" INTEGER NOT NULL DEFAULT 0,
  "default_stage" "lead_stage",
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "crm_stages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "leads" ADD COLUMN "crm_stage_slug" TEXT;

CREATE UNIQUE INDEX "crm_stages_organization_id_slug_key" ON "crm_stages"("organization_id", "slug");
CREATE INDEX "crm_stages_organization_id_position_idx" ON "crm_stages"("organization_id", "position");
CREATE INDEX "leads_organization_id_crm_stage_slug_idx" ON "leads"("organization_id", "crm_stage_slug");

ALTER TABLE "crm_stages"
  ADD CONSTRAINT "crm_stages_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
