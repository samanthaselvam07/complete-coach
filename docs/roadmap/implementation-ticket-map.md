# Implementation Ticket Map

## Purpose
This is the executable planning bridge between the roadmap and implementation. Each ticket should become one focused branch/PR. Downstream code agents must not combine unrelated tickets.

## Ticket 000 - Repo Activation
Status: Complete.

Scope:
- Add package/workspace foundation.
- Add root commands for bootstrap, lint, typecheck, test, coverage, build.
- Fix pre-commit assumptions so it only references existing commands.
- Add import-boundary script.

Depends on:
- Planning docs accepted.

Tests:
- Shell script syntax checks.
- Command smoke checks.

Out of scope:
- Product UI.
- Database schema.

## Ticket 001 - Next.js UI Stub Scaffold
Status: Complete.

Scope:
- Create `apps/web` Next.js App Router app.
- Configure TypeScript, Tailwind, shadcn-compatible setup, test tooling.
- Add root workspace scripts.
- Install generated theme baseline.
- Render a minimal dashboard shell placeholder.

Depends on:
- Ticket 000.

Tests:
- App build smoke.
- Initial route renders.

Out of scope:
- Full UI port.
- Auth.
- Database.

## Ticket 002 - Design System And UI Primitives
Status: Complete.

Scope:
- Port/regenerate shadcn/Radix primitives needed by the exported UI.
- Add `cn` helper and design tokens.
- Add typography/font decision.
- Document parity notes.

Depends on:
- Ticket 001.

Tests:
- Component primitive smoke tests.
- Accessibility smoke for button/input/dialog primitives.

Out of scope:
- Page-level UI.

## Ticket 003 - App Shell And Navigation
Status: Complete.

Scope:
- Implement sidebar/topbar shell.
- Implement nested navigation groups for training, nutrition, supplementation, clients.
- Implement notification dropdown with fixture data.
- Implement active route state.

Depends on:
- Ticket 002.

Tests:
- Navigation renders.
- Active route state works.
- Notification mark-read behavior works locally.

Out of scope:
- Backend notifications.

## Ticket 004 - Dashboard UI Stub
Status: Complete.

Scope:
- Port dashboard page.
- Move dashboard tasks, pipeline events, financial cards, team avatars to fixtures.
- Implement local period selector and task creation behavior.

Depends on:
- Ticket 003.

Tests:
- Dashboard route renders.
- Period selector updates label.
- Task creation adds local fixture-state task.

Out of scope:
- Real revenue/tasks/pipeline APIs.

## Ticket 005 - Clients And CRM UI Stub
Status: Complete.

Scope:
- Port clients roster.
- Port client profile route with decomposition.
- Port CRM board.
- Move clients/leads/profile data to fixtures.

Depends on:
- Ticket 003.

Tests:
- Client search/filter/sort.
- Client profile route renders by id.
- CRM stage drag/drop or equivalent testable transition.

Out of scope:
- Persistence.
- Auth.

## Ticket 006 - Forms And Check-Ins UI Stub
Status: Complete.

Scope:
- Port forms management.
- Port form builder.
- Port check-in management.
- Move form/check-in data to fixtures.

Depends on:
- Ticket 003.

Tests:
- Create form path opens builder.
- Add/remove/reorder form fields.
- Check-in tabs/sorting work.

Out of scope:
- Public form submission.
- Metric extraction.

## Ticket 007 - Training UI Stub
Status: Complete.

Scope:
- Port training overview.
- Port training programs.
- Port exercise database.
- Port add exercise.
- Move exercises/programs to fixtures.

Depends on:
- Ticket 003.

Tests:
- Exercise search/filter.
- Add exercise form local interactions.
- Program tabs render.

Out of scope:
- R2 upload.
- Persisted exercise library.

## Ticket 008 - Nutrition UI Stub
Status: Complete.

Scope:
- Port nutrition overview.
- Port meal plans.
- Port food database.
- Move foods/meal plans to fixtures.

Depends on:
- Ticket 003.

Tests:
- Food search/filter/page interactions.
- Meal plan tab/actions render.

Out of scope:
- Persisted meal plans.

## Ticket 009 - Education, Supplementation, Packages, Messages, Team, Social UI Stub
Status: Complete.

Scope:
- Port remaining prototype pages.
- Move all remaining sample data to fixtures.
- Ensure all listed routes render.

