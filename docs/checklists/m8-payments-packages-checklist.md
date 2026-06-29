# M8 Payments And Packages Checklist

## Phase Status
- [x] M8 implementation started.
- [x] Ticket 017A package/payment schema and package API foundation complete.
- [x] Ticket 017B Stripe Connect onboarding and account-link flow complete.
- [x] Ticket 017C Stripe product/price sync complete.
- [x] Ticket 017D client subscription creation complete.
- [x] Ticket 017E Stripe webhook processing and idempotency complete.
- [x] Ticket 017F packages UI and revenue dashboard persistence complete.
- [x] Ticket 017G payments E2E coverage complete.
- [x] Ticket 017H mandatory review gate complete.

## Schema And Migration
- [x] Prisma models exist for packages, client subscriptions, and payment events.
- [x] Package records include local price, currency, billing interval, status, and Stripe product/price mapping fields.
- [x] Client subscription records include client/package links, Stripe customer/subscription ids, status, period dates, and cancel date.
- [x] Payment event records include Stripe event id, event type, redacted payload, processing status, and processed timestamp.
- [x] Migration is forward-only and safe for Neon deployment.
- [x] Demo seed data creates package records.

## Packages
- [x] `GET /api/v1/packages` lists active-organization packages.
- [x] `POST /api/v1/packages` creates active-organization packages.
- [x] `PATCH /api/v1/packages/{package_id}` updates active-organization packages.
- [x] Package create/update rejects client-supplied Stripe product/price ids.
- [x] Package Stripe product/price mapping is created through trusted server-side Stripe sync.
- [x] `POST /api/v1/packages/{package_id}/stripe-sync` creates or reuses trusted Stripe product/price ids.
- [x] Package Stripe sync requires completed local Stripe Connect account setup.
- [x] Packages UI loads persisted API data and renders empty/error states when unavailable.

## Stripe Connect
- [x] Organization stores Stripe Connect account id and account status.
- [x] `POST /api/v1/stripe/connect/account-link` creates or reuses a connected account.
- [x] Stripe Connect account-link response is generated server-side only.
- [x] Initial Connect account status is persisted from trusted Stripe account response flags.
- [x] Connect account status refresh is persisted from trusted Stripe account webhooks.

## Client Subscriptions
- [x] `GET /api/v1/client-subscriptions` lists tenant-scoped subscriptions.
- [x] `POST /api/v1/client-subscriptions` creates Stripe Checkout subscription sessions for synced monthly packages.
- [x] Subscription creation verifies the client and package belong to the active organization.
- [x] Subscription creation reuses an existing Stripe customer id when available.
- [x] New local subscription records start as `incomplete`.
- [x] Final local subscription status is reserved for trusted Stripe-derived webhook events.

## Webhooks And Events
- [x] `POST /api/webhooks/stripe` verifies Stripe signatures.
- [x] Stripe events are persisted idempotently by `stripe_event_id`.
- [x] Duplicate Stripe events do not reapply state transitions.
- [x] Webhook processing updates subscription and Stripe Connect state from trusted payloads.
- [x] Payment event logs do not expose secrets or card details.

## Tests
- [x] API tests cover package list/create/update.
- [x] API tests cover package tenant scoping.
- [x] API tests cover rejecting client-supplied Stripe identifiers.
- [x] API tests cover payment management authorization.
- [x] `pnpm --dir apps/web test -- payments-api.test.ts` passes for Ticket 017A.
- [x] `pnpm --dir apps/web check` passes for Ticket 017A.
- [x] API tests cover Stripe Connect account-link flow.
- [x] API tests cover Stripe Connect authorization, missing configuration, API failure, and account reuse.
- [x] `pnpm --dir apps/web check` passes for Ticket 017B.
- [x] API tests cover Stripe product/price sync.
- [x] `pnpm --dir apps/web check` passes for Ticket 017C.
- [x] API tests cover subscription creation.
- [x] `pnpm --dir apps/web check` passes for Ticket 017D.
- [x] API tests cover Stripe webhook signature verification.
- [x] API tests cover Stripe webhook idempotency.
- [x] API tests cover Stripe-derived subscription and Connect state transitions.
- [x] Component tests cover API-backed package list, create, archive, and dashboard revenue persistence.
- [x] E2E tests cover package management and subscription flow.
- [x] `pnpm --dir apps/web check` passes for every M8 slice completed so far.

## Mandatory Review Gate
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Review steps:
- [x] Compare code against payments/packages product scope and this checklist.
- [x] Compare code against `docs/api/api-contract-spec.md`.
- [x] Compare code against `docs/architecture/data-model-spec.md`.
- [x] Compare code against `docs/adr/ADR-003-data-storage-and-integrations.md`.
- [x] Verify all checklist items above are complete or explicitly deferred outside M8 through updated roadmap docs.
- [x] Run migrations against a clean database.
- [x] Run seed against a clean database.
- [x] Run package API tests.
- [x] Run Stripe Connect tests.
- [x] Run subscription API tests.
- [x] Run Stripe webhook signature and idempotency tests.
- [x] Run package/subscription E2E flows.
- [x] Run `pnpm --dir apps/web check`.
- [x] Close every gap before M8 is marked complete.

Review notes:
- Ticket 017G added Playwright coverage for API-backed package management, trusted Stripe sync initiation, client subscription Checkout creation, and Stripe webhook duplicate handling.
- Ticket 017H ran clean PostgreSQL migration and seed verification in a disposable Docker database, targeted M8 API/component tests, targeted payments E2E, and full `pnpm --dir apps/web check`.
