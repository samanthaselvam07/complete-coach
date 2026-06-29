# Nutrition Persistence

Ticket 015 / M6 replaces fixture-only nutrition screens with persisted food libraries, meal plan templates, assignment snapshots, and client nutrition integrations.

## Current State
- `/nutrition/food-database` loads persisted foods from `GET /api/v1/foods?limit=100` and renders an empty/error state when the nutrition API is unavailable.
- `/nutrition/food-database` can create a private organization food through `POST /api/v1/foods`.
- Private organization foods can be updated through `PATCH /api/v1/foods/{food_id}`; global foods remain read-only to tenant users.
- `/nutrition/meal-plans` loads persisted meal plan templates, meal plan assignments, and active clients from the API without local fixture fallback.
- `/nutrition/meal-plans` can create persisted meal plan templates and assign templates to active clients.
- `/clients/{client_id}` Nutrition now reads persisted meal plan assignments from `GET /api/v1/clients/{client_id}/meal-plans`, derives active macros from assignment snapshots, renders snapshot meal schedules, and shows an unassigned state when no persisted plan exists.
- Prisma includes `food_library_items`, `meal_plan_templates`, and `meal_plan_assignments`.
- API foundations exist for food library reads/writes, meal template reads/writes, organization assignment reads/writes, and client-scoped meal plan reads.

## Ticket 015A Outcome
Completed on May 18, 2026.

Delivered:
- Forward-only Prisma migration for `food_library_items`.
- Global food records are represented with `organization_id = null`; tenant private records require `organization_id`.
- Food APIs enforce active organization scope and create private tenant-owned foods only.
- Food create validation covers required serving values and macro/calorie ranges.
- Demo seed data creates one global food and one private organization food.
- Food database UI loads persisted food library data and saves new foods through the API without local fixture fallback.
- API, mapper, and component tests cover food isolation, global read/private write behavior, validation, API-backed load, and UI persistence submit.
- AUS/NZ food database CSV imports can be dry-run or committed with `pnpm --dir apps/web food:import:fsanz <csv-path> --source-id fsanz_ausnut --version <source-version>`. The importer writes global verified foods through the existing food import planner and preserves source metadata for future nutrient expansion.

## Ticket 015B Outcome
Completed on May 18, 2026.

Delivered:
- Forward-only Prisma migration for meal plan template and assignment status enums, `meal_plan_templates`, and `meal_plan_assignments`.
- Meal templates persist macro targets, phase, status, and structured `template_json`.
- Meal assignments copy macro targets from the selected template and store an immutable `snapshot_json` with template/food details.
- Demo seed data creates a published meal template and an active meal plan assignment for the demo client.
- Meal plan APIs enforce active organization scope and verify client/template ownership before assignment.
- Meal plan UI loads persisted templates and assignments, can create a template, can assign a template to an active client, and renders empty/error states when persistence APIs are unavailable.
- API, mapper, and component tests cover template creation/listing, assignment snapshot creation, scoped client meal plan reads, and UI persistence flows.

## Ticket 015C Outcome
Completed on May 18, 2026.

Delivered:
- Client profile Nutrition tab loads client-scoped persisted meal plan assignments alongside profile and training data.
- Active nutrition macro cards prefer immutable assignment snapshot targets and fall back to assignment target columns.
- Meal schedule rows are derived from assignment `snapshot.template.days[].meals[]` and show food names, serving sizes, and meal calories.
- Empty persisted nutrition states display an explicit unassigned message instead of fixture data.
- Preview environments must use seeded Neon data for nutrition plans; local fixture nutrition plans are not used for runtime pages.
- Component tests cover API-backed nutrition assignments, empty persisted nutrition state, and nutrition snapshot mapping helpers.

## Ticket 015D Outcome
Completed on May 18, 2026.

Delivered:
- Playwright E2E coverage for creating an API-backed private food from `/nutrition/food-database`.
- Playwright E2E coverage for creating an API-backed meal template from `/nutrition/meal-plans`.
- Playwright E2E coverage for assigning that meal template to an active client and verifying the active assignment table updates.
- E2E route interception asserts request payloads for food creation, template creation, and assignment creation.

## Ticket 015E Outcome
Completed on May 18, 2026.

Delivered:
- Mandatory M6 review gate compared delivered code against nutrition specs, API contracts, data model specs, and the M6 checklist.
- Closed the discovered API gap by adding `PATCH /api/v1/foods/{food_id}` for organization-owned private foods.
- Global food records remain readable but are not mutable by tenant users; other-tenant private foods are not addressable.
- API tests now cover private food update success, global food update rejection, and empty update validation.

## Source Specs
- `docs/architecture/data-model-spec.md`
- `docs/api/api-contract-spec.md`
- `docs/roadmap/implementation-roadmap.md`
- `docs/roadmap/implementation-ticket-map.md`
- `docs/checklists/m6-nutrition-persistence-checklist.md`

## Data Model
- `food_library_items`: global/private library records with serving sizes, calories, macro grams, optional fiber, optional metadata, and soft-delete support.
- `meal_plan_templates`: organization-owned template records with phase, target calories, macro grams, status, structured `template_json`, creator, timestamps, and soft-delete support.
- `meal_plan_assignments`: organization/client-scoped assignment records with copied template targets, status, start/end dates, immutable `snapshot_json`, creator, and timestamps.
- Food import processors can write source-tracked global foods into `food_library_items` while preserving source IDs, source food IDs, source versions, barcodes, regions, and full nutrient rows inside `metadata`.

Rules:
- Global foods have `scope = global` and no `organization_id`.
- Private foods have `scope = private` and an `organization_id`.
- Tenant users can read global foods and their organization private foods.
- Tenant users can only create private foods in their own organization.
- Meal plan assignments snapshot template/food details at assignment time and do not depend on subsequent template edits.

## API Surface
- `GET /api/v1/foods`
- `POST /api/v1/foods`
- `GET /api/v1/foods/{food_id}`
- `PATCH /api/v1/foods/{food_id}`
- `GET /api/v1/meal-plan-templates`
- `POST /api/v1/meal-plan-templates`
- `GET /api/v1/meal-plan-assignments`
- `POST /api/v1/meal-plan-assignments`
- `GET /api/v1/clients/{client_id}/meal-plans`

## Import Commands
- `pnpm --dir apps/web food:import:usda "search term"` dry-runs a USDA FoodData Central import plan.
- `pnpm --dir apps/web food:import:usda "search term" --commit` writes the USDA import plan to global foods.
- `pnpm --dir apps/web food:import:candidates ./foods.json` dry-runs source-normalised food candidate imports.
- `pnpm --dir apps/web food:import:candidates ./foods.json --commit` writes source-normalised candidates to global foods.

## Remaining M6 Work
- None. M6 is complete.
