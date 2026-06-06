# Production Readiness Checklist

## Repository And Process
- [x] Work occurs on feature branches, never directly on main.
- [x] Every implementation ticket states assumptions, scope boundary, and out-of-scope items before coding.
- [x] Tests are written before implementation.
- [x] Docs, schemas, migrations, and API contracts are updated with code.
- [x] No speculative architecture changes without ADR updates.
- [x] All changed files are within ticket scope.
- [x] No component or source file exceeds 800 lines.
- [ ] Shared code lives in `pkg` or `integrations`, not duplicated across apps/services.

## UI Stub
- [x] UI routes match the design export route inventory.
- [ ] Visual parity checked against `ui-design/Complete Coach.zip` screenshots.
- [x] Generated design theme installed.
- [x] Sample data is centralized in typed fixtures.
- [x] No fixture-only shortcuts leak into planned production APIs.
- [x] Accessibility checks pass for navigation, forms, dialogs, and focus.
- [ ] Responsive behavior is usable without desktop visual drift.

## Security
- [x] No hardcoded secrets, keys, tokens, passwords, webhook secrets, or API keys.
- [x] Environment variables are validated before auth/database runtime paths are used.
- [x] Auth session cookies are managed by Auth.js with HTTP-only defaults.
- [ ] All user inputs are schema-validated at system boundaries.
- [x] All database access is parameterized through Prisma or prepared queries.
- [ ] Authorization checks happen before sensitive operations.
- [x] Tenant isolation tests exist for protected resources.
- [ ] External API keys are hashed and scoped.
- [ ] Webhook signatures are verified.
- [x] Rate limiting is enabled for auth-sensitive and external APIs.
- [ ] Signed file URLs have short TTLs.
- [x] Logs redact secrets, PII, raw health notes, and tokens.

## Database
- [x] Migrations are versioned.
- [x] Foreign keys are indexed.
- [x] Common filters have appropriate indexes.
- [ ] Multi-tenant tables include `organization_id`.
- [ ] Historical assignment records snapshot mutable library/template data.
- [x] `timestamptz` is used for timestamps.
- [ ] Money and measurements use precise numeric types.
- [ ] Soft-delete or archival strategy is explicit.
- [x] Migration rollback/forward plan is documented.

## APIs
- [ ] Endpoints follow `/api/v1` resource naming.
- [ ] Response envelope is consistent.
- [ ] Error envelope is consistent.
- [ ] Cursor pagination is used for growing collections.
- [ ] Validation errors return field-level details.
- [ ] 401/403/404/409/422 are used semantically.
- [ ] External analysis APIs are de-identified by default.
- [ ] PII export requires elevated scope and audit log.
- [ ] Webhook deliveries are signed, retried, and persisted.

## Payments
- [ ] Stripe webhook endpoint verifies signatures.
- [ ] Stripe events are processed idempotently.
- [ ] Stripe Connect account status is persisted.
- [ ] Subscription/payment status is webhook-driven.
- [ ] Payment event payload logging is redacted.
- [ ] Package/product/price sync behavior is documented.

## Files
- [ ] Uploads use signed R2 URLs.
- [ ] File type, extension, and size are validated.
- [ ] Object metadata is persisted.
- [ ] File access checks enforce organization and role.
- [ ] Download URLs are short-lived.
- [ ] Malware scanning hook is planned before broad file sharing.

## Jobs
- [ ] Inngest events have versioned payload schemas.
- [ ] Retry policies are defined for emails, webhooks, imports, exports, and media processing.
- [ ] Job failures are observable.
- [ ] Long-running work does not block request/response paths.

## Observability
- [x] Sentry captures server/client errors.
- [x] Structured logs include request ids.
- [x] Logs include organization/actor ids where safe.
- [x] Logs exclude secrets, tokens, raw PII, raw health notes.
- [x] Audit logs exist for sensitive actions.
- [ ] Webhook events and job runs are traceable.

## Testing
- [x] Unit tests cover validation, authorization, domain logic, and mappers.
- [ ] Integration tests cover route handlers and database operations.
- [ ] E2E tests cover critical coach/client workflows.
- [x] Accessibility tests cover shell, forms, dialogs, and keyboard interactions.
- [x] Coverage is at least 80% for touched code.
- [x] Build, lint, typecheck, tests, and E2E pass before merge.

## Deployment
- [ ] Local, preview, staging, and production environments are separate.
- [ ] Production PII is not copied to lower environments.
- [ ] Neon databases/branches are environment-specific.
- [ ] Stripe/R2/Resend/Inngest credentials are environment-specific.
- [x] Vercel environment variables are configured without committing secrets.
- [x] Rollback strategy is documented.