Depends on:
- Ticket 003.

Tests:
- Route smoke for every page.
- Message conversation selection and local send.
- Supplement new protocol panel.

Out of scope:
- Real integrations.

## Ticket 010 - UI Stub E2E And Visual Parity Gate
Status: Complete.

Scope:
- Add Playwright navigation smoke.
- Add visual parity checklist document.
- Add accessibility smoke coverage.
- Ensure no file exceeds 800 lines.

Depends on:
- Tickets 004 through 009.

Tests:
- Playwright route navigation.
- Accessibility checks.
- Build/lint/typecheck.

Out of scope:
- Pixel-perfect automated visual regression unless tooling is explicitly approved.

## Ticket 011 - Auth And Tenant Foundation
Status: Complete.

Scope:
- Add NextAuth/Auth.js.
- Add Prisma and Neon env validation.
- Implement organizations, users, memberships, role/capability helpers.
- Add initial migrations and tests.

Depends on:
- UI stub accepted.

Tests:
- Auth/session helper tests.
- Authorization unit tests.
- Tenant isolation integration tests.
- Auth UI unit tests.
- Playwright sign-in smoke with seeded demo owner credentials when demo credentials are available.

Out of scope:
- Replacing every fixture-backed page.

## Ticket 012 - Client And CRM Persistence
Status: Complete. Merged to `main`, deployed to Vercel, migrated on Neon, seeded, and smoke-tested against the production alias.

Scope:
- Implement clients, client profiles, leads, lead activities APIs.
- Replace clients/CRM fixtures with API-backed data.
- Add audit logging for sensitive reads/writes.

Depends on:
- Ticket 011.

Tests:
- API integration tests.
- E2E clients/CRM flows.
- Cross-tenant access denied tests.

Out of scope:
- Forms/check-ins.

## Ticket 012B - Client And CRM Mutation UI
Status: Complete. Persisted roster and CRM mutation UI is implemented and covered by component and E2E tests.

Scope:
- Add persisted client create, edit, and archive actions to the roster UI.
- Add persisted lead create and edit actions to the CRM board.
- Keep lead stage transitions persisted and reconcile UI state from API responses.
- Add CRM search over persisted lead cards.

Depends on:
- Ticket 012.

Tests:
- Component tests for client create, edit, archive flows.
- Component tests for lead create, edit, search, and stage movement flows.
- API tests for client and lead PATCH fields used by the UI.

Out of scope:
- Rich client profile editing.
- Forms/check-ins.

## Ticket 013 - Forms, Check-Ins, Metrics, External APIs
Status: Complete. Deployment for M3 commit `e2a38e6` is verified; Tickets 013A through 013G are complete and M4 is ready for deployment verification.

Scope:
- Implement form versioning/submissions/check-ins.
- Implement metric extraction.
- Implement external analysis APIs.
- Implement API keys/webhooks.

Depends on:
- Ticket 012.

Tests:
- Form version immutability.
- Metric extraction.
- External API de-identification.
- PII scope enforcement.
- Webhook signing/retry tests.

Out of scope:
- AI extraction enhancements.

Implementation slices:
- Ticket 013A - Schema And Domain Foundation: Complete. Added Prisma models, migration, generated client, seed data, validation schemas, metric extraction helpers, API key hashing helpers, webhook signing helpers, and unit tests.
- Ticket 013B - Forms APIs: Complete. Added form CRUD, immutable version creation, publish, assignment APIs, audit logs, tenant isolation checks, and route integration tests.
- Ticket 013C - Form Builder Persistence UI: Complete. Wired `/forms` to API-backed data for list, save draft, publish, and assign flows with fixture fallback only when the forms API is unavailable.
- Ticket 013D - Submissions, Check-Ins, And Metrics: Complete. Added assignment detail/submission, form submission list/detail, check-in queue/detail/review/complete, extracted metrics, client metrics APIs, idempotent metric extraction, API-backed check-in UI, and tests.
- Ticket 013E - External Read APIs: Complete. Added external API key authentication, scopes, expiry/revocation/IP/rate-limit checks, audit logs, cursor pagination, PII gating, de-identification, and external clients/metrics/submissions/check-ins endpoints.
- Ticket 013F - Exports And Webhooks: Complete. Added external export create/status APIs, webhook endpoint create/list/update/disable APIs, one-time signing secrets, non-retrievable secret storage, pending webhook delivery records, and retry-ready status documentation.
- Ticket 013G - M4 Review Gate: Complete. Ran the mandatory phase review against specs, checklist, code, migrations, tests, and deployed behavior; closed the remaining E2E coverage/docs gaps.

