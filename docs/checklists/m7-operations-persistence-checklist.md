# M7 Messaging, Tasks, Dashboard Data Checklist

## Phase Status
- [x] M7 implementation started.
- [x] Ticket 016A messaging/task/notification/email schema and API foundation complete.
- [x] Ticket 016B messages UI persistence complete.
- [x] Ticket 016C dashboard task and card persistence complete.
- [x] Ticket 016D notification and Resend email workflow complete.
- [x] Ticket 016E E2E operations flows complete.
- [x] Ticket 016F mandatory review gate complete.

## Schema And Migration
- [x] Prisma models exist for conversations, messages, attachments, and read receipts.
- [x] Prisma model exists for in-app notifications.
- [x] Prisma model exists for task CRUD and completion.
- [x] Prisma model exists for email delivery events.
- [x] Migration is forward-only and safe for Neon deployment.
- [x] Demo seed data creates conversations, messages, tasks, notifications, and email delivery records.

## Messaging
- [x] `GET /api/v1/conversations` lists tenant-scoped conversations.
- [x] `POST /api/v1/conversations` creates conversations only for organization-scoped clients.
- [x] `GET /api/v1/conversations/{conversation_id}/messages` lists tenant-scoped messages.
- [x] `POST /api/v1/conversations/{conversation_id}/messages` creates coach-authored messages.
- [x] `POST /api/v1/messages/{message_id}/read` creates/upserts read receipts.
- [x] Message attachments use organization-scoped R2 signed upload URLs and object key validation before send.
- [x] Messages UI loads persisted API data and renders empty/error states when unavailable.
- [x] Messages UI can send persisted messages.

## Tasks And Dashboard
- [x] `GET /api/v1/tasks` lists organization-scoped tasks.
- [x] `POST /api/v1/tasks` creates organization-scoped tasks.
- [x] `PATCH /api/v1/tasks/{task_id}` updates organization-scoped tasks.
- [x] `POST /api/v1/tasks/{task_id}/complete` completes organization-scoped tasks.
- [x] Dashboard Work To-Do uses persisted tasks.
- [x] Dashboard task creation panel creates persisted tasks.
- [x] Dashboard summary cards use real tenant data for available domains.

## Notifications And Email
- [x] Notification records have recipient, entity, read state, and created timestamp fields.
- [x] Email delivery records have provider, provider email id, recipient, subject, status, event type, and error fields.
- [x] Notification APIs list and mark notifications read.
- [x] Resend send helper records queued/sent/failed email delivery status.
- [x] Resend webhook persists delivery/bounce/complaint events.
- [x] Logs redact message bodies and email contents by default.

## Tests
- [x] API tests cover conversation creation/listing and inaccessible client rejection.
- [x] API tests cover message creation/listing and read receipts.
- [x] API tests cover task creation/listing/update/completion.
- [x] API tests cover invalid task validation.
- [x] `pnpm --dir apps/web test -- operations-api.test.ts` passes for Ticket 016A.
- [x] `pnpm --dir apps/web test -- remaining-ui-pages.test.tsx` passes for Ticket 016B.
- [x] Component tests cover messages UI persistence.
- [x] `pnpm --dir apps/web test -- dashboard-page.test.tsx` passes for Ticket 016C.
- [x] Component tests cover dashboard task persistence.
- [x] `pnpm --dir apps/web test -- notifications-email-api.test.ts app-shell.test.tsx` passes for Ticket 016D.
- [x] API tests cover notification/email delivery workflows.
- [x] E2E tests cover messaging/task/dashboard flows.
- [x] E2E tests cover notification/email route smoke flows.
- [x] `pnpm --dir apps/web exec playwright test --grep "M7 operations"` passes for Ticket 016E.
- [x] `pnpm --dir apps/web check` passes for Ticket 016A.
- [x] `pnpm --dir apps/web check` passes for Ticket 016B.
- [x] `pnpm --dir apps/web check` passes for Ticket 016C.
- [x] `pnpm --dir apps/web check` passes for Ticket 016D.
- [x] `pnpm --dir apps/web check` passes for Ticket 016E.

## Mandatory Review Gate
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Review steps:
- [x] Compare code against operations product scope and this checklist.
- [x] Compare code against `docs/api/api-contract-spec.md`.
- [x] Compare code against `docs/architecture/data-model-spec.md`.
- [x] Verify all checklist items above are complete or explicitly deferred outside M7 through updated roadmap docs.
- [x] Run migrations against a clean database.
- [x] Run seed against a clean database.
- [x] Run messaging API tests.
- [x] Run task API tests.
- [x] Run dashboard data tests.
- [x] Run notification/email workflow tests.
- [x] Run E2E messaging/task/dashboard flows.
- [x] Run `pnpm --dir apps/web check`.
- [x] Close every gap before M7 is marked complete.

Review result:
- [x] Review found one M7 gap: message attachment upload/object keys needed an explicit organization-scoped signed upload endpoint and send-time object key validation.
- [x] Gap closed with `POST /api/v1/messages/attachment-upload-url`, message attachment object key validation, updated API docs, and API test coverage.
