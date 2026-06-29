# Tenant Isolation And Fixture Leakage Audit Roadmap

Last updated: 2026-06-29

This checklist tracks the clean-slate rollout for organization isolation. Complete Coach must never show another organization data set, demo fixture rows, or local-only state after a new coach creates an account.

## Success Criteria

- A new coach can sign up, create or join an organization, and land on an empty usable dashboard with no seeded/demo client, task, CRM, financial, training, nutrition, supplementation, form, message, or audit data.
- Every server-side read and write uses the authenticated actor organization from `requireActiveActor` or the equivalent auth guard.
- Route params, request bodies, local storage, or client-provided organization IDs can never widen the tenant scope.
- Demo fixtures are limited to tests, development-only previews, seed scripts, or documentation examples.
- Cross-organization access attempts return `404` or `403` and do not create audit rows, assignments, messages, or other side effects.
- The production sign-up path creates only the minimum organization bootstrap records required for the account to function.

## Roadmap

### Stage 1 - Auth And Active Organization Guardrails

Status: Done

- [x] Added `lib/auth/active-organization.ts` to select an active organization only from active memberships.
- [x] Ensured deleted/inactive organizations are not selected as active tenant context.
- [x] Ensured inactive memberships are ignored.
- [x] Made local development fixture auth explicitly opt-in with `NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS=1`.
- [x] Added tests covering active organization selection and local bypass behavior.

### Stage 2 - Dashboard Clean-Empty Behavior

Status: Done

- [x] Dashboard first paint starts from empty/loading state instead of demo task, revenue, team, or CRM values.
- [x] Dashboard task, CRM summary, and metadata APIs are tested for active organization scoping.
- [x] Dashboard task/revenue model types and static category labels now live under `lib/dashboard`.
- [x] Old sample dashboard rows are no longer imported by runtime dashboard components.
- [x] Dashboard subtitle uses Neon-backed task counts once loaded and shows loading text before data resolves.

### Stage 3 - Fixture Leakage Audit

Status: Done

- [x] Defined runtime fixture rules: no persisted product data from `fixtures/*` in runtime pages.
- [x] Moved check-in display helpers from `fixtures/check-ins` to `lib/check-ins/check-in-display.ts`.
- [x] Moved supplement protocol display types from `fixtures/supplementation` to `lib/supplements/protocol-display.ts`.
- [x] Moved dashboard model types/static task category options from `fixtures/dashboard` to `lib/dashboard/dashboard-models.ts`.
- [x] Reviewed remaining runtime imports from `fixtures/clients`, `fixtures/nutrition`, `fixtures/training`, `fixtures/leads`, `fixtures/forms`, `fixtures/education`, and `fixtures/operations`.
- [x] Split remaining imports into durable model modules under `lib/*` or clearly named static config modules.
- [x] Removed runtime fixture dependency paths so API-empty states cannot import fallback demo rows through shared fixture modules.
- [x] Added `tests/fixture-leakage.test.ts` to fail when app, component, or lib runtime code imports `@/fixtures/*`.

### Stage 4 - Cross-Org API Tests

Status: In progress

- [x] Dashboard CRM summary API asserts organization-scoped reads.
- [x] Dashboard metadata API asserts organization-scoped reads.
- [x] Dashboard tasks API asserts organization-scoped reads.
- [x] Check-in detail route returns `404` for an `org_2` check-in requested by an `org_1` actor and does not fetch extracted metrics.
- [x] Training assignment creation rejects an inaccessible template and does not create assignment or audit side effects.
- [x] Nutrition assignment creation rejects an inaccessible meal template and does not create assignment or audit side effects.
- [x] Supplement assignment creation rejects an inaccessible supplement template and does not create assignment or audit side effects.
- [x] Audit log API filters by `organizationId` and blocks roles without audit access.
- [ ] Add explicit cross-org negative tests for client detail/profile update/archive routes.
- [ ] Add explicit cross-org negative tests for CRM lead detail/update/activity/stage-transition routes.
- [ ] Add explicit cross-org negative tests for forms, form assignments, and form submissions.
- [ ] Add explicit cross-org negative tests for messages, notifications, packages, Stripe package sync, education resources, food writes, exercise writes, and supplement coach details.
- [ ] Add write-side tests proving client-provided `organizationId` fields are ignored or rejected.
- [ ] Add regression tests for list endpoints with `clientId`, `templateId`, `leadId`, or `targetId` filters to ensure those filters remain inside active org scope.

### Stage 5 - Database And Query Isolation Review

Status: Not started

