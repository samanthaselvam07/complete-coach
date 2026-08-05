CREATE TABLE "client_calendar_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT true,
    "event_time" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_count" INTEGER,
    "recurrence_ends_on" DATE,
    "recurrence_days" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "goal" TEXT,
    "notes" TEXT,
    "meeting_url" TEXT,
    "roadmap_phase_id" TEXT,
    "scheduled_training_program_id" TEXT,
    "scheduled_training_program_name" TEXT,
    "scheduled_training_day_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_calendar_events_organization_id_client_id_start_date_idx" ON "client_calendar_events"("organization_id", "client_id", "start_date");
CREATE INDEX "client_calendar_events_organization_id_client_id_type_idx" ON "client_calendar_events"("organization_id", "client_id", "type");
CREATE INDEX "client_calendar_events_organization_id_roadmap_phase_id_idx" ON "client_calendar_events"("organization_id", "roadmap_phase_id");

ALTER TABLE "client_calendar_events" ADD CONSTRAINT "client_calendar_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_calendar_events" ADD CONSTRAINT "client_calendar_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_calendar_events" ADD CONSTRAINT "client_calendar_events_roadmap_phase_id_fkey" FOREIGN KEY ("roadmap_phase_id") REFERENCES "client_roadmap_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
