CREATE TYPE "social_provider" AS ENUM ('meta-instagram', 'meta-facebook', 'x');

CREATE TYPE "social_connection_status" AS ENUM ('active', 'revoked', 'error');

CREATE TYPE "social_post_status" AS ENUM ('draft', 'scheduled', 'queued', 'publishing', 'published', 'failed', 'cancelled');

CREATE TYPE "social_target_status" AS ENUM ('scheduled', 'queued', 'publishing', 'published', 'retrying', 'failed', 'cancelled');

CREATE TABLE "social_connections" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "provider" "social_provider" NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "account_name" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "status" "social_connection_status" NOT NULL DEFAULT 'active',
  "encrypted_access_token" TEXT NOT NULL,
  "encrypted_refresh_token" TEXT,
  "token_expires_at" TIMESTAMPTZ(6),
  "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(6),
  "last_error" TEXT,
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "social_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_oauth_states" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "created_by_user_id" TEXT NOT NULL,
  "provider" "social_provider" NOT NULL,
  "state_hash" TEXT NOT NULL,
  "code_verifier" TEXT,
  "redirect_to" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "social_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_posts" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "media" JSONB NOT NULL DEFAULT '[]',
  "status" "social_post_status" NOT NULL DEFAULT 'draft',
  "scheduled_for" TIMESTAMPTZ(6),
  "published_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_post_targets" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "provider" "social_provider" NOT NULL,
  "status" "social_target_status" NOT NULL DEFAULT 'scheduled',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "provider_post_id" TEXT,
  "last_error" TEXT,
  "next_attempt_at" TIMESTAMPTZ(6),
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "social_post_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_post_attempts" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "status" "social_target_status" NOT NULL,
  "provider_status" INTEGER,
  "provider_response" JSONB,
  "error_code" TEXT,
  "error_message" TEXT,
  "retry_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "social_post_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_analytics_snapshots" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "provider" "social_provider" NOT NULL,
  "provider_post_id" TEXT,
  "metrics" JSONB NOT NULL,
  "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "social_analytics_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_connections_organization_id_provider_provider_account_id_key" ON "social_connections"("organization_id", "provider", "provider_account_id");
CREATE INDEX "social_connections_organization_id_status_idx" ON "social_connections"("organization_id", "status");
CREATE INDEX "social_connections_created_by_user_id_idx" ON "social_connections"("created_by_user_id");

CREATE UNIQUE INDEX "social_oauth_states_state_hash_key" ON "social_oauth_states"("state_hash");
CREATE INDEX "social_oauth_states_organization_id_provider_created_at_idx" ON "social_oauth_states"("organization_id", "provider", "created_at");
CREATE INDEX "social_oauth_states_expires_at_idx" ON "social_oauth_states"("expires_at");

CREATE INDEX "social_posts_organization_id_status_scheduled_for_idx" ON "social_posts"("organization_id", "status", "scheduled_for");
CREATE INDEX "social_posts_created_by_user_id_idx" ON "social_posts"("created_by_user_id");

CREATE UNIQUE INDEX "social_post_targets_post_id_connection_id_key" ON "social_post_targets"("post_id", "connection_id");
CREATE INDEX "social_post_targets_organization_id_status_next_attempt_at_idx" ON "social_post_targets"("organization_id", "status", "next_attempt_at");
CREATE INDEX "social_post_targets_connection_id_status_idx" ON "social_post_targets"("connection_id", "status");

CREATE INDEX "social_post_attempts_organization_id_created_at_idx" ON "social_post_attempts"("organization_id", "created_at");
CREATE INDEX "social_post_attempts_target_id_created_at_idx" ON "social_post_attempts"("target_id", "created_at");

CREATE INDEX "social_analytics_snapshots_organization_id_provider_captured_at_idx" ON "social_analytics_snapshots"("organization_id", "provider", "captured_at");
CREATE INDEX "social_analytics_snapshots_connection_id_captured_at_idx" ON "social_analytics_snapshots"("connection_id", "captured_at");

ALTER TABLE "social_connections"
  ADD CONSTRAINT "social_connections_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_connections"
  ADD CONSTRAINT "social_connections_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "social_oauth_states"
  ADD CONSTRAINT "social_oauth_states_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_oauth_states"
  ADD CONSTRAINT "social_oauth_states_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_posts"
  ADD CONSTRAINT "social_posts_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_posts"
  ADD CONSTRAINT "social_posts_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "social_post_targets"
  ADD CONSTRAINT "social_post_targets_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_post_targets"
  ADD CONSTRAINT "social_post_targets_post_id_fkey"
  FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_post_targets"
  ADD CONSTRAINT "social_post_targets_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "social_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "social_post_attempts"
  ADD CONSTRAINT "social_post_attempts_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_post_attempts"
  ADD CONSTRAINT "social_post_attempts_target_id_fkey"
  FOREIGN KEY ("target_id") REFERENCES "social_post_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_analytics_snapshots"
  ADD CONSTRAINT "social_analytics_snapshots_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_analytics_snapshots"
  ADD CONSTRAINT "social_analytics_snapshots_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "social_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
