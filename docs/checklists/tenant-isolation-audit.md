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

Status: Done

- [x] Dashboard CRM summary API asserts organization-scoped reads.
- [x] Dashboard metadata API asserts organization-scoped reads.
- [x] Dashboard tasks API asserts organization-scoped reads.
- [x] Check-in detail route returns `404` for an `org_2` check-in requested by an `org_1` actor and does not fetch extracted metrics.
- [x] Training assignment creation rejects an inaccessible template and does not create assignment or audit side effects.
- [x] Nutrition assignment creation rejects an inaccessible meal template and does not create assignment or audit side effects.
- [x] Supplement assignment creation rejects an inaccessible supplement template and does not create assignment or audit side effects.
- [x] Audit log API filters by `organizationId` and blocks roles without audit access.
- [x] Added explicit cross-org negative tests for client detail/profile update/archive routes.
- [x] Added explicit cross-org negative tests for CRM lead detail/update/activity/stage-transition routes.
- [x] Added explicit cross-org negative tests for forms, form assignments, and form submissions.
- [x] Confirmed explicit cross-org negative tests for messages, notifications, packages, Stripe package sync, education resources, food writes, exercise writes, and supplement coach details.
- [x] Added write-side tests proving client-provided `organizationId` fields are ignored in client and lead creation.
- [x] Added regression tests for list endpoints with `clientId`, `templateId`, `leadId`, or `targetId` filters to ensure those filters remain inside active org scope.

### Stage 5 - Database And Query Isolation Review

Status: Done

- [x] Inventory all Prisma models that contain `organizationId`.
- [x] Inventory all Prisma models that are global by design and document why they are safe, for example global food, exercise, or supplement libraries.
- [x] Review every API route for `findUnique`, `update`, `delete`, `upsert`, and `deleteMany` calls that could bypass `organizationId`.
- [x] Replace unsafe `findUnique`/direct writes with tenant-scoped `findFirst`/compound filters where required.
- [x] Confirm soft-delete filters are included for tenant resources that support archival/deletion.
- [x] Review unique constraints and compound indexes where tenant-scoped access depends on `organizationId + id` or `organizationId + slug`.
- [x] Review audit logs to ensure target IDs are always written with the active organization and never from request-provided org values.

Stage 5 findings:

- `ExerciseLibraryItem`, `FoodLibraryItem`, and `SupplementLibraryItem` are intentionally mixed global/private libraries. Global rows use `scope = GLOBAL` and nullable `organizationId`; tenant writes remain limited to private rows with `organizationId = actor.organizationId`.
- `AuditLog.organizationId` is nullable for platform/system events, but the audit API filters by the active actor organization and role permissions.
- `AiPromptVersion.organizationId` is nullable for platform-managed prompts; active write paths continue to use organization-owned prompt/profile/generation records for tenant state.
- Auth/session/account/verification/rate-limit records are identity or infrastructure records rather than organization product data.
- Existing Prisma primary-key indexes are sufficient for current write paths because the API now performs scoped ownership reads before mutation and writes include `organizationId` in extended unique filters. No migration was required in this stage.
- Added `tests/tenant-query-patterns.test.ts` as a static guardrail so future id-based tenant writes in `app/api/v1` or `lib` must include `organizationId` or an explicit documented exception.

### Stage 6 - Sign-Up Clean Slate

Status: Done

- [x] Build or finalize coach sign-up page and onboarding flow.
- [x] Create a new organization on sign-up with a first owner membership.
- [x] Select the new organization as active session context after sign-up.
- [x] Ensure no demo clients, leads, tasks, programs, meal plans, supplement protocols, forms, messages, packages, social posts, or audit records are copied into the new organization.
- [x] Add tests for new organization bootstrap state.
- [x] Add a clean-empty dashboard test that simulates a brand-new organization with no product records.
- [x] Add an onboarding audit event only if required by product/security requirements.

Stage 6 findings:

- Added `/sign-up` with a Complete Coach branded form that creates the account, then signs the coach in through the existing credentials provider.
- Added `POST /api/auth/sign-up` to validate input, hash the password server-side, and create only the user, organization, and active owner membership in one transaction.
- Organization slugs are deterministic and collision-safe through numeric suffixes, for example `mcp-coaching` then `mcp-coaching-2`.
- The first Auth.js sign-in after registration selects the new organization through the existing active membership callback, so no request-provided organization ID is trusted.
- No onboarding audit row is created in this stage because the current success criteria require the smallest clean-slate bootstrap and no product data side effects.

