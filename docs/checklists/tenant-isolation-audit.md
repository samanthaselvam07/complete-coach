# Tenant Isolation And Fixture Leakage Audit

Last updated: 2026-06-29

This checklist tracks the clean-slate rollout for organization isolation. Complete Coach must never show another organization data set, demo fixture rows, or local-only state after a new coach creates an account.

## Completed Guardrails

- Auth JWT organization selection only accepts active memberships attached to active, non-deleted organizations.
- Local development fixture auth is opt-in with `NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS=1`; `NODE_ENV=development` alone must not inject demo organization state.
- Dashboard first paint uses loading/empty states while Neon-backed APIs resolve.
- Dashboard CRM, metadata, and tasks API tests assert that reads are scoped to the actor organization.

## Fixture Leakage Rules

- Runtime pages must not import demo records from `fixtures/*` for persisted product data.
- Static UI configuration is allowed from fixture-like modules only when it is not tenant data, for example form field definitions, CRM stage labels, and resource category options.
- New organization dashboards should render an empty but usable state until Neon returns persisted records.
- Demo names such as `Marcus Rodriguez`, `Sarah Johnson`, `Complete Coach Demo`, and seeded KPI values must appear only in tests, seeds, explicit fixture previews, or documentation examples.

## Current Runtime Imports To Watch

- `components/check-ins/check-in-management-page.tsx`: still references check-in fixture helpers and needs a follow-up conversion to API-only empty state where used.
- `components/supplementation/supplement-plans-page.tsx`: still references supplement fixture helpers and should be audited before MVP sign-up opens broadly.
- `components/forms/*`, `components/crm/crm-page.tsx`, and `components/education/add-resource-page.tsx`: currently appear to use static option/template definitions rather than tenant records; keep this distinction explicit during refactors.

## Cross-Org API Test Backlog

- Add negative tests for client detail, check-ins, training assignments, nutrition assignments, supplement assignments, and audit logs where an `org_2` record is requested by an `org_1` actor.
- Prefer endpoint-level tests that assert Prisma `where.organizationId` comes from `requireActiveActor`, never request payloads or route params.
- Add sign-up/onboarding tests that create a new organization with no clients, no tasks, no programs, no nutrition plans, no supplement plans, no leads, and no audit rows except account creation events.