- [ ] Inventory all Prisma models that contain `organizationId`.
- [ ] Inventory all Prisma models that are global by design and document why they are safe, for example global food, exercise, or supplement libraries.
- [ ] Review every API route for `findUnique`, `update`, `delete`, `upsert`, and `deleteMany` calls that could bypass `organizationId`.
- [ ] Replace unsafe `findUnique`/direct writes with tenant-scoped `findFirst`/compound filters where required.
- [ ] Confirm soft-delete filters are included for tenant resources that support archival/deletion.
- [ ] Add unique constraints or compound indexes where tenant-scoped access depends on `organizationId + id` or `organizationId + slug`.
- [ ] Review audit logs to ensure target IDs are always written with the active organization and never from request-provided org values.

### Stage 6 - Sign-Up Clean Slate

Status: Not started

- [ ] Build or finalize coach sign-up page and onboarding flow.
- [ ] Create a new organization on sign-up with a first owner membership.
- [ ] Select the new organization as active session context after sign-up.
- [ ] Ensure no demo clients, leads, tasks, programs, meal plans, supplement protocols, forms, messages, packages, social posts, or audit records are copied into the new organization.
- [ ] Add tests for new organization bootstrap state.
- [ ] Add a clean-empty dashboard test that simulates a brand-new organization with no product records.
- [ ] Add an onboarding audit event only if required by product/security requirements.

### Stage 7 - Production Verification

Status: Not started

- [ ] Run end-to-end sign-up in Vercel against Neon preview.
- [ ] Create two organizations and verify records created in one never appear in the other.
- [ ] Verify dashboard, clients, CRM, training, nutrition, supplementation, forms, messages, organization settings, and billing surfaces for both empty and populated org states.
- [ ] Verify local dev auth bypass cannot activate unless `NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS=1`.
- [ ] Verify production environment does not include local bypass env flags or demo seed toggles.
- [ ] Run full verification gate before marking the audit complete.

## Completed Verification Evidence

- `pnpm --filter @complete-coach/web test -- active-organization local-dev-session dashboard-metadata-api dashboard-crm-summary-api operations-api dashboard-page`: passed.
- `pnpm --filter @complete-coach/web test -- dashboard-page submissions-checkins-api training-api nutrition-api supplementation-api audit-api`: passed.
- `pnpm --filter @complete-coach/web test -- fixture-leakage`: passed.
- `pnpm --filter @complete-coach/web typecheck`: passed.
- `AUTH_SECRET=... DATABASE_URL=... DIRECT_URL=... pnpm --filter @complete-coach/web exec next build --webpack`: passed.
- `pnpm --filter @complete-coach/web lint`: currently blocked by unrelated existing UI lint issues in check-in detail, client profile dashboard, meal plans, packages, and training program builder.

## Fixture Leakage Rules

- Runtime pages must not import demo records from `fixtures/*` for persisted product data.
- Check-in and supplement display helper types now live under `lib/check-ins` and `lib/supplements` so runtime pages do not import those fixture modules for shared helpers.
- Dashboard task/revenue model types and static category labels now live under `lib/dashboard`, keeping old sample dashboard rows out of the runtime dependency graph.
- Static UI configuration is allowed from fixture-like modules only when it is not tenant data, for example form field definitions, CRM stage labels, and resource category options.
- New organization dashboards should render an empty but usable state until Neon returns persisted records.
- Demo names such as `Marcus Rodriguez`, `Sarah Johnson`, `Complete Coach Demo`, and seeded KPI values must appear only in tests, seeds, explicit fixture previews, or documentation examples.

## Current Runtime Imports To Watch

- `components/check-ins/check-in-management-page.tsx`: converted away from check-in fixture helper imports.
- `components/supplementation/supplement-plans-page.tsx`: converted away from supplement fixture helper imports.
- `components/dashboard/*`: converted away from `fixtures/dashboard` for runtime dashboard models/options.
- `components/forms/*`, `components/crm/crm-page.tsx`, and `components/education/add-resource-page.tsx`: converted to `lib/forms`, `lib/crm`, and `lib/education` model/config modules.
- Runtime app, component, and lib code now has a regression test requiring zero `@/fixtures/*` imports.

## Cross-Org API Test Rules

- Prefer endpoint-level tests that assert Prisma `where.organizationId` comes from `requireActiveActor`, never request payloads or route params.
- For inaccessible tenant records, prefer `404` over leaking existence.
- For permission failures inside the active org, use `403`.
- Assert no side effects on failed cross-org writes: no create/update/delete, no assignment snapshot, no audit log, no notification.
- Assert child resource reads cannot escape through parent IDs, for example client metrics, check-ins, assignments, lead activities, messages, or files.

## Open Risks

- The sign-up path has not yet been built and tested as a true clean-slate organization bootstrap.
- Database-level review is still required to catch unsafe direct writes or `findUnique` calls outside the endpoints already tested.
- Lint is not currently a clean gate because unrelated UI issues predate this audit slice.
- Production verification has not yet been performed against a fresh Vercel/Neon preview organization.
