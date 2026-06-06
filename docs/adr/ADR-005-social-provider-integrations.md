# ADR-005: Social Provider Integrations

## Status
Accepted for M11 implementation

## Context
Complete Coach needs real social scheduling and posting without committing provider secrets or storing plaintext OAuth tokens. The first production-ready slice should support the most likely coach channels while leaving room for provider app-review constraints, sandbox differences, and future worker infrastructure.

## Decision
Use direct provider OAuth integrations for Meta Instagram, Meta Facebook, and X. Store provider credentials only in environment variables, persist OAuth tokens encrypted with `AUTH_SECRET`, and expose only redacted connection metadata to the client.

Social posts are stored as tenant-owned records with one target per connected provider account. Scheduled targets become worker-eligible when their scheduled time is due, provider responses are sanitized before persistence, and retryable failures such as provider rate limits move targets to `retrying` with a durable `next_attempt_at`.

Provider posting runs in simulated mode unless `SOCIAL_PROVIDER_MODE=live` is explicitly configured. This lets Vercel/Neon preview environments verify scheduling, auditing, retry, and analytics snapshot flows without real provider app approvals.

## Consequences
Positive:
- Secrets remain environment-only and OAuth tokens are encrypted at rest.
- Tenant isolation is enforced through `organization_id` on every social table.
- Provider failures and rate limits are persisted for operational follow-up.
- Simulated mode supports safe preview testing before provider app review.

Negative:
- Live provider posting still depends on Meta/X app review, scopes, and policy approval.
- Provider-specific media upload/transcoding remains constrained to validation in M11; advanced transcoding should be handled by a later media worker.
- OAuth refresh and provider-side revocation may require provider-specific follow-up once live apps are approved.

Alternatives considered:
- A third-party social scheduling aggregator. Rejected for MVP because it adds vendor lock-in and another secret surface.
- Webhook-first social analytics ingestion. Deferred because provider analytics APIs vary and are often scope/app-review gated.
