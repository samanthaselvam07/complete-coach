# Payments And Packages Persistence

Ticket 017 / M8 connects coaching packages, Stripe Connect, Stripe Billing subscriptions, webhook events, and revenue reporting to durable PostgreSQL records.

## Current State
- Prisma includes `packages`, `client_subscriptions`, and `payment_events`.
- Package APIs can list, create, and update active-organization packages with owner-only payment management authorization.
- Package create/update inputs intentionally reject client-supplied Stripe product and price ids. Stripe identifiers must be set by trusted server-side Stripe sync in a later M8 slice.
- Stripe Connect account-link API can create or reuse an active organization's connected account and return a server-generated onboarding URL.
- Package Stripe sync can create trusted Stripe product and price ids for active-organization packages after local Stripe Connect setup exists.
- Client subscription APIs can list local subscription mirrors and create Stripe Checkout subscription sessions for synced monthly packages.
- Stripe webhook processing verifies signatures, persists payment events idempotently, updates subscription mirrors, and refreshes Stripe Connect status from trusted Stripe events.
- Packages UI loads active organization packages from `GET /api/v1/packages`, supports create/edit/archive actions, can start trusted Stripe sync, and falls back to fixtures only when the package API is unavailable.
- Dashboard monthly revenue is derived from persisted package `projectedMonthlyRevenue` values when the package API is available, with fixture revenue retained as fallback.
- Demo seed data creates package records from the UI stub fixtures.

## Ticket 017A Outcome
Completed on May 18, 2026.

Delivered:
- Forward-only Prisma migration for package, client subscription, and payment event persistence.
- Tenant-scoped `GET /api/v1/packages`, `POST /api/v1/packages`, and `PATCH /api/v1/packages/{package_id}` APIs.
- Package serialization includes active subscription count and projected monthly revenue derived from local subscription records.
- Package mutation audit logs avoid secrets, card data, and client-provided Stripe identifiers.
- API tests cover package list/create/update, tenant scoping, payment management authorization, and rejection of client-supplied Stripe identifiers.

## Ticket 017B Outcome
Completed on May 18, 2026.

Delivered:
- `POST /api/v1/stripe/connect/account-link` creates or reuses the active organization's Stripe connected account.
- `POST /api/v1/stripe/connect/dashboard-link` creates an authenticated, on-demand Stripe Express Dashboard login link for an existing connected account.
- Stripe secret key is read from environment variables only and is never accepted from clients.
- Connected account creation requests Express onboarding with card payment and transfer capabilities and stores organization metadata in Stripe.
- Initial `stripe_connect_account_id` and `stripe_connect_status` are persisted from trusted Stripe account response flags.
- Account-link and dashboard-login URLs are generated server-side for authenticated owners and audited without logging the URL or secret key.
- API tests cover missing Stripe configuration, account creation, account reuse, relative redirect resolution, dashboard login links, Stripe API failure mapping, authorization, and status derivation.

## Ticket 017C Outcome
Completed on May 18, 2026.

Delivered:
- `POST /api/v1/packages/{package_id}/stripe-sync` creates Stripe products and prices from trusted server-side package records.
- Monthly packages create recurring monthly Stripe prices; one-time packages create non-recurring prices.
- Existing Stripe product/price ids are reused to avoid duplicate Stripe catalog objects.
- Package sync requires local Stripe Connect account setup before syncing package catalog records.
- API tests cover monthly sync, one-time sync, existing id reuse, missing Connect setup, and tenant scoping.

## Ticket 017D Outcome
Completed on May 18, 2026.

Delivered:
- `GET /api/v1/client-subscriptions` lists active-organization subscription mirrors with client and package summaries.
- `POST /api/v1/client-subscriptions` creates Stripe Checkout subscription sessions from trusted local client/package records.
- Subscription creation requires local Stripe Connect setup, a synced monthly package price, and organization-scoped client/package records.
- Existing Stripe customer ids are reused when available; otherwise a Stripe customer is created from tenant-scoped client data.
- Local subscription mirrors start as `incomplete` with the Checkout session id; final status transitions remain webhook-driven.
- API tests cover listing, Checkout session creation, customer reuse, Connect guard, and one-time package rejection.

## Ticket 017E Outcome
Completed on May 18, 2026.

