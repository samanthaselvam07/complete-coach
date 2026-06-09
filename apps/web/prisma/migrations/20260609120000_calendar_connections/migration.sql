CREATE TYPE "calendar_provider" AS ENUM ('apple', 'google', 'outlook');

CREATE TYPE "calendar_connection_scope" AS ENUM ('organization', 'coach');

CREATE TYPE "calendar_connection_status" AS ENUM ('pending', 'active', 'revoked', 'error');

CREATE TABLE "calendar_connections" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "provider" "calendar_provider" NOT NULL,
  "scope" "calendar_connection_scope" NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "account_name" TEXT NOT NULL,
  "calendar_name" TEXT,
  "scopes" TEXT[],
  "status" "calendar_connection_status" NOT NULL DEFAULT 'active',
  "encrypted_access_token" TEXT,
  "encrypted_refresh_token" TEXT,
  "token_expires_at" TIMESTAMPTZ(6),
  "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(6),
  "last_error" TEXT,
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_oauth_states" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "created_by_user_id" TEXT NOT NULL,
  "provider" "calendar_provider" NOT NULL,
  "scope" "calendar_connection_scope" NOT NULL,
  "state_hash" TEXT NOT NULL,
  "code_verifier" TEXT,
  "redirect_to" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "calendar_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_connections_org_scope_provider_account_user_key"
  ON "calendar_connections"("organization_id", "scope", "provider", "provider_account_id", "created_by_user_id");

CREATE INDEX "calendar_connections_org_scope_status_idx"
  ON "calendar_connections"("organization_id", "scope", "status");

CREATE INDEX "calendar_connections_created_by_user_id_idx"
  ON "calendar_connections"("created_by_user_id");

CREATE UNIQUE INDEX "calendar_oauth_states_state_hash_key"
  ON "calendar_oauth_states"("state_hash");

CREATE INDEX "calendar_oauth_states_org_scope_provider_created_at_idx"
  ON "calendar_oauth_states"("organization_id", "scope", "provider", "created_at");

CREATE INDEX "calendar_oauth_states_expires_at_idx"
  ON "calendar_oauth_states"("expires_at");

ALTER TABLE "calendar_connections"
  ADD CONSTRAINT "calendar_connections_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_connections"
  ADD CONSTRAINT "calendar_connections_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "calendar_oauth_states"
  ADD CONSTRAINT "calendar_oauth_states_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_oauth_states"
  ADD CONSTRAINT "calendar_oauth_states_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
