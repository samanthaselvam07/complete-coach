# Client And CRM Persistence

Ticket 012 replaces the client roster and CRM pipeline fixture-only foundation with tenant-scoped PostgreSQL persistence.

## Scope In This Slice
- Prisma schema and migration for `clients`, `client_profiles`, `leads`, and `lead_activities`.
- Authenticated `/api/v1/clients`, `/api/v1/clients/{client_id}/profile`, `/api/v1/leads`, and `/api/v1/leads/{lead_id}/activities` route handlers.
- Tenant scoping from the active Auth.js organization context. API callers cannot provide or override `organization_id`.
- Audit log writes for client/lead create, update, archive, and lead stage transitions.
- Client roster, client profile, and CRM pages load API-backed data and render empty/not-found states when persistence APIs are unavailable.
- Demo seed data populates clients and leads from the existing UI fixtures after migrations are applied.

## Mutation UI Follow-Up
Ticket 012B extends the persistence foundation into the working UI:

- Client roster supports persisted create, edit, and archive actions.
- CRM supports persisted lead create and edit actions.
- Lead stage movements reconcile the optimistic UI with the API response.
- CRM search filters persisted leads across name, contact, source, location, and notes.

## M3 Review Gate Outcome
Completed on May 14, 2026.

Review prompt:
"Analyse the phase code and compare to phase specs and determine if there are any gaps. If you find any gaps, close them by implementing the relevant functionality. Each phase cannot proceed or be called complete until there are no gaps between specs and code that was actually delivered and is tested to be working. This is a mandatory requirement."

Gaps found and closed:
- The client profile screen now loads persisted profile details from `/api/v1/clients/{client_id}/profile` after loading the roster summary, so profile bio, goals, and date of birth exercise the protected profile API path.
- The M3 E2E coverage now verifies API-backed client roster navigation, persisted profile rendering, and CRM stage movement against mocked API responses.
- Focused profile component tests cover persisted profile success, unavailable profile fallback, and incomplete profile normalization.

Review verification:
- Client roster, client profile, and CRM pages use API-backed data only; preview environments without migrations/seeds should be fixed at the database layer instead of showing local demo records.
- Client create, edit, archive, search, filter, sort, profile view, lead create, lead edit, lead search, and lead stage transitions are covered by component tests.
- Client/lead API route tests cover authenticated access, tenant scoping, cross-tenant denial, mutations, and audit logging.
- Sensitive profile reads use the `clients:pii:read` capability and profile mutations use `clients:write`.
- The M3 Playwright flow covers roster/profile/CRM stage movement at browser level.

## Security Notes
- All route handlers require an authenticated active organization.
- Read operations require `clients:read`.
- Mutations require `clients:write`.
- Prisma queries always include `organizationId` for tenant-owned records.
- Request bodies and filters are validated with Zod schemas before database access.
- Error responses use stable envelopes and do not expose raw exceptions.

## Operational Notes
Apply the migration and seed after deployment environment variables are configured:

```bash
pnpm --dir apps/web db:migrate
pnpm --dir apps/web db:seed
```

Until the migration is applied, the UI remains usable with the existing typed fixtures.

## Verification
- `pnpm --dir apps/web test client-crm-records.test.ts`
- `pnpm --dir apps/web test client-profile-page.test.tsx clients-page.test.tsx crm-page.test.tsx client-crm-api.test.ts client-crm-records.test.ts`
- `pnpm --dir apps/web typecheck`
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web db:migrate`
- `pnpm --dir apps/web db:seed`

## Production Verification
Completed on May 14, 2026 against Neon and the Vercel production alias `https://complete-coach-ten.vercel.app`.

- Vercel production deployment status: `Ready`.
- Neon migration status: up to date after applying `20260514020000_client_crm_persistence`.
- Demo seed completed successfully.
- Authenticated smoke test passed for `/`, `/clients`, `/clients/crm`, and `/clients/demo-client-1`.
- Authenticated API smoke test returned persisted data from `/api/v1/clients` and `/api/v1/leads`.
