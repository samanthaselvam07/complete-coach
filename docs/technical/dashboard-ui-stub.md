# Dashboard UI Data Source

## Scope
Ticket 004 originally ported the dashboard landing route from the UI design archive into the Next.js App Router stub. The dashboard has since moved beyond the fixture stub and now treats Neon-backed APIs as the runtime source of truth.

Implemented behavior:
- `/` renders the coach operations dashboard instead of the initial scaffold placeholder.
- Revenue analytics load from `GET /api/v1/dashboard/financial-reporting`.
- Client capacity loads from `GET /api/v1/team-members`.
- Pending check-ins load from `GET /api/v1/check-ins`.
- Today's expected check-ins load from `GET /api/v1/clients`.
- CRM pipeline summary loads from `GET /api/v1/dashboard/crm-summary`.
- Work to-do columns load, create, and complete tasks through the task APIs.
- Priority flagged clients load from `GET /api/v1/ai/recommendations?type=risk-flag&status=pending-approval&limit=5` and render medium/high AI risk flags below Work To-Do with expandable coach notes.
- When dashboard APIs are unavailable, the dashboard renders empty/zero states and does not fall back to local fixture data.
- Creating a task while the task API is unavailable shows an error and does not create a local-only task.

## Source Boundary
The dashboard may still import shared TypeScript types and category labels from fixture modules, but startup data must come from Neon-backed API responses. Dashboard startup must not seed revenue, tasks, clients, check-ins, CRM, AI priority flags, or team capacity from local fixtures.

Runtime Prisma also requires `DATABASE_URL`; missing database configuration fails loudly instead of connecting to a local placeholder database.

## Verification
Coverage includes:
- Dashboard route heading render.
- Empty/zero dashboard render when APIs are unavailable.
- Revenue period selection.
- Persisted task load, creation, completion, and sorting.
- Persisted team capacity, check-in counts, today's expected check-ins, AI priority flags, CRM summary, and revenue.
- Missing `DATABASE_URL` protection for the Prisma client.

Required commands:
- `pnpm --dir apps/web test`
- `pnpm --dir apps/web lint`
- `pnpm --dir apps/web typecheck`
- `pnpm --dir apps/web coverage`
- `pnpm --dir apps/web build`
- `pnpm check`
