# M5 Training Persistence Checklist

## Phase Status
- [x] M5 implementation started.
- [x] Ticket 014A schema, exercise API, and exercise UI persistence foundation complete.
- [x] Ticket 014B training template UI and assignment UI persistence complete.
- [x] Ticket 014C R2 signed exercise media upload path complete.
- [x] Ticket 014D client profile training integration complete.
- [x] Ticket 014E E2E training flows complete.
- [x] Ticket 014F mandatory review gate complete.

## Schema And Migration
- [x] Prisma models exist for exercise library items, training program templates, and training program assignments.
- [x] Migration is forward-only and safe for Neon deployment.
- [x] Global exercise records support nullable `organization_id`.
- [x] Private exercise records require organization ownership.
- [x] Training assignments store immutable `snapshot_json`.
- [x] Demo seed data creates global/private exercises, a template, and an assignment.

## Exercise Library
- [x] `GET /api/v1/exercises` returns global exercises and active organization private exercises.
- [x] `POST /api/v1/exercises` validates and creates private organization exercises.
- [x] `GET /api/v1/exercises/{exercise_id}` reads global or organization-owned exercises.
- [x] `PATCH /api/v1/exercises/{exercise_id}` updates only private organization-owned exercises.
- [x] Global exercises are read-only to tenant users.
- [x] Exercise database UI loads persisted API data and renders empty/error states when unavailable.
- [x] Add-exercise UI saves through the persistence API.

## Templates And Assignments
- [x] `GET /api/v1/training-program-templates` lists organization-owned templates.
- [x] `POST /api/v1/training-program-templates` validates and creates template JSON.
- [x] `GET /api/v1/training-program-assignments` lists organization-scoped assignments.
- [x] `POST /api/v1/training-program-assignments` creates immutable assignment snapshots from templates.
- [x] `GET /api/v1/clients/{client_id}/training-programs` returns scoped client training assignments.
- [x] Program library UI uses persisted templates and assignments.
- [x] Client assignment UI can assign templates to clients.
- [x] Client profile training tab reads persisted training assignments.

## Media Uploads
- [x] R2 signed upload URL endpoint exists.
- [x] Upload requests validate content type and file size.
- [x] Upload object keys are organization-scoped.
- [x] Exercise media object keys are persisted only after authorization.

## Tests
- [x] API tests cover exercise library isolation.
- [x] API tests cover global read/private write behavior.
- [x] API tests cover training template creation/listing.
- [x] API tests cover assignment snapshot immutability.
- [x] Component tests cover API-backed exercise database load.
- [x] Component tests cover add-exercise persistence submit.
- [x] Component tests cover program template and assignment UI persistence.
- [x] Component tests cover client profile training assignment integration.
- [x] Storage authorization tests cover signed upload flow.
- [x] E2E tests cover exercise create and training assignment flows.
- [x] `pnpm --dir apps/web check` passes for Ticket 014A.
- [x] `pnpm --dir apps/web check` passes for Ticket 014B.
- [x] `pnpm --dir apps/web check` passes for Ticket 014C.
- [x] `pnpm --dir apps/web check` passes for Ticket 014D.
- [x] `pnpm --dir apps/web check` passes for Ticket 014E.

## Mandatory Review Gate
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Review steps:
- [x] Compare code against `docs/technical/training-persistence.md`.
- [x] Compare code against `docs/api/api-contract-spec.md`.
- [x] Compare code against `docs/architecture/data-model-spec.md`.
- [x] Verify all checklist items above are complete or explicitly deferred outside M5 through updated roadmap docs.
- [x] Run migrations against a clean database.
- [x] Run seed against a clean database.
- [x] Run API integration tests.
- [x] Run component tests.
- [x] Run E2E tests.
- [x] Run `pnpm --dir apps/web check`.
- [x] Close every gap before M5 is marked complete.
