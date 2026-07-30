# Complete Coach

Complete Coach is a multi-tenant coaching operations platform for fitness and performance coaching businesses. It is designed to bring client management, CRM, check-ins, training, nutrition, education, supplementation, messaging, packages, team operations, and analytics into one coach-facing workspace.

The current baseline is **M1-M9 complete**: a launchable Next.js application with Auth.js, Prisma, Neon/PostgreSQL, tenant-scoped product persistence across clients/CRM, forms/check-ins, training, nutrition, operations, packages/payments, education, and supplementation, plus API-backed UI surfaces, tests, and Vercel deployment configuration.

## Live Preview

Production preview:

https://complete-coach-ten.vercel.app

Repository:

https://github.com/MikeS071/complete-coach

## Screenshots

### Operations Dashboard

![Complete Coach dashboard](docs/assets/screenshots/dashboard.png)

### Client Roster

![Complete Coach client roster](docs/assets/screenshots/clients.png)

### Training Programs

![Complete Coach training programs](docs/assets/screenshots/training.png)

### Nutrition Plans

![Complete Coach nutrition plans](docs/assets/screenshots/nutrition.png)

### Messaging

![Complete Coach messaging](docs/assets/screenshots/messages.png)

## Current Capabilities

- Authenticated app shell with sidebar navigation, global search, notifications, and user menu.
- Dashboard with operations metrics, priority tasks, work queues, quick actions, and pipeline activity.
- Clients, CRM, client profiles, check-ins, and form builder UI.
- Training overview, program library, exercise database, and add-exercise workflow.
- Nutrition overview, meal plan library, and food database.
- Education resource library and add-resource workflow.
- Supplement protocols, supplement plans, and supplement database with a local slide-in creation flow.
- Messages UI with conversation switching, search, and local message sending.
- Packages, team management, and social media planning pages.
- Typed fixtures for sample data and fallback behavior where APIs are unavailable.
- Auth.js credentials sign-in surface at `/sign-in`.
- Signed-out users only see public screens; the app shell loads after authentication.
- Neon-backed users, organizations, memberships, audit-log baseline, and JWT session enrichment.
- Role/capability and active-organization helper coverage for upcoming protected APIs.
- Tenant-scoped APIs and persistence for clients/CRM, forms/check-ins, training, nutrition, messaging/tasks/notifications, packages/payments, education, and supplementation.
- R2-backed upload URL flows for training media, message attachments, and education resources.
- Stripe package/payment persistence and webhook processing foundation.
- Playwright route/accessibility and product-flow smoke coverage.

## Current Scope Boundary

This release does **not** yet include:

- Full social integrations.
- User-facing AI automation.
- M10 production hardening items such as Sentry, structured request logging, rate limits, final security/performance reviews, and team invitation completion.

## Tech Stack

- **Application:** Next.js App Router, React, TypeScript
- **UI:** Tailwind CSS, shadcn-compatible primitives, Radix where needed
- **Testing:** Vitest, Testing Library, Playwright
- **Database:** PostgreSQL on Neon
- **ORM:** Prisma
- **Auth:** NextAuth/Auth.js
- **Deployment:** Vercel
- **Planned integrations:** Stripe Connect, Cloudflare R2, Resend, Inngest

## Repository Structure

```text
apps/web/                 Next.js UI application
docs/                     Product, architecture, roadmap, API, and deployment docs
docs/assets/screenshots/  README and documentation screenshots
scripts/                  Verification and repository guard scripts
ui-design/                Imported UI design archive
.agents/                  Agent profiles and skills for implementation workflow
.codex/                   Repository coding rules
```

## Local Development

Requirements:

- Node.js 22+
- pnpm 10+

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Run the web app:

```bash
pnpm --dir apps/web dev
```

Open:

```text
http://localhost:3000
```

For auth-enabled local development, configure local secret values for `AUTH_SECRET`, `DATABASE_URL`, optional `DIRECT_URL`, `NEXTAUTH_URL`, and optional demo seed credentials. See [Auth and tenant foundation](docs/technical/auth-tenant-foundation.md).

## Verification

Run the full repository gate:

```bash
pnpm check
```

Run app-level checks:

```bash
pnpm --dir apps/web lint
pnpm --dir apps/web typecheck
pnpm --dir apps/web test
pnpm --dir apps/web coverage
pnpm --dir apps/web build
```

Run Playwright E2E:

```bash
pnpm --dir apps/web exec playwright install chromium
pnpm --dir apps/web e2e
```

Current verified baseline after M9:

- 399 Vitest tests
- 64 Playwright tests
- 91.8% statement coverage
- 80.32% branch coverage
- Production build passes
- File-size guard enforces the 800-line cap for product/docs/CI files where applicable

## Deployment

The app is deployed on Vercel with `apps/web` as the project root.

Vercel settings:

- Install command: `cd ../.. && pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `.next`
- Framework: Next.js

The deployed app requires `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL` when available, and `NEXTAUTH_URL` in Vercel project settings. R2 and Stripe variables are required for those live integration paths. Demo seed credentials are optional and must remain secret.

Detailed deployment notes:

[docs/deployment/vercel-neon-preview.md](docs/deployment/vercel-neon-preview.md)

Client-facing app deployment notes:

[docs/deployment/client-app.md](docs/deployment/client-app.md)

## Documentation

Core project docs:

- [Product specification](docs/product/product-spec.md)
- [Architecture specification](docs/architecture/architecture-spec.md)
- [Data model specification](docs/architecture/data-model-spec.md)
- [API contract specification](docs/api/api-contract-spec.md)
- [Implementation roadmap](docs/roadmap/implementation-roadmap.md)
- [Implementation ticket map](docs/roadmap/implementation-ticket-map.md)
- [UI design analysis](docs/design-system/ui-design-analysis.md)
- [Visual parity gate](docs/design-system/visual-parity-gate.md)
- [Production readiness checklist](docs/checklists/production-readiness-checklist.md)

## Roadmap

M1-M9 are complete. The next planned phase is M10 / Ticket 019 Production Hardening.

Recent completion docs:

- [Payments and packages](docs/technical/payments-packages.md)
- [Education and supplementation persistence](docs/technical/education-supplementation-persistence.md)
- [M9 checklist](docs/checklists/m9-education-supplementation-checklist.md)
- [New developer handover](docs/handovers/2026-06-06-new-developer-handover.md)

## Security Notes

- Do not commit secrets or populated `.env` files.
- Use `.env.example` only as a placeholder reference.
- Neon, Stripe, R2, Resend, and Auth secrets must be stored in Vercel/local secret stores only.

## License

See [LICENSE](LICENSE).
