# Implementation Roadmap

## Delivery Principles
- Plan before execute.
- Tests before implementation.
- Keep every phase independently mergeable.
- Preserve UI design before replacing sample data.
- Keep API contracts, migrations, and docs aligned with code.
- Use PostgreSQL as source of truth.
- Avoid speculative abstractions.
- No hardcoded secrets.

## M0 - Repository Activation
Status: Complete.

Goal: make the harness operational for this project.

Scope:
- Establish package manager and workspace layout.
- Add root Makefile or package scripts for bootstrap, test, coverage, lint, typecheck, build.
- Ensure CI matches real project commands.
- Add import-boundary check script referenced by pre-commit hook.
- Document local environment setup.

Verification:
- Bootstrap command works.
- CI commands work locally.
- Pre-commit hook no longer references missing scripts/apps.

Risk:
- Current harness pre-commit references `apps/web` and `scripts/check-import-boundaries.sh`, which do not exist yet. M0 must reconcile that before enforcing hooks.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare delivered files against M0 scope and `docs/README.md` planning expectations.
- Verify root workspace/package commands exist and map to real commands, not placeholders.
- Run bootstrap, lint, typecheck, test, coverage, and build commands or document why a command is not yet applicable.
- Run `bash -n scripts/*.sh` and verify pre-commit no longer references missing paths.
- Verify import-boundary tooling exists and fails on invalid cross-boundary imports.
- Confirm local setup docs are accurate by following them from a clean checkout where practical.
- Close any gaps with code/docs/tests before M1 starts.

## M1 - Working UI Stub
Status: Complete. Tickets 001 through 010 are complete.

Goal: first user-visible deliverable, launchable locally with sample data and design parity.

Scope:
- Implement `apps/web` Next.js App Router app.
- Install shadcn/Tailwind/design theme.
- Port all routes from UI archive.
- Decompose large components.
- Move mock data to typed fixtures.
- Add route/component/E2E/accessibility smoke tests.

Verification:
- `pnpm --dir apps/web dev` launches.
- All routes render.
- Visual parity checklist passes.
- Tests/build/typecheck/lint pass.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against `docs/specs/ui-stub-first-deliverable.md`, `docs/design-system/ui-design-analysis.md`, and `docs/design-system/ui-parity-checklist.md`.
- Verify every route listed in the UI stub spec renders and has deterministic sample data.
- Manually compare key screens against the exported screenshots in `ui-design/Complete Coach.zip`.
- Verify generated theme tokens from `docs/design-system/complete-coach-theme.css` are installed in the app.
- Verify sample data is centralized in typed fixtures and not embedded as large component arrays.
- Check no source/component file exceeds 800 lines.
- Run route smoke tests, component tests, accessibility smoke tests, E2E navigation tests, lint, typecheck, and build.
- Document any unavoidable visual parity differences in `docs/design-system/ui-parity-notes.md`.
- Close any gaps with code/docs/tests before M2 starts.

## M2 - Foundation Auth, Tenant, Database
Status: Complete. Ticket 011 is complete.

Goal: secure multi-tenant foundation with real persistence.

Scope:
- Add NextAuth/Auth.js.
- Add Prisma with Neon PostgreSQL.
- Implement organizations, users, memberships, roles.
- Implement authorization helper package.
- Add audit log baseline.
- Add environment validation.
- Add seed data for local/preview/staging.

Verification:
- Users can authenticate locally.
- Organization context resolves.
- Role checks are unit-tested.
- Prisma migrations apply cleanly.
- Tenant isolation tests pass.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against `docs/architecture/architecture-spec.md`, `docs/architecture/data-model-spec.md`, `docs/adr/ADR-001-application-foundation.md`, and `docs/adr/ADR-002-auth-tenancy-and-roles.md`.
- Verify NextAuth/Auth.js is configured without hardcoded secrets and environment validation fails fast for missing required variables.
- Verify organizations, users, memberships, roles, and authorization helpers exist with tests.
- Apply Prisma migrations to a clean local database and verify rollback/reset workflow where supported.
- Verify every tenant-owned table includes `organization_id` where required.
- Run tenant isolation tests that prove cross-organization reads/writes are blocked.
- Verify audit log baseline exists for auth, membership, role, and sensitive access events.
- Run lint, typecheck, unit tests, integration tests, migration checks, and build.
- Close any gaps with code/docs/tests before M3 starts.

## M3 - Clients And CRM
Status: Complete. Tickets 012 and 012B are complete, deployed, and verified through the mandatory M3 review gate.

