# Vercel Preview Deployment

## Current State
The deployed preview target includes the M1-M10 implementation baseline.

Auth, tenancy, clients/CRM, forms/check-ins, training, nutrition, operations messaging/tasks/notifications, payments/packages, education, and supplementation persistence are implemented ticket by ticket and backed by PostgreSQL/Neon. Some UI surfaces still keep fixture fallback behavior when APIs are unavailable.

## Vercel Project Settings
Use `apps/web` as the Vercel project root.

The `apps/web/vercel.json` file sets:
- Framework: Next.js
- Install command: `cd ../.. && pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `.next`

The install command intentionally runs from the monorepo root so Vercel uses the committed workspace lockfile.

## Environment Variables
Required for the deployed Auth/Neon foundation:
- `AUTH_SECRET`: generated Auth.js secret stored only in Vercel/local secret storage.
- `DATABASE_URL`: Neon pooled connection string for runtime queries.
- `DIRECT_URL`: Neon direct connection string for migrations when available.
- `NEXTAUTH_URL`: deployed app URL.

Optional:
- `DEMO_COACH_EMAIL`: demo owner seed email for local/preview smoke tests.
- `DEMO_COACH_PASSWORD`: demo owner seed password for local/preview smoke tests.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`: required for R2-backed upload URL endpoints.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: required for live Stripe package/payment flows.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`: required to deliver team invitations and process Resend delivery events.
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`: enable server and browser error reporting.
- `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`: explicit environment labels.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`: required only for source-map upload during builds.
- `LOG_LEVEL`: structured Pino log level, default `info`.

Never commit populated environment files or connection strings. Vercel environment variables must be configured through Vercel project settings.

## Local Production Build Check
Run:
```bash
pnpm install --frozen-lockfile
pnpm --dir apps/web build
```

Optional full gate:
```bash
pnpm check
```

The full gate includes Playwright and requires local browser installation:
```bash
pnpm --dir apps/web exec playwright install chromium
```

## Deployment Expectations
The deployed preview should show:
- Full app shell and sidebar navigation after a valid login.
- `/sign-in` credentials sign-in surface.
- No sidebar/topbar app chrome on signed-out public screens.
- Auth.js session endpoint returning `null` for unauthenticated users and session data after valid login.
- API-backed clients/CRM, forms/check-ins, training, nutrition, operations messaging/tasks/notifications, packages/payments, education, and supplementation flows where persistence tickets are complete.
- API-backed team invitations, role/status management, invitation acceptance, and audit log views.
- `X-Request-Id`, security headers, durable API rate limits, structured JSON logs, and Sentry capture when configured.
- Fixture-backed fallback behavior where implemented for user-facing resilience.
- Local interactive behavior such as filters, tabs, drawers, and message sending.

The deployed preview will not include:
- Full social integrations.
- User-facing AI automation.

## M10 Deployment Order
1. Configure environment-specific Neon, Resend, and Sentry variables.
2. Run `pnpm --dir apps/web db:migrate` with `DIRECT_URL`.
3. Deploy the application.
4. Sign in as an owner and smoke test `/team-management` and `/audit-logs`.
5. Create a test invitation and verify the Resend delivery record and acceptance link.
6. Trigger a controlled non-sensitive error in preview and confirm Sentry receives it.
7. Confirm API responses include `X-Request-Id` and security headers.
8. Confirm repeated protected requests receive `429` with `Retry-After`.

## Rollback
- Promote the previous Vercel deployment if smoke checks fail.
- Do not roll back the additive `team_invitations` or `rate_limit_buckets` migration. Application rollback is compatible with both tables remaining present.
- Correct schema issues with a new forward migration.
- Disable Sentry or Resend by removing their environment values if a provider integration is causing failures.
