# Messaging, Tasks, Dashboard Data Persistence

Ticket 016 / M7 replaces local-only operating workflows with persisted conversations, messages, read receipts, tasks, notifications, and email delivery records.

## Current State
- Prisma includes `conversations`, `messages`, `message_attachments`, `message_receipts`, `notifications`, `tasks`, and `email_deliveries`.
- Messaging APIs can create/list conversations, create/list messages, and mark messages read with tenant-scoped access checks.
- Message attachment uploads use short-lived R2 signed PUT URLs and message sends reject attachment object keys outside the active organization's message attachment path.
- Task APIs can create/list/update/complete organization-scoped tasks.
- Messages UI loads and sends persisted messages through the persisted conversation APIs and renders empty/error states when those APIs are unavailable.
- Dashboard Work To-Do loads, creates, completes, and reopens persisted tasks through the task APIs.
- Dashboard capacity, check-in, today's expected check-ins, AI priority flags, CRM pipeline, and revenue cards use tenant data from Neon-backed APIs only.
- Dashboard startup renders empty/zero states when APIs are unavailable and does not fall back to local fixtures or create local-only tasks.
- Notification APIs list current-user notifications and mark one or all notifications read.
- The app shell notification menu loads persisted notifications from the notification APIs and renders an empty count when those APIs are unavailable.
- Resend email delivery helper records queued, sent, and failed states without storing email body content.
- Resend webhook persists delivery, bounce, complaint, and failure events into email delivery records.

## Ticket 016A Outcome
Completed on May 18, 2026.

Delivered:
- Forward-only Prisma migration for messaging, task, notification, and email delivery persistence.
- Tenant-scoped conversation APIs for active organization clients.
- Tenant-scoped message APIs with coach-authored message creation, attachment object references, and read receipt upserts.
- Tenant-scoped task APIs for list, create, update, and completion flows.
- Role capability map now includes `tasks:read` and `tasks:write`.
- API tests cover conversation access, message persistence, read receipts, task CRUD/completion, and validation.
- Verified the full migration stack and seed command against a disposable clean PostgreSQL 16 database.

## Ticket 016B Outcome
Completed on May 18, 2026.

Delivered:
- `/messages` loads conversations from `GET /api/v1/conversations?limit=100` when available.
- Selected persisted conversations load messages from `GET /api/v1/conversations/{conversation_id}/messages?limit=100`.
- Sending a message posts to `POST /api/v1/conversations/{conversation_id}/messages` and appends the persisted response to the thread.
- Fixture-backed conversation and local-send behavior remain available when the API is unavailable.
- Component tests cover persisted conversation load, persisted message load, persisted send, unavailable API empty/error states, and search.

## Ticket 016C Outcome
Completed on May 18, 2026.

Delivered:
- Dashboard Work To-Do loads tasks from `GET /api/v1/tasks?limit=100` when the API is available.
- Dashboard priority flags load pending AI risk outputs from `GET /api/v1/ai/recommendations?type=risk-flag&status=pending-approval&limit=5` and only show medium/high severity flags with expandable coach notes.
- Dashboard task creation posts to `POST /api/v1/tasks` with title, category, and priority.
- Dashboard task completion uses `POST /api/v1/tasks/{task_id}/complete`.
- Dashboard task reopen uses `PATCH /api/v1/tasks/{task_id}` with `status: "open"`.
- Client Capacity uses `GET /api/v1/clients?status=active&limit=100` for the active client count.
- Check Ins uses `GET /api/v1/check-ins?status=pending-review&limit=100` for pending review count.
- Dashboard task and card values no longer fall back to local fixtures when APIs are unavailable.
- Component tests cover persisted dashboard load, task create, task complete, empty unavailable state, and prevention of local-only task creation.

## Ticket 016D Outcome
Completed on May 18, 2026.

Delivered:
- `GET /api/v1/notifications` lists tenant-scoped notifications for the current user with unread filtering.
- `POST /api/v1/notifications/{notification_id}/read` marks one scoped notification as read.
- `POST /api/v1/notifications/read` marks all current-user unread notifications as read.
- App shell notifications load persisted records from `GET /api/v1/notifications?limit=20` and render an empty count/list if the API is unavailable.
- `sendTransactionalEmail` creates queued delivery records, calls Resend through environment-provided credentials, supports inline content or published Resend templates, records sent provider ids, and records failed status on configuration/provider errors.
- `POST /api/webhooks/resend` accepts raw-body Resend events, verifies Svix signatures when `RESEND_WEBHOOK_SECRET` is configured, and persists delivery/bounce/complaint/failure status transitions.
- Seed data now includes a demo conversation, message, dashboard task, notification, and email delivery record.
- Tests cover notification list/read APIs, notification dropdown API behavior, Resend send success/failure, webhook event persistence, and webhook signature verification.

## Ticket 016E Outcome
Completed on May 18, 2026.

Delivered:
- Playwright M7 operations smoke coverage for API-backed message send.
- Playwright M7 operations smoke coverage for dashboard task load, completion, creation, client capacity count, and pending check-in count.
- Playwright M7 operations smoke coverage for persisted notification menu load and mark-all-read behavior.
- Playwright M7 operations smoke coverage for the Resend webhook route contract through a browser-side request.
- The M7 smoke tests mock API responses at the browser boundary so they validate UI contracts without depending on the live database schema state in CI.

## Ticket 016F Outcome
Completed on May 18, 2026.

Delivered:
- Mandatory review gate compared M7 code against the product scope, API contract, data model, checklist, tests, migrations, and seed flow.
- Review found one gap: message attachments needed an explicit organization-scoped signed upload endpoint and send-time object key validation.
- Gap was closed with `POST /api/v1/messages/attachment-upload-url`, shared message attachment upload validation, message send object key enforcement, API docs, and API tests.
- Clean PostgreSQL migration and seed verification passed.
- Full `pnpm --dir apps/web check` passed, including lint, typecheck, 312 unit tests, production build, and 59 Playwright E2E tests.

## Source Specs
- `docs/architecture/data-model-spec.md`
- `docs/api/api-contract-spec.md`
- `docs/roadmap/implementation-roadmap.md`
- `docs/roadmap/implementation-ticket-map.md`
- `docs/checklists/m7-operations-persistence-checklist.md`

## Data Model
- `conversations`: organization/client conversation shells with optional title and updated timestamp.
- `messages`: organization/conversation-scoped message bodies with exactly one sender type.
- `message_attachments`: message-scoped object references validated against the active organization's message attachment object-key namespace.
- `message_receipts`: read receipts keyed by message plus user or client.
- `notifications`: recipient-scoped in-app notification records.
- `tasks`: organization-scoped work items with category, priority, status, due date, assignment, client, and completion fields.
- `email_deliveries`: Resend-oriented delivery/event records with provider message id, recipient, subject, status, and error metadata.

Rules:
- All APIs require an active organization.
- Conversation creation requires the target client to belong to the active organization.
- Message reads/writes require the conversation to belong to the active organization.
- Task reads/writes are scoped to the active organization.
- Audit logs must avoid message body and email content.

## API Surface
- `GET /api/v1/conversations`
- `POST /api/v1/conversations`
- `GET /api/v1/conversations/{conversation_id}/messages`
- `POST /api/v1/conversations/{conversation_id}/messages`
- `POST /api/v1/messages/{message_id}/read`
- `POST /api/v1/messages/attachment-upload-url`
- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{task_id}`
- `POST /api/v1/tasks/{task_id}/complete`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{notification_id}/read`
- `POST /api/v1/notifications/read`
- `POST /api/webhooks/resend`

## Remaining M7 Work
None. M7 is complete.
