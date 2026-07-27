CREATE TABLE "client_roadmap_phases" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_roadmap_phases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_roadmap_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "phase_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_roadmap_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_roadmap_phases_organization_id_client_id_start_date_idx" ON "client_roadmap_phases"("organization_id", "client_id", "start_date");
CREATE INDEX "client_roadmap_phases_organization_id_client_id_status_idx" ON "client_roadmap_phases"("organization_id", "client_id", "status");
CREATE INDEX "client_roadmap_items_organization_id_client_id_event_date_idx" ON "client_roadmap_items"("organization_id", "client_id", "event_date");
CREATE INDEX "client_roadmap_items_organization_id_phase_id_idx" ON "client_roadmap_items"("organization_id", "phase_id");

ALTER TABLE "client_roadmap_phases" ADD CONSTRAINT "client_roadmap_phases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_roadmap_phases" ADD CONSTRAINT "client_roadmap_phases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_roadmap_items" ADD CONSTRAINT "client_roadmap_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_roadmap_items" ADD CONSTRAINT "client_roadmap_items_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_roadmap_items" ADD CONSTRAINT "client_roadmap_items_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "client_roadmap_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
