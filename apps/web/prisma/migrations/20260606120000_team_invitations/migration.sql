CREATE TYPE "team_invitation_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE "team_invitations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "membership_role" NOT NULL,
    "status" "team_invitation_status" NOT NULL DEFAULT 'pending',
    "token_hash" TEXT NOT NULL,
    "invited_by_user_id" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_invitations_token_hash_key" ON "team_invitations"("token_hash");
CREATE INDEX "team_invitations_organization_id_status_created_at_idx"
    ON "team_invitations"("organization_id", "status", "created_at");
CREATE INDEX "team_invitations_organization_id_email_status_idx"
    ON "team_invitations"("organization_id", "email", "status");
CREATE INDEX "team_invitations_invited_by_user_id_idx"
    ON "team_invitations"("invited_by_user_id");
CREATE INDEX "team_invitations_expires_at_idx" ON "team_invitations"("expires_at");

ALTER TABLE "team_invitations"
    ADD CONSTRAINT "team_invitations_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_invitations"
    ADD CONSTRAINT "team_invitations_invited_by_user_id_fkey"
    FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "rate_limit_buckets" (
    "key_hash" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key_hash")
);

CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets"("expires_at");
