# Payments And Packages Persistence

Ticket 017 / M8 connects coaching packages, Stripe Connect, Stripe Billing subscriptions, webhook events, and revenue reporting to durable PostgreSQL records.

## Current State
- Prisma includes `packages`, `client_subscriptions`, and `payment_events`.
- Package APIs can list, create, and update active-organization packages with owner-only payment management authorization.
- Package create/update inputs intentionally reject client-supplied Stripe product and price ids. Stripe identifiers must be set by trusted server-side Stripe sync in a later M8 slice.
- Stripe Connect account-link API can create or reuse an active organization's connected account and return a server-generated onboarding URL.
- Package Stripe sync can create trusted Stripe product and price ids for active-organization packages after local Stripe Connect setup exists.
- Client subscription APIs can list local subscription mirrors and create Stripe Checkout subscription sessions for synced recurring packages.
- Stripe webhook processing verifies signatures, persists payment events idempotently, updates subscription mirrors, and refreshes Stripe Connect status from trusted Stripe events.
- Packages UI loads active organization packages from `GET /api/v1/packages`, supports create/edit/archive actions, automatically attempts trusted Stripe sync after saves, and renders empty/error states when the package API is unavailable.
- Packages UI supports editable pricing, currency, package term weeks, row-based feature lists, recurring billing cadences, scheduled price metadata, a connected Stripe account dashboard link for synced packages, and periodized churn and Customer LTV summaries.
- Dashboard monthly revenue is derived from persisted package `projectedMonthlyRevenue` values when the package API is available, with fixture revenue retained as fallback.
- Demo seed data creates package records from the UI stub fixtures.

## Ticket 017A Outcome
Completed on May 18, 2026.

Delivered:
- Forward-only Prisma migration for package, client subscription, and payment event persistence.
- Tenant-scoped `GET /api/v1/packages`, `POST /api/v1/packages`, and `PATCH /api/v1/packages/{package_id}` APIs.
- Package serialization includes active subscription count, projected monthly revenue, periodized retention, churn, and Customer LTV derived from local subscription records, package billing cadence, and archived client dates. Retention uses `(ending customers - new customers) / beginning customers`; Customer LTV uses ARPU x gross margin percentage / churn rate; gross margin currently defaults to 100% until package-level costs are tracked.
- Package mutation audit logs avoid secrets, card data, and client-provided Stripe identifiers.
- API tests cover package list/create/update, tenant scoping, payment management authorization, and rejection of client-supplied Stripe identifiers.

## Ticket 017B Outcome
Completed on May 18, 2026.

Delivered:
- `POST /api/v1/stripe/connect/account-link` creates or reuses the active organization's Standard Stripe connected account.
- `GET /api/v1/stripe/connect/onboarding/start` creates or reuses the active organization's Standard Stripe connected account and redirects directly to Stripe onboarding.
- `POST /api/v1/stripe/connect/dashboard-link` audits the authenticated request and returns the full Stripe Dashboard URL for an existing Standard connected account.
- Stripe secret key is read from environment variables only and is never accepted from clients.
- Connected account creation requests a Standard account with card payment and transfer capabilities and stores organization metadata in Stripe.
- Initial `stripe_connect_account_id` and `stripe_connect_status` are persisted from trusted Stripe account response flags.
- Account-link URLs are generated server-side for authenticated owners and audited without logging the URL or secret key.
- API tests cover missing Stripe configuration, account creation, account reuse, relative redirect resolution, dashboard opening, Stripe API failure mapping, authorization, and status derivation.

## Ticket 017C Outcome
Completed on May 18, 2026.

Delivered:
- `POST /api/v1/packages/{package_id}/stripe-sync` creates Stripe products and prices from trusted server-side package records.
- Recurring packages create Stripe recurring prices for weekly, fortnightly, monthly, annually, or custom intervals; one-time packages create non-recurring legacy prices.
- Existing Stripe product/price ids are reused to avoid duplicate Stripe catalog objects.
- Package sync requires local Stripe Connect account setup before syncing package catalog records.
- API tests cover monthly sync, fortnightly interval counts, one-time sync, existing id reuse, missing Connect setup, and tenant scoping.

## Ticket 017D Outcome
Completed on May 18, 2026.

Delivered:
- `GET /api/v1/client-subscriptions` lists active-organization subscription mirrors with client and package summaries.
- `POST /api/v1/client-subscriptions` creates Stripe Checkout subscription sessions from trusted local client/package records.
- Subscription creation requires local Stripe Connect setup, a synced recurring package price, and organization-scoped client/package records.
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
- Package cards show Stripe sync state, do not expose a manual sync button, and open the connected Stripe account for synced packages.
- Package summary metrics show active subscriptions, top performer, calculated retention rate, churn, and Customer LTV across monthly, quarterly, and annual views; the former portfolio value card is not shown.
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

