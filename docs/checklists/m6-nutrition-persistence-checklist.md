# M6 Nutrition Persistence Checklist

## Phase Status
- [x] M6 implementation started.
- [x] Ticket 015A food library schema, API, seed data, and food database UI persistence foundation complete.
- [x] Ticket 015B meal plan template and assignment persistence complete.
- [x] Ticket 015C client profile nutrition integration complete.
- [x] Ticket 015D E2E nutrition flows complete.
- [x] Ticket 015E mandatory review gate complete.

## Schema And Migration
- [x] Prisma model exists for food library items.
- [x] Migration is forward-only and safe for Neon deployment.
- [x] Global food records support nullable `organization_id`.
- [x] Private food records require organization ownership.
- [x] Prisma models exist for meal plan templates and meal plan assignments.
- [x] Meal plan assignments store immutable `snapshot_json`.
- [x] Demo seed data creates global/private foods.
- [x] Demo seed data creates a meal plan template and assignment.

## Food Library
- [x] `GET /api/v1/foods` returns global foods and active organization private foods.
- [x] `POST /api/v1/foods` validates macro/serving values and creates private organization foods.
- [x] `GET /api/v1/foods/{food_id}` reads global or organization-owned foods.
- [x] `PATCH /api/v1/foods/{food_id}` updates only private organization-owned foods.
- [x] Global foods are read-only to tenant users because food mutation routes only address private organization-owned records.
- [x] Food database UI loads persisted API data and renders empty/error states when unavailable.
- [x] Food database UI can create a persisted private food.

## Templates And Assignments
- [x] `GET /api/v1/meal-plan-templates` lists organization-owned templates.
- [x] `POST /api/v1/meal-plan-templates` validates and creates template JSON.
- [x] `GET /api/v1/meal-plan-assignments` lists organization-scoped assignments.
- [x] `POST /api/v1/meal-plan-assignments` creates immutable assignment snapshots from templates.
- [x] `GET /api/v1/clients/{client_id}/meal-plans` returns scoped client meal plan assignments.
- [x] Meal plan UI uses persisted templates and assignments.
- [x] Client assignment UI can assign meal plan templates to clients.
- [x] Client profile nutrition tab reads persisted meal plan assignments.

## Tests
- [x] API tests cover food library isolation.
- [x] API tests cover global read/private write behavior.
- [x] API tests cover food macro validation.
- [x] API tests cover private food update and global food update rejection.
- [x] Component tests cover API-backed food database load.
- [x] Component tests cover food database persistence submit.
- [x] API tests cover meal template creation/listing.
- [x] API tests cover assignment snapshot immutability.
- [x] Component tests cover meal plan template and assignment UI persistence.
- [x] Component tests cover client profile meal plan assignment integration.
- [x] E2E tests cover food create and meal assignment flows.
- [x] `pnpm --dir apps/web check` passes for Ticket 015A.
- [x] `pnpm --dir apps/web check` passes for Ticket 015B.
- [x] `pnpm --dir apps/web check` passes for Ticket 015C.
- [x] `pnpm --dir apps/web check` passes for Ticket 015D.
- [x] `pnpm --dir apps/web check` passes for Ticket 015E.

## Mandatory Review Gate
Prompt: "Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Review steps:
- [x] Compare code against `docs/technical/nutrition-persistence.md`.
- [x] Compare code against `docs/api/api-contract-spec.md`.
- [x] Compare code against `docs/architecture/data-model-spec.md`.
- [x] Verify all checklist items above are complete or explicitly deferred outside M6 through updated roadmap docs.
- [x] Run migrations against a clean database.
- [x] Run seed against a clean database.
- [x] Run API integration tests.
- [x] Run component tests.
- [x] Run E2E tests.
- [x] Run `pnpm --dir apps/web check`.
- [x] Close every gap before M6 is marked complete.
