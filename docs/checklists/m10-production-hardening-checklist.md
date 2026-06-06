# M10 Production Hardening Checklist

## Team And Audit
- [x] Invitations are tenant scoped, hashed, expiring, emailed, and audited.
- [x] Invitation acceptance validates authenticated email and is transactional.
- [x] Role/status updates and removals enforce `team:manage`.
- [x] The last active owner cannot be demoted or removed.
- [x] Team management uses persisted APIs with safe read-only fallback.
- [x] Owner/admin audit records are cursor paginated and metadata sanitized.

## Observability And Protection
- [x] Sentry server, edge, browser, and caught API error capture is configured.
- [x] Sentry defaults exclude PII.
- [x] Structured JSON logs replace generic API console logging.
- [x] Request ids are propagated through API requests/responses.
- [x] Sensitive log fields are recursively redacted.
- [x] Durable PostgreSQL rate limits cover auth, external, mutation, and webhook paths.
- [x] Security headers are configured globally and on proxy responses.

## Review Passes
- [x] Next.js upgraded to a patched release.
- [x] High/critical production dependency audit findings resolved.
- [x] Performance review found no unbounded M10 queries.
- [x] Accessibility semantics and keyboard-operable controls reviewed.
- [x] M10 source/component files remain below 800 lines.
- [x] API contracts, schema docs, technical docs, environment template, and deployment docs updated.

## Final Gate
- [x] Clean database migration and seed pass.
- [x] Lint and typecheck pass.
- [x] Unit, component, and API tests pass.
- [x] Coverage thresholds pass.
- [x] Production build passes.
- [x] Critical Playwright E2E passes.
- [x] Dependency audit reports no high/critical production findings.
- [x] Mandatory roadmap gap review finds no remaining M10 implementation scope gaps.

On June 6, 2026, the configured Neon database was migrated through M10, seeded,
and verified with the full 67-test Playwright smoke suite.
