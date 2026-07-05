# M9 Education And Supplementation Checklist

## Phase Status
- [x] M9 implementation started.
- [x] Ticket 018A education/supplementation persistence and API foundation complete.
- [x] Ticket 018B education resource upload flow complete.
- [x] Ticket 018C education UI persistence complete.
- [x] Ticket 018D supplement UI persistence complete.
- [x] Ticket 018E education/supplement E2E coverage complete.
- [x] Ticket 018F mandatory review gate complete.

## Schema And Migration
- [x] Prisma models exist for education resources and education resource assignments.
- [x] Prisma models exist for supplement library items, supplement plan templates, and supplement plan assignments.
- [x] Supplement library records support global/private isolation.
- [x] Supplement templates persist structured timing, dosage, notes, tags, category, bioavailability notes, and clinical description data.
- [x] Supplement assignments write immutable template snapshots.
- [x] Education resources persist object ids, external URLs, tags, type, visibility, and creator.
- [x] Education assignments persist assigned client, assigning user, status, assigned timestamp, and completion timestamp.
- [x] Migration is forward-only and safe for Neon deployment.
- [x] Demo seed data creates education and supplement records.

## Supplementation APIs
- [x] `GET /api/v1/supplements` lists global and active-organization private supplements.
- [x] `POST /api/v1/supplements` creates active-organization private supplements.
- [x] `GET /api/v1/supplement-plan-templates` lists active-organization supplement templates.
- [x] `POST /api/v1/supplement-plan-templates` creates active-organization supplement templates.
- [x] `GET /api/v1/supplement-plan-templates/{template_id}` returns one active-organization supplement template for editing.
- [x] `GET /api/v1/supplement-plan-assignments` lists active-organization supplement assignments.
- [x] `POST /api/v1/supplement-plan-assignments` assigns supplement templates to active-organization clients.

## Education APIs
- [x] `GET /api/v1/education-resources` lists active-organization education resources.
- [x] `POST /api/v1/education-resources` creates active-organization education resources.
- [x] `GET /api/v1/education-resources/{resource_id}` reads one active-organization education resource.
- [x] `PATCH /api/v1/education-resources/{resource_id}` updates one active-organization education resource.
- [x] `POST /api/v1/education-resources/{resource_id}/assignments` assigns resources to active-organization clients.
- [x] Education resource upload URL endpoint creates R2-backed object ids.

## Tests
- [x] API tests cover supplement library isolation.
- [x] API tests cover supplement template creation.
- [x] API tests cover supplement assignment snapshots.
- [x] API tests cover education resource list/create/read/update.
- [x] API tests cover education assignment tenant scoping.
- [x] API tests cover education write authorization.
- [x] Storage tests cover education upload URL validation.
- [x] Component tests cover API-backed education UI.
- [x] Component tests cover API-backed supplement UI.
- [x] E2E tests cover education and supplement flows.
- [x] `pnpm --dir apps/web check` passes for every M9 slice completed so far.

## Mandatory Review Gate
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Review steps:
- [x] Compare code against education/supplementation product scope and this checklist.
- [x] Compare code against `docs/api/api-contract-spec.md`.
- [x] Compare code against `docs/architecture/data-model-spec.md`.
- [x] Compare code against `docs/adr/ADR-003-data-storage-and-integrations.md`.
- [x] Verify all checklist items above are complete or explicitly deferred outside M9 through updated roadmap docs.
- [x] Run migrations against a clean database.
- [x] Run seed against a clean database.
- [x] Run education API tests.
- [x] Run supplement API tests.
- [x] Run storage access tests.
- [x] Run education/supplement E2E flows.
- [x] Run `pnpm --dir apps/web check`.
- [x] Close every gap before M9 is marked complete.