### Stage 7 - Production Verification

Status: In progress

- [x] Run end-to-end sign-up in Vercel against Neon preview.
- [ ] Create two organizations and verify records created in one never appear in the other.
- [ ] Verify dashboard, clients, CRM, training, nutrition, supplementation, forms, messages, organization settings, and billing surfaces for both empty and populated org states.
- [ ] Verify local dev auth bypass cannot activate unless `NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS=1`.
- [ ] Verify production environment does not include local bypass env flags or demo seed toggles.
- [ ] Run full verification gate before marking the audit complete.

Stage 7 findings:

- Confirmed `app.completecoach.fit` points at the latest `complete-coach` production deployment, while `completecoach.fit` remains the separate landing project.
- Initial live browser verification found `/sign-up` redirected to `/sign-in` because the global dashboard shell only treated `/sign-in` as public.
- Added `/sign-up` to the public shell allowlist and expanded the shell auth-boundary regression test to cover both public auth pages.
- Follow-up live browser verification confirmed the public sign-up page rendered, then exposed an auth callback redirect to the landing domain. Auth forms now sign in without automatic Auth.js redirects and navigate to `/` on the app origin after successful credential authentication.
- Production Neon was eight migrations behind the deployed application schema. Applied the pending migrations with `prisma migrate deploy`; `prisma migrate status` now reports the database schema is up to date.
- Live sign-up verification after migration created a fresh organization on `app.completecoach.fit`, landed on the clean dashboard, returned no HTTP errors, and confirmed the AI recommendations endpoint now returns `200 {"data":[]}` for the new organization.
- The fresh organization dashboard showed zero clients/tasks/check-ins/CRM counts and did not include fixture names such as `Marcus Rodriguez`, `Sarah Johnson`, `Payment Secured`, or `Complete Coach Demo`.

## Completed Verification Evidence

- `pnpm --filter @complete-coach/web test -- active-organization local-dev-session dashboard-metadata-api dashboard-crm-summary-api operations-api dashboard-page`: passed.
- `pnpm --filter @complete-coach/web test -- dashboard-page submissions-checkins-api training-api nutrition-api supplementation-api audit-api`: passed.
- `pnpm --filter @complete-coach/web test -- fixture-leakage`: passed.
- `pnpm --filter @complete-coach/web test -- client-crm-api`: passed.
- `pnpm --filter @complete-coach/web test -- submissions-checkins-api forms-api client-crm-api`: passed.
- `pnpm --filter @complete-coach/web test -- client-crm-api submissions-checkins-api education-api notifications-email-api package-stripe-sync-api operations-api training-api nutrition-api supplementation-api audit-api dashboard-crm-summary-api dashboard-metadata-api`: passed.
- `pnpm --filter @complete-coach/web test -- ai-api forms-api notifications-email-api nutrition-api operations-api package-stripe-sync-api payments-api team-api training-api tenant-query-patterns`: passed.
- `pnpm --filter @complete-coach/web test -- auth-signup-api auth-ui dashboard-page dashboard-metadata-api dashboard-crm-summary-api operations-api`: passed.
- `pnpm --filter @complete-coach/web test -- app-shell auth-ui auth-signup-api`: passed.
- `rg -n "where:\s*\{\s*id[:}]" apps/web/app/api/v1 apps/web/lib apps/web/tests/tenant-query-patterns.test.ts`: only tenant-scoped writes and documented organization/type-only exceptions remain.
- `pnpm --filter @complete-coach/web typecheck`: passed.
- `AUTH_SECRET=... DATABASE_URL=... DIRECT_URL=... pnpm --filter @complete-coach/web exec next build --webpack`: passed.
- `npx vercel inspect app.completecoach.fit --scope team_urIw9URwV9XUJWjSSYfaXPCp`: confirmed the app alias resolves to the ready production deployment.
- `pnpm --filter @complete-coach/web exec prisma migrate deploy`: applied eight pending production Neon migrations successfully.
- `pnpm --filter @complete-coach/web exec prisma migrate status`: passed, database schema is up to date.
- `node /private/tmp/stage7-verify.mjs`: passed, live sign-up created `stage7-1782784149384@completecoach.fit` with no HTTP errors and no fixture data visible.
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

- Lint is not currently a clean gate because unrelated UI issues predate this audit slice.
- Remaining Stage 7 production work should still cover cross-organization data visibility and the wider empty/populated surface sweep.
