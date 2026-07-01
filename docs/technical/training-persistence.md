# Training Persistence

Ticket 014 / M5 replaces fixture-only training screens with persisted exercise libraries, training templates, assignment snapshots, and scoped upload foundations.

## Current State
- `/training/exercises` loads persisted exercises from `GET /api/v1/exercises?limit=100` and renders an empty/error state when the training API is unavailable.
- `/training/exercises/add` now posts new private exercises to `POST /api/v1/exercises`, including free-text rep targets, rest timer defaults, RPE, RIR, external video links, and uploaded video object keys.
- `/training/programs` now prefers persisted templates from `GET /api/v1/training-program-templates`, assignments from `GET /api/v1/training-program-assignments`, and active clients from `GET /api/v1/clients`.
- The `/training/programs` custom exercise dialog persists new exercises to `POST /api/v1/exercises` before adding them to the builder, so body part, default sets/reps/rest/RPE/RIR, external video links, and media references are available in the organization's exercise database.
- `/training/programs` can create a draft program template and assign a persisted template to an active client.
- Exercise media uploads use `POST /api/v1/exercises/media-upload-url` to generate short-lived, organization-scoped R2 `PUT` URLs.
- Client profile Training tabs now load persisted assigned training programs from `GET /api/v1/clients/{client_id}/training-programs`.
- Prisma includes training persistence models for global/private exercise library records, training program templates, and immutable training assignment snapshots.
- API foundations exist for exercise library reads/writes, training template reads/writes, training assignment creation/listing, and client training assignment reads.

## Ticket 014A Outcome
Completed on May 14, 2026.

Delivered:
- Forward-only Prisma migration for `exercise_library_items`, `training_program_templates`, and `training_program_assignments`.
- Enum-backed status/scope/difficulty model for training records.
- Global exercise records are represented with `organization_id = null`; tenant private records require `organization_id`.
- Exercise APIs enforce active organization scope and prevent tenant mutation of global exercises.
- Training assignment creation snapshots template details into `snapshot_json` so assignments remain stable after template edits.
- Demo seed data creates one global exercise, one private exercise, one training template, and one training assignment.
- Component UI now loads persisted exercise library data and saves new exercises through the API without local fixture fallback.
- API and component tests cover training isolation, global read/private write behavior, assignment snapshots, and UI persistence paths.

## Ticket 014B Outcome
Completed on May 14, 2026.

Delivered:
- Program library UI loads persisted active assignments, templates, and active clients when APIs are available.
- Program library renders persisted templates/assignments only; unavailable persistence APIs show empty/error states instead of local demo programs.
- Create New Program posts a draft template to `POST /api/v1/training-program-templates`.
- Use Template opens a client assignment dialog and posts to `POST /api/v1/training-program-assignments`.
- Successful assignment prepends the returned immutable assignment snapshot to the active programs table.
- Component tests cover API-backed template/assignment loading, template creation, and client assignment.

## Ticket 014C Outcome
Completed on May 14, 2026.

Delivered:
- `POST /api/v1/exercises/media-upload-url` validates media type, filename extension, content type, byte size, and optional SHA-256 checksum format before signing.
- Signed upload URLs are generated using Cloudflare R2's S3-compatible Signature V4 flow with a five-minute TTL.
- Generated object keys are scoped to the active organization: `organizations/{organization_id}/training/exercises/{video|image}/{uuid}.{extension}`.
- Upload URL creation writes an audit log with media type, content type, byte size, checksum metadata, and object key target.
- `POST /api/v1/exercises` and `PATCH /api/v1/exercises/{exercise_id}` reject media object keys that do not match the active organization and expected media type path.
- Storage tests cover signed URL creation, validation failure, missing R2 configuration, and cross-organization media key rejection.

Environment:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

These variables are only required when upload URL endpoints are used. They must remain in local/Vercel secret stores and must not be committed with real values.

## Ticket 014D Outcome
Completed on May 14, 2026.

Delivered:
- Client profile pages fetch persisted training assignments after loading the persisted client summary/profile.
- The Training tab renders assigned program cards with status, duration, start date, and optional end date.
- Weekly schedule rows are derived from immutable assignment snapshot template days and exercise names.
- Fixture client profiles retain their existing training schedules when the persisted APIs are unavailable.
- Component tests cover API-backed client training assignment rendering and snapshot-to-schedule mapping.

## Ticket 014E Outcome
Completed on May 14, 2026.

Delivered:
- Playwright E2E coverage for creating an exercise through `/training/exercises/add` and `POST /api/v1/exercises`.
- Playwright E2E coverage for creating a training template through `/training/programs` and `POST /api/v1/training-program-templates`.
- Playwright E2E coverage for assigning a training template to an active client through `POST /api/v1/training-program-assignments`.
- E2E assertions verify both visible UI completion states and the API payloads sent by the browser.

## Ticket 014F Review Gate Outcome
Completed on May 14, 2026.

Review prompt:
"Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Findings:
- M5 code, schema, API routes, UI integration, tests, and docs match the training persistence specs.
- One deployment gap was found: `20260514090000_training_persistence_foundation` had not yet been applied to the configured Neon database.

Closure:
- Verified all migrations and seed data against a disposable clean PostgreSQL database.
- Applied the pending M5 migration to Neon.
- Re-ran the seed command against Neon.
- Verified `pnpm --dir apps/web db:status` reports the database schema is up to date.
- Verified `pnpm --dir apps/web check` passes after migration and seed closure.

## Source Specs
- `docs/architecture/data-model-spec.md`
- `docs/api/api-contract-spec.md`
- `docs/roadmap/implementation-roadmap.md`
- `docs/roadmap/implementation-ticket-map.md`

## Data Model
- `exercise_library_items`: global/private library records with JSONB muscle arrays and media object keys.
- `training_program_templates`: organization-owned program templates with JSONB template content.
- `training_program_assignments`: client-specific assignments with immutable `snapshot_json`.

Rules:
- Global exercises have `scope = global` and no `organization_id`.
- Private exercises have `scope = private` and an `organization_id`.
- Tenant users can read global exercises and their organization private exercises.
- Tenant users can only mutate private exercises in their own organization.
- Assignment snapshots must not depend on future template edits.

## API Surface
- `GET /api/v1/exercises`
- `POST /api/v1/exercises`
- `GET /api/v1/exercises/{exercise_id}`
- `PATCH /api/v1/exercises/{exercise_id}`
- `GET /api/v1/training-program-templates`
- `POST /api/v1/training-program-templates`
- `GET /api/v1/training-program-assignments`
- `POST /api/v1/training-program-assignments`
- `GET /api/v1/clients/{client_id}/training-programs`

## Training Builder Anatomy Heatmap
- The program builder anatomy volume map uses the licensed Fitness Visuals Rive asset at `apps/web/public/vendor/fitness-visuals/human_anatomy_basic.riv`.
- The asset is rendered as-is through `@rive-app/react-canvas`; do not trace, recolor, decompile, or replace it with derived SVG artwork.
- `apps/web/lib/training/muscle-volume.ts` maps Complete Coach exercise muscle groups to the Rive view-model boolean inputs.
- The builder renders the `Front` and `Back` artboards side by side so coaches can see daily training volume across anterior and posterior muscle groups.

## Remaining M5 Work
None. M5 is complete.