Delivered:
- `POST /api/webhooks/stripe` verifies the raw Stripe signature before any database work.
- Stripe events are persisted in `payment_events` by unique Stripe event id with redacted payloads.
- Duplicate Stripe events return a successful idempotent response without reapplying state transitions.
- `checkout.session.completed` links Checkout, customer, and subscription ids back to the local subscription mirror.
- `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` update local subscription status and billing period fields from trusted Stripe payloads.
- `account.updated` refreshes the organization's Stripe Connect account id and derived onboarding/active status.
- API tests cover signature rejection, idempotency, subscription transitions, Connect status updates, ignored events, and sensitive payload redaction.

## Ticket 017F Outcome
Completed on May 26, 2026.

Delivered:
- `/packages` now prefers `GET /api/v1/packages?status=active&limit=100` for package cards and summary metrics.
- Package create and edit actions submit validated UI payloads to `POST /api/v1/packages` and `PATCH /api/v1/packages/{package_id}`.
- Package archive uses `PATCH /api/v1/packages/{package_id}` with `status: archived` and removes archived records from the active package list.
- Package cards show Stripe sync state and can trigger `POST /api/v1/packages/{package_id}/stripe-sync` for unsynced persisted packages.
- Dashboard monthly revenue reads package `projectedMonthlyRevenue` from persisted package data and keeps fixture revenue fallback if the API is unavailable.
- Component tests cover API-backed package loading, create, archive, and dashboard revenue persistence.

## Ticket 017G Outcome
Completed on May 26, 2026.

Delivered:
- Playwright payments E2E coverage for the API-backed `/packages` management flow.
- Package E2E verifies active package loading, summary metrics, package creation payloads, trusted Stripe sync initiation, and package archive behavior.
- Subscription/payment E2E verifies Checkout session creation semantics and duplicate Stripe webhook responses through application-routed API calls.
- Payments E2E uses mocked API responses and isolated auth storage so it can run without live Stripe credentials.

## Ticket 017H Outcome
Completed on May 26, 2026.

Delivered:
- Mandatory M8 review compared delivered code against the payments/packages scope, API contract, data model spec, ADR-003, and this checklist.
- Clean database verification ran all Prisma migrations and seed data against a disposable PostgreSQL database.
- Targeted M8 tests covered packages, Stripe Connect, package Stripe sync, client subscriptions, Stripe webhooks, package records, subscription records, and package UI behavior.
- Full `pnpm --dir apps/web check` passed, including lint, typecheck, 372 Vitest tests, coverage, production build, and 61 Playwright E2E tests.

## Source Specs
- `docs/architecture/data-model-spec.md`
- `docs/api/api-contract-spec.md`
- `docs/roadmap/implementation-roadmap.md`
- `docs/roadmap/implementation-ticket-map.md`
- `docs/checklists/m8-payments-packages-checklist.md`
- `docs/adr/ADR-003-data-storage-and-integrations.md`

## Data Model
- `packages`: organization-scoped package catalog records with price amount, currency, billing interval, local status, optional UI metadata, and trusted Stripe product/price ids.
- `client_subscriptions`: organization/client/package subscription mirrors with Stripe customer/subscription ids and Stripe-derived status/period fields.
- `payment_events`: organization-scoped Stripe webhook/event records keyed by Stripe event id for idempotent processing.

Rules:
- Package reads require `payments:read`.
- Package writes require `payments:manage`.
- Stripe product and price ids are not accepted from browser/API clients.
- Stripe Connect account links require `payments:manage` and server-side `STRIPE_SECRET_KEY`.
- Stripe Express Dashboard login links require `payments:manage`, server-side `STRIPE_SECRET_KEY`, and existing local Stripe Connect setup. Links must be generated on demand and should not be emailed, persisted, or exposed outside authenticated app navigation.
- Package Stripe sync requires `payments:manage`, server-side `STRIPE_SECRET_KEY`, and local Stripe Connect account setup.
- Client subscription creation requires `payments:manage`, server-side `STRIPE_SECRET_KEY`, local Stripe Connect setup, and a synced monthly package.
- Stripe webhook events are the authoritative source for subscription/payment state.
- Payment event payloads must redact secrets, card details, billing details, and payment method details before persistence.
- Audit logs must not expose secrets, card details, or raw payment credentials.

## API Surface
- `GET /api/v1/packages`
- `POST /api/v1/packages`
- `PATCH /api/v1/packages/{package_id}`
- `POST /api/v1/packages/{package_id}/stripe-sync`
- `POST /api/v1/stripe/connect/account-link`
- `POST /api/v1/stripe/connect/dashboard-link`
- `GET /api/v1/client-subscriptions`
- `POST /api/v1/client-subscriptions`
- `POST /api/webhooks/stripe`

## Remaining M8 Work
None.
