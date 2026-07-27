CREATE TABLE "client_notes" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "note_date" DATE NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_notes_organization_id_client_id_note_date_idx"
  ON "client_notes"("organization_id", "client_id", "note_date");

CREATE INDEX "client_notes_organization_id_client_id_created_at_idx"
  ON "client_notes"("organization_id", "client_id", "created_at");

CREATE INDEX "client_notes_author_user_id_idx"
  ON "client_notes"("author_user_id");

ALTER TABLE "client_notes"
  ADD CONSTRAINT "client_notes_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_notes"
  ADD CONSTRAINT "client_notes_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_notes"
  ADD CONSTRAINT "client_notes_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