## Ticket 014 - Training Persistence
Status: Complete. Tickets 014A through 014F are complete with schema, exercise APIs, seed data, API-backed exercise UI persistence, API-backed program library assignment UI, scoped exercise media upload authorization, client profile training integration, E2E training flow coverage, and the mandatory M5 review gate.

Scope:
- Exercise libraries.
- Training templates.
- Assignment snapshots.
- R2 signed upload path for exercise videos.

Depends on:
- Ticket 011.

Tests:
- Library isolation.
- Assignment snapshot immutability.
- Signed URL authorization.

Out of scope:
- Nutrition.

Implementation slices:
- Ticket 014A - Schema, Exercise API, And Exercise UI Persistence: Complete. Added training schema, migration, seed data, exercise APIs, template/assignment API foundations, API-backed exercise database, add-exercise persistence, docs, and tests.
- Ticket 014B - Training Template And Assignment UI Persistence: Complete. Wired program library screens to persisted templates and assignments, added template creation from the UI, added template-to-client assignment UI, and covered the flows with component tests.
- Ticket 014C - Exercise Media Upload Authorization: Complete. Added R2-compatible signed PUT URL generation, exercise media upload validation, organization-scoped object keys, audit logging, and create/update validation so exercise media keys must come from the active organization upload path.
- Ticket 014D - Client Training Integration: Complete. Client profile Training tab now loads persisted assignment snapshots through `GET /api/v1/clients/{client_id}/training-programs`, derives assigned program cards and weekly schedule rows from immutable snapshot JSON, and retains fixture fallback behavior.
- Ticket 014E - Training E2E Coverage: Complete. Added Playwright coverage for API-backed exercise creation and program template creation through client assignment, including request payload assertions.
- Ticket 014F - M5 Review Gate: Complete. Ran the mandatory phase review against specs, checklist, code, migrations, tests, and deployed behavior; closed the pending Neon migration/seed gap and verified M5 end to end.

## Ticket 015 - Nutrition Persistence
Status: Complete. Tickets 015A through 015E are complete with food library persistence, meal template/assignment persistence, API-backed meal plan UI, client profile nutrition integration, nutrition E2E coverage, and the mandatory M6 review gate.

Scope:
- Food libraries.
- Meal templates.
- Meal assignments and snapshots.

Depends on:
- Ticket 011.

Tests:
- Library isolation.
- Assignment snapshot immutability.

Out of scope:
- Payments.

Implementation slices:
- Ticket 015A - Food Library Persistence Foundation: Complete. Added food library schema, migration, seed data, food APIs, API-backed food database UI, fixture fallback, docs, and tests.
- Ticket 015B - Meal Template And Assignment Persistence: Complete. Added meal template/assignment schema, immutable assignment snapshots, APIs, seed data, API-backed meal plan UI, docs, and tests.
- Ticket 015C - Client Nutrition Integration: Complete. Client profile Nutrition tab now loads persisted meal plan assignments, derives macros and meal schedules from immutable snapshots, keeps fixture fallback, and includes component/helper tests.
- Ticket 015D - Nutrition E2E Coverage: Complete. Added Playwright coverage for API-backed food creation plus meal template creation and client assignment, with payload assertions.
- Ticket 015E - M6 Review Gate: Complete. Ran the mandatory phase review against specs, checklist, code, migrations, tests, and deployed behavior; closed the private food update API gap and verified M6 end to end.

## Ticket 016 - Messaging, Tasks, Notifications, Email
Status: Complete. Tickets 016A through 016F are complete with schema/API foundations, API-backed messages UI persistence, dashboard task/card persistence, notification/Resend workflow persistence, operations E2E coverage, message attachment signed upload validation, and the mandatory M7 review gate.

Scope:
- Conversations/messages/attachments/read receipts.
- Tasks.
- Notification records.
- Resend transactional email workflow.

Depends on:
- Ticket 011.

Tests:
- Message persistence/read receipts.
- Attachment access checks.
- Email event persistence.