## Platform Billing Foundation
Delivered:
- Complete Coach platform subscriptions are stored on `organizations` separately from Stripe Connect fields.
- Design Partners maps to Stripe product `prod_UsKvRz38e79sjQ`, monthly price `price_1TsaFuI51UQp7jCTfRTLC7UH`, payment link `https://buy.stripe.com/6oU4gzgYk1X71ZagMJ0ZW04`, 10 coach seats, and 200 clients.
- Core maps to Stripe product `prod_UsL4rRweWAB2XU`, monthly price `price_1Tvoc2I51UQp7jCTLDt3lc9w`, payment link `https://buy.stripe.com/cNi00jgYkbxHeLW2VT0ZW02`, 1 coach seat, and 40 clients.
- Pro maps to Stripe product `prod_UsL4hUCHyBkvkK`, monthly price `price_1TsaOPI51UQp7jCTB9TvXUIK`, payment link `https://buy.stripe.com/cNi7sLdM8fNX0V6gMJ0ZW00`, 3 coach seats, and 60 clients.
- Scale maps to Stripe product `prod_UvfzpLEEOi5N4H`, monthly price `price_1TvoddI51UQp7jCTIwk4C6rI`, payment link `https://buy.stripe.com/aFafZh6jG6dnbzK9kh0ZW03`, 10 coach seats, and 200 clients.
- `GET /api/v1/platform-billing/status` returns plan, subscription status, renewal date, and current coach/client usage.
- Platform billing access rules allow `active` and `trialing`; `past_due`, `unpaid`, `canceled`, and incomplete/inactive states block platform access.
- `POST /api/v1/platform-billing/checkout` creates Stripe Checkout subscription sessions on the Complete Coach Stripe account and never uses a connected account header.
- `POST /api/v1/platform-billing/portal` opens Stripe Billing Portal for the platform customer.
- `POST /api/v1/stripe/customer-portal` is an explicit Stripe Customer Portal alias for the same platform customer portal flow.
- Stripe webhooks branch platform subscription events by `metadata.billing_type = platform_subscription` and update organization billing fields.
- Org Settings Subscription & Billing reads `GET /api/v1/platform-billing/status` for the active organization id, current plan, subscription status, coach-seat usage, and client usage; plan start buttons open the configured hosted Stripe Payment Links with `client_reference_id` set to the active organization id, and status refreshes on focus/visibility changes, every 30 seconds while mounted, and through a manual refresh action.
- Platform Payment Link webhook handling uses `checkout.session.completed.client_reference_id` to attach the Stripe customer/subscription ids to the active organization, then treats subscription updates with any configured platform price id as Complete Coach platform billing even when Payment Link metadata is absent.
- Client creation is blocked when the organization reaches its plan client limit.
- Team invitations are blocked when active team members plus non-expired pending invitations reach the plan seat limit.
- Active owner/admin/coach/assistant memberships count as team seats, so changing an existing member's role only changes permissions and does not change seat usage.

## Source Specs
- `docs/architecture/data-model-spec.md`
- `docs/api/api-contract-spec.md`
- `docs/roadmap/implementation-roadmap.md`
- `docs/roadmap/implementation-ticket-map.md`
- `docs/checklists/m8-payments-packages-checklist.md`
- `docs/adr/ADR-003-data-storage-and-integrations.md`

## Data Model
- `packages`: organization-scoped package catalog records with price amount, currency, billing interval/custom cadence metadata, term weeks, optional scheduled price metadata, local status, optional legacy UI metadata, row-based features, and trusted Stripe product/price ids.
- `client_subscriptions`: organization/client/package subscription mirrors with Stripe customer/subscription ids and Stripe-derived status/period fields.
- `payment_events`: organization-scoped Stripe webhook/event records keyed by Stripe event id for idempotent processing.
- `organizations.platform_*`: organization-scoped Complete Coach platform subscription mirror with Stripe customer/subscription ids, plan, status, period dates, and cancel date.

Rules:
- Complete Coach platform billing uses Stripe Billing on the Complete Coach Stripe account.
- Coach-client payments use Stripe Connect on the coaching organization's connected account.
- Platform billing requests must not send the `Stripe-Account` header.
- Package reads require `payments:read`.
- Package writes require `payments:manage`.
- Stripe product and price ids are not accepted from browser/API clients.
- Stripe Connect account links require `payments:manage` and server-side `STRIPE_SECRET_KEY`.
- Opening the full Stripe Dashboard requires `payments:manage` and existing local Stripe Connect setup. The app returns Stripe's Dashboard URL for Standard connected accounts and does not generate Express login links.
- Package Stripe sync requires `payments:manage`, server-side `STRIPE_SECRET_KEY`, and local Stripe Connect account setup.
- Client subscription creation requires `payments:manage`, server-side `STRIPE_SECRET_KEY`, local Stripe Connect setup, and a synced recurring package.
- Stripe webhook events are the authoritative source for subscription/payment state.
- Payment event payloads must redact secrets, card details, billing details, and payment method details before persistence.
- Audit logs must not expose secrets, card details, or raw payment credentials.

## API Surface
- `GET /api/v1/packages`
- `POST /api/v1/packages`
- `PATCH /api/v1/packages/{package_id}`
- `POST /api/v1/packages/{package_id}/stripe-sync`
- `GET /api/v1/stripe/connect/status`
- `POST /api/v1/stripe/connect/account-link`
- `GET /api/v1/stripe/connect/onboarding/start`
- `POST /api/v1/stripe/connect/dashboard-link`
- `GET /api/v1/platform-billing/status`
- `POST /api/v1/platform-billing/checkout`
- `POST /api/v1/platform-billing/portal`
- `POST /api/v1/stripe/customer-portal`
- `GET /api/v1/client-subscriptions`
- `POST /api/v1/client-subscriptions`
- `POST /api/webhooks/stripe`

## Remaining M8 Work
None.