Goal: make the highest-priority domain real.

Scope:
- Persist clients, profiles, leads, lead activities.
- Replace clients/CRM fixtures with API-backed data.
- Implement client create/edit/archive.
- Implement lead create/edit/stage transitions.
- Add audit logs for sensitive client actions.

Verification:
- Clients and leads survive reload.
- Cross-tenant access is blocked.
- E2E covers roster, profile view, CRM stage movement.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against product clients/CRM scope, data model client/lead tables, and API contract clients/CRM endpoints.
- Verify client roster, client profile, and CRM pages are backed by real APIs instead of fixtures where this phase requires persistence.
- Verify create, read, update, archive, search, filter, sort, and stage-transition flows work.
- Verify sensitive client profile fields require appropriate role/capability checks.
- Verify client and lead records are organization-scoped and cross-tenant access is blocked.
- Verify audit logs are written for client create/update/archive, profile access, and lead stage transitions.
- Run API integration tests, authorization tests, E2E roster/profile/CRM tests, lint, typecheck, and build.
- Close any gaps with code/docs/tests before M4 starts.

## M4 - Forms, Check-Ins, Metrics, External APIs
Status: Complete. Tickets 013A through 013G are complete, including the mandatory M4 review gate.

Goal: implement forms/check-ins and typed data extraction for analysis systems.

Scope:
- Persist forms, form versions, assignments, submissions.
- Implement form builder save/publish.
- Implement client-facing public or portal submission flow.
- Implement check-in review queue.
- Extract configured metrics into typed tables.
- Implement external analysis REST APIs.
- Implement API keys, scopes, rate limits, optional IP allowlist.
- Implement signed external webhooks.

Verification:
- Form schema versioning works.
- Submissions reference immutable form versions.
- Typed metrics are extracted and queryable.
- External APIs are de-identified by default.
- PII scope is required and audited.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against `docs/adr/ADR-004-forms-checkins-and-external-analysis.md`, form/check-in data model, and external API contracts.
- Verify form definitions are versioned and published versions are immutable.
- Verify submissions store raw JSON answers tied to the exact form version.
- Verify check-in review queue, review action, complete action, and status transitions work.
- Verify typed metric extraction creates queryable `client_measurements` or equivalent records.
- Verify external APIs are de-identified by default and PII requires explicit elevated scope.
- Verify API keys are hashed, scoped, revocable, rate-limited, audited, and optionally IP-restricted.
- Verify signed external webhook delivery, retry, and delivery audit records work.
- Run form builder tests, submission integration tests, metric extraction tests, external API tests, webhook signing tests, E2E check-in flow, lint, typecheck, and build.
- Close any gaps with code/docs/tests before M5 starts.

## M5 - Training
Status: Complete. Tickets 014A through 014F are complete; continue with M6 / Ticket 015 for nutrition persistence.

Goal: real training templates, exercise libraries, and assignments.

Scope:
- Persist global/private exercise libraries.
- Implement exercise creation with R2 video upload metadata.
- Implement training program templates.
- Implement client-specific assignment snapshots.
- Replace training fixtures with real APIs.

Verification:
- Global records are read-only to tenants.
- Tenant private records are isolated.
- Assignments snapshot exercise details.
- Upload URLs are signed and scoped.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against training product scope, training data model, and training API contracts.
- Verify global exercise library records are readable but not mutable by tenant users.
- Verify tenant-owned exercise records are isolated by organization.
- Verify exercise creation validates inputs and media metadata before persistence.
- Verify R2 signed upload URL flow is scoped by organization, role, content type, and size limits.
- Verify training templates can be created and assigned to clients.
- Verify client assignments snapshot exercise details and remain stable after library/template edits.
- Run training API integration tests, assignment snapshot tests, storage authorization tests, E2E training/exercise flows, lint, typecheck, and build.
- Close any gaps with code/docs/tests before M6 starts.

## M6 - Nutrition
Status: Complete. Tickets 015A through 015E are complete, including the mandatory M6 review gate.

Goal: real meal plans and food libraries.

Scope:
- Persist global/private food library.
- Implement meal plan templates.
- Implement client-specific meal plan assignments.
- Replace nutrition fixtures with real APIs.