Out of scope:
- SMS/WhatsApp.

Implementation slices:
- Ticket 016A - Operations Persistence Foundation: Complete. Added Prisma models, migration, tenant-scoped messaging APIs, read receipt API, task CRUD/completion APIs, task capabilities, docs, and API tests.
- Ticket 016B - Messages UI Persistence: Complete. Wired `/messages` to conversations/messages APIs with fixture fallback, persisted send behavior, and component coverage.
- Ticket 016C - Dashboard Tasks And Data: Complete. Wired Work To-Do to task APIs for load/create/complete/reopen flows and connected dashboard client/check-in cards to available tenant APIs with fixture fallback.
- Ticket 016D - Notifications And Resend Email Workflow: Complete. Added current-user notification APIs, app shell API-backed notification menu, Resend send helper with delivery status persistence, Resend webhook event handling with optional Svix signature verification, seed records, docs, and tests.
- Ticket 016E - Operations E2E Coverage: Complete. Added Playwright M7 smoke coverage for API-backed messaging, dashboard task/data flows, notifications, and Resend webhook route reachability.
- Ticket 016F - M7 Review Gate: Complete. Ran the mandatory phase review against specs, checklist, code, migrations, tests, and deployed behavior; closed the attachment upload/object validation gap before marking M7 complete.

## Ticket 017 - Stripe Connect And Packages
Status: Complete. Tickets 017A through 017H are complete with package/payment schema foundations, package APIs, Stripe Connect account-link onboarding, trusted Stripe product/price sync, client subscription Checkout creation, Stripe webhook processing, API-backed packages UI, revenue dashboard persistence, payments E2E coverage, seed data, docs, tests, and the mandatory M8 review gate.

Scope:
- Stripe Connect onboarding.
- Package/product/price mapping.
- Client subscriptions.
- Stripe webhook processing.
- Revenue data.

Depends on:
- Ticket 011.

Tests:
- Webhook signature/idempotency.
- Subscription status transitions.
- Payment audit logs.

Out of scope:
- Tax/accounting automation.

Implementation slices:
- Ticket 017A - Package/Payment Persistence Foundation: Complete. Added Prisma models, migration, tenant-scoped package APIs, seed data, docs, and API tests.
- Ticket 017B - Stripe Connect Onboarding: Complete. Added connected account creation/reuse, account-link generation, initial account status persistence, docs, and API tests.
- Ticket 017C - Package Stripe Product/Price Sync: Complete. Added trusted package-to-Stripe product/price sync, Connect setup guard, docs, and API tests.
- Ticket 017D - Client Subscription Creation: Complete. Added subscription list/create APIs, Stripe Checkout subscription session creation, local incomplete subscription mirrors, docs, and API tests.
- Ticket 017E - Stripe Webhook Processing: Complete. Added signature verification, redacted payment event persistence, duplicate event idempotency, subscription state transitions, Connect account status refresh, docs, and API tests.
- Ticket 017F - Packages UI And Revenue Persistence: Complete. Wired package management to persisted package APIs with fixture fallback, added create/edit/archive/sync UI controls, and connected dashboard financial reporting to Stripe-backed subscription records rather than package projection fixtures.
- Ticket 017G - Payments E2E Coverage: Complete. Added Playwright package/subscription/payment smoke flows covering API-backed package management, Stripe sync initiation, Checkout creation, and duplicate webhook handling.
- Ticket 017H - M8 Review Gate: Complete. Ran the mandatory phase review against specs, checklist, code, clean database migrations/seed, targeted tests, payments E2E, and the full app check gate.

## Ticket 018 - Education And Supplementation Persistence
Status: Complete. Tickets 018A-018F are complete.

Scope:
- Education resources and assignments.
- Supplement libraries/templates/assignments.
- R2 resource upload metadata.

Depends on:
- Ticket 011.

Tests:
- Resource assignment.
- Supplement protocol persistence.
- Library isolation.

Out of scope:
- AI recommendations.

