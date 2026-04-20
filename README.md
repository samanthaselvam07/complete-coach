# Complete Coach

Multi-tenant SaaS fitness coaching platform — **Complete Coach**.

Two user portals in a single Next.js application:
- **Coach Portal** — manage clients, programs, nutrition, supplements, scheduling, finances, messaging, and educational content
- **Client Portal** — execute workouts, log nutrition, track progress, submit check-ins, communicate with their coach

Built on the **Kinetic Curator** design system (purple `#3620b8` / orange `#f87600`, glassmorphism, editorial typography).

---

## Architecture

```
apps/web/          Next.js 14+ (App Router, TypeScript, Tailwind CSS)
pkg/ui/            Design system (Kinetic Curator tokens + components)
pkg/db/            Prisma ORM + PostgreSQL
pkg/auth/          NextAuth.js v5 (Email + Google)
pkg/core/          Business logic (programs, nutrition, supplements, etc.)
pkg/shared/        Shared types, validation schemas, utilities
integrations/
  stripe/          Stripe Connect (payments + subscriptions)
  storage/         Cloudflare R2 (files) + Stream (video DRM)
  email/           Resend (transactional email)
migrations/        Prisma-managed database migrations
deploy/            Docker Compose (PostgreSQL), deployment configs
```

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14+, React 18, Tailwind CSS, TypeScript |
| API | Next.js API routes (Route Handlers) |
| Database | PostgreSQL 16 (Docker), Prisma 5+ |
| Auth | NextAuth.js v5, Email + Google OAuth |
| Payments | Stripe Connect (subscriptions + one-time) |
| Storage | Cloudflare R2 (files), Cloudflare Stream (video DRM) |
| Email | Resend + React Email |
| Deploy | Vercel (app), Docker (Postgres) |
| CI/CD | GitHub Actions |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop (running)
- Vercel CLI (`npm i -g vercel`)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Run database migrations
npx prisma migrate dev

# 5. Seed the database
npx prisma db seed

# 6. Start the development server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Docker Commands

```bash
docker compose up -d        # Start Postgres
docker compose down         # Stop containers
docker compose down -v      # Stop and delete data volume
```

---

## Project Structure

```
complete-coach/
├── apps/web/                 Next.js application
├── pkg/                      Shared packages
│   ├── ui/                   Design system
│   ├── db/                   Database client + migrations
│   ├── auth/                 Authentication
│   ├── core/                 Business logic
│   └── shared/               Types, validation, utils
├── integrations/             External service adapters
│   ├── stripe/               Payment processing
│   ├── storage/              File/video storage
│   └── email/                Transactional email
├── frontend/                 Design reference (Stitch UI screenshots + HTML)
├── deploy/                   Docker Compose, init scripts
├── docs/                     Specifications and templates
│   ├── BUILD_SPEC.md         Full technical specification
│   ├── ROADMAP.md            Milestone roadmap + checklist
│   └── DESIGN_SYSTEM.md      Kinetic Curator design reference
├── scripts/                  Automation helpers
├── .agents/                  AI agent profiles + skills
├── .codex/                   Coding rules + standards
└── .github/                  CI workflows, issue templates
```

---

## Navigation

### Coach Sidebar (top to bottom)
1. Dashboard
2. Clients
3. Training
4. Nutrition
5. Supplementation
6. Education
7. Team
8. Social Scheduling
9. Finance
10. Packages
11. Forms

### Client Bottom Tabs (left to right)
1. Dashboard
2. Training
3. Nutrition
4. Supplementation
5. Education
6. Progress

---

## Documentation

- [Build Specification](docs/BUILD_SPEC.md) — Full tech spec, data model, API routes, file structure
- [Milestone Roadmap](docs/ROADMAP.md) — 7-phase checklist with verification gates
- [Design System](docs/DESIGN_SYSTEM.md) — Kinetic Curator tokens, components, rules

---

## License

MIT