Verification:
- Macro targets persist.
- Assigned plans snapshot food/template details.
- Client profile nutrition tab uses real data.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against nutrition product scope, nutrition data model, and nutrition API contracts.
- Verify global food library records are readable but not mutable by tenant users.
- Verify tenant-owned food records are isolated by organization.
- Verify meal plan templates persist macro targets and structured plan data.
- Verify meal plan assignments snapshot template/food details and remain stable after edits.
- Verify client profile nutrition tab reads real persisted data.
- Verify validation covers macro values, serving values, and required plan fields.
- Run nutrition API integration tests, assignment snapshot tests, E2E meal-plan/food flows, lint, typecheck, and build.
- Close any gaps with code/docs/tests before M7 starts.

## M7 - Messaging, Tasks, Dashboard Data
Status: Complete. Tickets 016A through 016F are complete with schema/API foundations, messages UI persistence, dashboard task/card persistence, notification/Resend workflow persistence, operations E2E coverage, and the mandatory M7 review gate.

Goal: make daily operating workflows real.

Scope:
- Persist conversations, messages, attachments, read receipts.
- Implement task CRUD and completion.
- Wire dashboard cards to real data.
- Implement in-app notification records.
- Add Resend transactional email for key events.

Verification:
- Messages and read receipts persist.
- Attachments use organization-scoped R2 signed upload URLs and object key access checks.
- Dashboard reflects real tenant data.
- Email delivery events are recorded.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against messaging/tasks/dashboard product scope, data model, and API contracts.
- Verify conversations, messages, attachments, and read receipts persist and are tenant-scoped.
- Verify message attachments use organization-scoped R2 signed upload URLs and object key access checks.
- Verify task CRUD, assignment, category, priority, and completion flows work.
- Verify dashboard cards use real tenant data for available domains rather than stale fixtures.
- Verify in-app notifications and Resend transactional email records are created for required events.
- Verify logs redact message bodies and sensitive data by default.
- Run messaging API tests, task API tests, dashboard data tests, email workflow tests, E2E messaging/task/dashboard flows, lint, typecheck, and build.
- Close any gaps with code/docs/tests before M8 starts. Complete for M7 on May 18, 2026.

## M8 - Payments And Packages
Status: Complete. Tickets 017A through 017H are complete with package/payment schema foundations, tenant-scoped package APIs, Stripe Connect account-link onboarding, trusted Stripe product/price sync, Stripe Checkout client subscription creation, idempotent Stripe webhook processing, API-backed packages UI, revenue dashboard persistence, payments E2E coverage, and the mandatory M8 review gate.

Goal: connect packages and client subscriptions to Stripe Connect/Billing.

Scope:
- Stripe Connect onboarding/account status.
- Package to Stripe product/price mapping.
- Client subscription creation.
- Stripe webhook ingestion and idempotent processing.
- Revenue dashboard data from local Stripe-derived records.

Verification:
- Webhook signatures are verified.
- Duplicate webhooks are idempotent.
- Subscription status is Stripe-driven.
- Payment events are audited.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against package/payment product scope, payment data model, Stripe API contracts, and `docs/adr/ADR-003-data-storage-and-integrations.md`.
- Verify Stripe Connect onboarding/account-link flow works and status is persisted.
- Verify packages map to Stripe products/prices without trusting client-provided Stripe identifiers.
- Verify client subscription creation works and local subscription status is updated only through trusted Stripe-derived events.
- Verify Stripe webhook signatures are validated and duplicate events are idempotent.
- Verify payment/revenue dashboard data is derived from persisted Stripe event/subscription records.
- Verify payment events are audited and logs do not expose secrets or sensitive payment data.
- Run Stripe webhook tests, idempotency tests, package/subscription integration tests, E2E package flow, lint, typecheck, and build.
- Close any gaps with code/docs/tests before M9 starts.

## M9 - Education And Supplementation
Status: Complete. Tickets 018A-018F are complete with education/supplementation schema foundations, tenant-scoped APIs, R2-backed education upload URLs, API-backed education and supplementation UI, demo seed records, component tests, E2E coverage, and the mandatory review gate.

Goal: complete remaining content/plan domains.

Scope:
- Persist education resources and assignments.
- Persist supplement libraries/templates/assignments.
- Implement R2-backed resource uploads.
- Replace education/supplement fixtures with real APIs.

Verification:
- Resource assignment works.
- Supplement protocol creation persists.
- Global/private libraries work consistently.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against education/supplementation product scope, data model, and API contracts.
- Verify education resources can be created, updated, uploaded, assigned, and read by authorized users.
- Verify resource file uploads use R2 object metadata and signed access controls.
- Verify supplement global/private library behavior matches exercise/food library isolation rules.
- Verify supplement protocols/templates persist timing, dosage, bioavailability notes, clinical description, tags, and categories.
- Verify supplement assignments snapshot template/library details when required.
- Verify client access to assigned resources/supplements is scoped and audited.
- Run education API tests, supplement API tests, storage access tests, E2E education/supplement flows, lint, typecheck, and build.
- Close any gaps with code/docs/tests before M10 starts.

