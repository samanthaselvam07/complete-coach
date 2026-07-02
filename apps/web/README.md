# Complete Coach Web

## Purpose
This is the Next.js App Router application for Complete Coach.

The M1 UI stub ports the prototype routes from `ui-design/Complete Coach.zip` with typed fixtures, unit coverage, and Playwright route/accessibility smoke coverage.

Ticket 011 adds the Auth.js/Prisma tenant foundation alongside the fixture-backed UI. Product routes remain fixture-backed until later persistence tickets replace each surface.

## Commands
```bash
pnpm --dir apps/web dev
pnpm --dir apps/web lint
pnpm --dir apps/web typecheck
pnpm --dir apps/web test
pnpm --dir apps/web coverage
pnpm --dir apps/web build
pnpm --dir apps/web e2e
pnpm --dir apps/web env:validate
pnpm --dir apps/web check
```

## Exercise Library Imports
Use dry-runs first. Add `--commit` only after the create/update/skip counts look right.

```bash
pnpm --dir apps/web exercise:import:csv ./data/imports/exercises.csv
pnpm --dir apps/web exercise:import:csv ./data/imports/exercises.csv --commit
```

Exercise video and thumbnail files should live in R2, not Neon. Neon stores only the exercise metadata plus `videoObjectKey` and `imageObjectKey`.
The upload commands scan nested body-part folders recursively.

```bash
pnpm --dir apps/web exercise:upload-videos --dir "/path/to/google-drive/exercise-videos"
pnpm --dir apps/web exercise:upload-videos --dir "/path/to/google-drive/exercise-videos" --commit

pnpm --dir apps/web exercise:upload-thumbnails --dir "/path/to/google-drive/exercise-thumbnails"
pnpm --dir apps/web exercise:upload-thumbnails --dir "/path/to/google-drive/exercise-thumbnails" --commit
```

When filenames do not match exercise names, provide a mapping CSV with `exercise name` and `video filename` columns:

```bash
pnpm --dir apps/web exercise:upload-videos --dir "/path/to/videos" --mapping ./data/imports/exercise-video-map.csv --commit
```

Thumbnail mappings use `exercise name` plus `thumbnail filename` or `image filename` columns:

```bash
pnpm --dir apps/web exercise:upload-thumbnails --dir "/path/to/thumbnails" --mapping ./data/imports/exercise-thumbnail-map.csv --commit
```

Committed media uploads require `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`.

## Database And Auth Foundation
```bash
pnpm --dir apps/web db:generate
pnpm --dir apps/web db:migrate
pnpm --dir apps/web db:status
pnpm --dir apps/web db:seed
```

`db:seed` creates a demo organization and owner only when `DEMO_COACH_EMAIL` and `DEMO_COACH_PASSWORD` are supplied through environment variables.
Local Prisma commands load the repository root `.env`; deployed Vercel runtime configuration must be set in Vercel environment variables.

Install the local Chromium binary once before running E2E tests:
```bash
pnpm --dir apps/web exec playwright install chromium
```

## Styling
The scaffold imports `apps/web/styles/complete-coach-theme.css`, which references the generated design-system baseline in `docs/design-system/complete-coach-theme.css`.