Implementation slices:
- Ticket 018A - Education/Supplementation Persistence Foundation: Complete. Added Prisma models, migration, education/supplement APIs, supplement assignment snapshots, education assignment scoping, capability rules, docs, and API tests.
- Ticket 018B - Education Resource Uploads: Complete. Added R2-backed education upload URL validation and object id flow.
- Ticket 018C - Education UI Persistence: Complete. Wired education resource UI to persisted APIs with fixture fallback.
- Ticket 018D - Supplementation UI Persistence: Complete. Wired supplement database and protocol UI to persisted APIs with fixture fallback.
- Ticket 018E - Education/Supplement E2E Coverage: Complete. Added resource and protocol smoke flows.
- Ticket 018F - M9 Review Gate: Complete. Ran the mandatory phase review against specs, checklist, code, clean database migrations/seed, education/supplement/storage tests, E2E flows, and full app check.

## Ticket 019 - Production Hardening
Status: Complete. Implementation, docs, clean Neon migration/seed, critical Playwright smoke tests, dependency audit, and the mandatory M10 review gate are complete.

Scope:
- Sentry.
- Structured logging.
- Rate limits.
- Security pass.
- Performance pass.
- Accessibility pass.
- Deployment docs.

Depends on:
- Core MVP persistence tickets.

Tests:
- Security review.
- Coverage gates.
- E2E critical flows.
- Build and deploy smoke.

Out of scope:
- Full social integrations.

Implementation slices:
- Ticket 019A - Team Management: Complete. Added tenant-scoped invitations, authenticated acceptance, role/status management, last-owner protection, Resend delivery, and audit events.
- Ticket 019B - Audit Visibility: Complete. Added owner/admin cursor-paginated audit APIs and UI with sanitized metadata.
- Ticket 019C - Observability: Complete. Added Sentry server/edge/browser instrumentation, Pino structured logs, request ids, and recursive sensitive-field redaction.
- Ticket 019D - Rate Limits And Security: Complete. Added durable PostgreSQL rate-limit buckets, policy-specific fail behavior, security headers, dependency remediation, and security tests.
- Ticket 019E - Production Review Passes: Complete. Completed code-level performance and accessibility reviews, portable file-size enforcement, production deployment/rollback guidance, and the mandatory implementation gap review.
- Ticket 019F - Final Environment Gate: Complete. Applied pending migrations through `20260606120000_team_invitations`, seeded the configured Neon database, and ran the full 67-test Playwright smoke suite successfully on June 6, 2026.

## Ticket 020 - Full Social Functionality
Status: Complete. M11 persistence, OAuth state handling, token encryption, scheduling, posting worker retries, cancellation, local revocation, analytics snapshots, UI persistence, provider ADR, docs, focused tests, coverage, build, and Playwright verification are complete. Live provider app approval is an external production gate.

Scope:
- Provider selection and ADR.
- OAuth for Meta Instagram, Meta Facebook, and X.
- Encrypted social connections.
- Content scheduling and cancellation.
- Posting worker with durable attempts and retries.
- Provider policy/app-review documentation.
- Analytics snapshots where APIs allow.

Depends on:
- Ticket 019.

Tests:
- Provider metadata, token encryption, redaction, and media validation.
- OAuth start/callback route handlers with mocks.
- Scheduled post creation, cancellation, worker retry, and due scheduled processing.
- Social UI persistence and fallback behavior.

Out of scope:
- User-facing AI automation.
- Real provider app approval.
- Advanced media transcoding worker.

## Ticket 021 - AI-Assisted Coaching
Status: Complete. M12 AI-assisted coaching persistence, CHFI-style check-in review generation, user-facing coach methodology profiles in the check-in AI panel, prompt/version registry, redaction/minimization, approval-gated recommendations, usage/cost reporting, check-in UI integration, ADR/API/schema docs, and focused tests are complete.

Scope:
- Check-in summaries.
- Risk flags.
- Workout and nutrition suggestions.
- Message drafts.
- Resource recommendation and extraction-enhancement output types.
- Prompt/version registry.
- Coach methodology profiles for organization-specific review tone, principles, sections, red-flag rules, and adjustment rules, selectable from the check-in AI review flow.
- Human approval and rejection workflows.
- Organization usage and cost tracking.

Depends on:
- Ticket 020.

Tests:
- AI domain rules, redaction, cost estimation, and CHFI-style output structure.
- AI API generation, authorization, prompt tracking, approval/rejection, and usage reporting.
- Check-in UI generation and approval flow.

Out of scope:
- Live external LLM provider calls.
- Automatic client-facing sending or application of AI recommendations.
- Copying Kahunas credentials or CHFI source PDFs into the repository.
