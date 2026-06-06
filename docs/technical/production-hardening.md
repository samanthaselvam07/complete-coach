# Production Hardening Technical Reference

**Added:** 2026-06-06

## Scope
Ticket 019 adds team invitations and role management, an audit view, Sentry, structured logging, request ids, durable rate limits, security headers, dependency remediation, and production review documentation.

## Team Management
- Invitations are organization scoped and limited to admin, coach, and assistant roles.
- A 32-byte random token is returned only outside production, stored only as a SHA-256 hash, and expires after seven days.
- Resend delivers the acceptance link and persists delivery status.
- Acceptance requires an authenticated user whose email exactly matches the invitation.
- Membership activation and invitation consumption occur in one transaction.
- The last active owner cannot be demoted or removed.
- Invitation, acceptance, role, status, and removal actions write audit events.

## Observability
- `proxy.ts` generates or preserves `X-Request-Id` and emits structured JSON forwarding/rate-limit events.
- Pino logs include service and environment fields.
- Recursive redaction removes credentials, tokens, PII, message bodies, form answers, and health/medical fields.
- Sentry captures uncaught Next.js errors through `instrumentation.ts`.
- The shared API error handler explicitly captures caught unexpected route errors.
- `sendDefaultPii` is disabled for server, edge, and browser Sentry clients.

## Rate Limits
PostgreSQL is the durable source of truth for fixed-window counters:
- Auth mutations: 10/minute.
- External APIs: 60/minute.
- Internal mutations and provider webhooks: 120/minute.

Keys hash scope, IP, and path. Auth/external protection fails closed if the limiter store is unavailable. Ordinary internal mutations fail open and emit an error log to avoid a total write outage.

## Security Headers
All application responses receive:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

API proxy responses apply the same headers and include the request id.

## Performance Review
- Team list queries use indexed organization/status fields.
- Audit events use bounded cursor pagination and the existing organization/created-at index.
- Rate-limit updates use one atomic PostgreSQL upsert per protected request.
- No unbounded M10 collection query was introduced.
- New UI files remain under the 800-line limit and use bounded tables/lists.

## Accessibility Review
- Team mutations use labelled native controls and Radix dialog focus management.
- Status/error messages use `role=status` or `role=alert`.
- Tables include semantic headings.
- Invitation acceptance has a keyboard-operable primary action and explicit invalid-link state.
- Existing shell keyboard/focus E2E smoke remains part of the full gate.

## Migration And Cleanup
Migration `20260606120000_team_invitations` adds `team_invitations` and `rate_limit_buckets`. It is additive and compatible with application rollback. Expired limiter rows may be deleted periodically with:

```sql
DELETE FROM rate_limit_buckets WHERE expires_at < now() - interval '1 day';
```

## Verification
- Unit/component/API tests cover team authorization, tenant scope, token hashing, acceptance, owner protection, logging redaction, request ids, rate-limit behavior, audit sanitization, and UI states.
- Global coverage is 91.55% statements, 80.12% branches, 93.60% functions, and 91.57% lines.
- Lint, typecheck, 433 unit/component/API tests, production build, and the high-severity production dependency audit pass.
- The production audit reports no high or critical findings; 1 low and 11 moderate findings remain for future dependency maintenance.
- On June 6, 2026, the configured Neon database was migrated through M10, seeded, and verified with the full 67-test Playwright smoke suite.
- Production build, dependency audit, clean migration/seed, Playwright E2E, and the repository full gate passed for M10.
