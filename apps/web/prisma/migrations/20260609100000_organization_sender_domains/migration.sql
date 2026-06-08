CREATE TABLE "organization_sender_domains" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "provider_domain_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "from_local_part" TEXT NOT NULL DEFAULT 'hello',
    "sender_name" TEXT NOT NULL,
    "records_json" JSONB,
    "verified_at" TIMESTAMPTZ(6),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organization_sender_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_sender_domains_organization_id_domain_key"
    ON "organization_sender_domains"("organization_id", "domain");
CREATE INDEX "organization_sender_domains_organization_id_status_idx"
    ON "organization_sender_domains"("organization_id", "status");
CREATE INDEX "organization_sender_domains_provider_domain_id_idx"
    ON "organization_sender_domains"("provider_domain_id");
CREATE INDEX "organization_sender_domains_created_by_user_id_idx"
    ON "organization_sender_domains"("created_by_user_id");

ALTER TABLE "organization_sender_domains"
    ADD CONSTRAINT "organization_sender_domains_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_sender_domains"
    ADD CONSTRAINT "organization_sender_domains_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