## M10 - Team, Observability, Hardening
Status: Complete. Ticket 019 is complete with team invitations and role management, audit views, Sentry, structured request-aware logging, durable rate limits, security/performance/accessibility reviews, deployment docs, clean Neon migration/seed verification, full Playwright smoke coverage, and the mandatory M10 review gate.

Goal: production readiness for core product.

Scope:
- Team invitations and role management.
- Sentry integration.
- Structured logging with request ids.
- Admin-facing audit/event views if prioritized.
- Rate limits.
- Security review.
- Performance review.
- Accessibility pass.

Verification:
- Security checklist passes.
- Coverage gate passes.
- No high/critical dependency issues.
- Observability captures request/job/webhook errors.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against `docs/checklists/production-readiness-checklist.md`, architecture observability/security sections, and team management scope.
- Verify team invitations, membership updates, role changes, and owner/admin protections work.
- Verify Sentry captures expected client/server errors in non-production test mode.
- Verify structured logs include request ids and safe actor/organization context.
- Verify logs redact secrets, tokens, raw PII, raw health notes, and sensitive message/form content.
- Verify rate limits are enforced for auth-sensitive, mutation-heavy, and external API endpoints.
- Verify security review, dependency audit, performance review, accessibility pass, and coverage gate are completed.
- Run full test suite, E2E critical flows, coverage, lint, typecheck, build, security scan, and deployment smoke where available.
- Close any gaps with code/docs/tests before M11 starts.

## M11 - Full Social Functionality
Status: Complete. Ticket 020 is complete with social persistence, OAuth state handling, encrypted tokens, scheduling, cancellation, local revocation, posting retries, analytics snapshots, provider ADR, API-backed UI, documentation, coverage, build, and Playwright verification. Live Meta/X posting remains gated by external provider app approval and production credentials.

Goal: move beyond content calendar into real social integrations.

Scope:
- Provider selection and ADR.
- OAuth per social provider.
- Content scheduling.
- Media validation/transcoding as required.
- Posting workflows and retries.
- Provider policy/app-review documentation.
- Analytics ingestion where APIs allow.

Verification:
- OAuth secrets are environment-only.
- Failed post retries are durable.
- Provider rate limits and policy failures are handled.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against the accepted social integration ADR/specs created for this phase.
- Verify each enabled provider has OAuth, token storage, refresh, revocation, and environment-only secrets.
- Verify scheduled content, media validation, posting, retry, cancellation, and failure states work.
- Verify provider rate limits, permission failures, policy restrictions, and app-review requirements are documented and handled.
- Verify posted content and provider responses are audited without logging access tokens or sensitive client data.
- Verify social features remain tenant-scoped and role-protected.
- Run provider adapter unit tests, OAuth integration tests with mocks/sandbox accounts, job retry tests, E2E scheduling/posting flows, lint, typecheck, and build.
- Close any gaps with code/docs/tests before M12 starts.

## M12 - AI-Assisted Coaching
Goal: add user-facing AI features with safety, audit, and cost controls.

Scope:
- Check-in summaries.
- Risk flags.
- Workout/nutrition suggestions.
- Form extraction enhancement.
- Message drafting.
- Resource recommendations.
- Prompt/version registry.
- Human approval workflows.
- Cost and usage tracking.

Verification:
- AI actions are audited.
- Sensitive data is redacted/minimized.
- Human approval is enforced for client-impacting suggestions.
- Costs are tracked per organization.

Mandatory Review Gate:
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Steps:
- Compare implementation against the accepted AI feature ADR/specs created for this phase.
- Verify every AI workflow has prompt/version tracking, input/output handling rules, audit records, and cost attribution.
- Verify sensitive data is minimized, redacted where required, and never written to unsafe logs.
- Verify human approval is enforced before client-impacting recommendations are sent or applied.
- Verify check-in summaries, risk flags, suggestions, extraction enhancements, message drafts, and recommendations match their specs.
- Verify fallback/error behavior works when the AI provider is unavailable or returns invalid output.
- Verify organization-level usage/cost reporting is accurate and rate/budget limits are enforced.
- Run AI workflow unit tests with mocked providers, approval-flow integration tests, redaction tests, audit/cost tests, E2E assisted-coaching flows, lint, typecheck, and build.
- Close any gaps with code/docs/tests before calling M12 complete.
