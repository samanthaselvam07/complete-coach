# Complete Coach — Production Build Specification

## 1. Product Overview

**Complete Coach (My Complete Physique)** is a multi-tenant SaaS fitness coaching platform with two user roles:

- **Coaches**: Manage clients, programs, nutrition plans, supplements, schedules, finances, messaging, and content.
- **Clients**: Execute workouts, log nutrition, track progress, submit check-ins, communicate with their coach.

The platform uses the **Kinetic Curator** design system exclusively (purple `#3620b8` / orange `#f87600` palette, glassmorphism, editorial typography).

---

## 2. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| App structure | Single Next.js app, role-based routing | Shared codebase, single deploy, simpler auth flow |
| API layer | Next.js API routes (App Router) | Simplicity for v1, can extract later if needed |
| Database | Self-hosted PostgreSQL (Docker) | Full control, no vendor lock-in |
| ORM | Prisma | Type-safe, migrations, multi-tenant friendly |
| Deployment | Vercel | Optimized for Next.js, edge functions, preview deploys |
| Auth | NextAuth.js (Email + Google) | Open-source, self-hosted, extensible |
| File storage | Cloudflare R2 | S3-compatible, zero egress fees |
| Payments | Stripe Connect | Multi-tenant, supports subscriptions + one-time |
| Messaging | Polling (upgrade to WS later) | Simpler v1, sufficient for launch scale |
| Notifications | In-app + browser push + email | Comprehensive coverage |
| Real-time | Polling (5s interval) | v1 simplicity |

---

## 3. Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.4+ (custom theme tokens from Kinetic Curator)
- **Fonts**: Plus Jakarta Sans (display), Inter (body)
- **Icons**: Material Symbols Outlined
- **State**: TanStack Query v5 (server state), Zustand (client state)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Calendar**: FullCalendar (@fullcalendar/react)
- **Drag-and-drop**: dnd-kit (form builder, protocol builder)
- **Video player**: Video.js (DRM via Cloudflare Stream)
- **Date handling**: date-fns

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Next.js API routes (Route Handlers)
- **ORM**: Prisma 5+
- **Auth**: NextAuth.js v5 (Auth.js)
- **Validation**: Zod (shared between client/server)
- **Email**: Resend (transactional) + React Email (templates)
- **Push**: Web Push API (browser notifications)
- **Payments**: Stripe + Stripe Connect (multi-tenant)
- **File uploads**: Direct-to-R2 via presigned URLs
- **Video DRM**: Cloudflare Stream (encrypted streaming, access expiration)
- **Scheduling**: node-cron for background jobs, Vercel Cron for scheduled tasks

### Infrastructure
- **Hosting**: Vercel (app), Docker on VPS (PostgreSQL)
- **CI/CD**: GitHub Actions (existing harness)
- **CDN**: Vercel Edge + Cloudflare (R2/Stream)
- **Monitoring**: Vercel Analytics + custom logging
- **Error tracking**: Sentry

---

## 4. Design System Tokens

### Colors (Kinetic Curator)
```
primary:            #3620b8
primary_container:  #4f40cf
secondary:          #9a4600
secondary_container:#f87600
background:         #fbf9f8
surface:            #fbf9f8
surface_container_low:      #f5f3f3
surface_container:          #efeded
surface_container_high:     #e9e8e7
surface_container_highest:  #e4e2e2
surface_container_lowest:   #ffffff
on_surface:         #1b1c1c
on_surface_variant: #474554
outline:            #787586
outline_variant:    #c8c4d7
error:              #ba1a1a
inverse_surface:    #303031
inverse_primary:    #c5c0ff
```

### Dark Mode Colors
```
primary:            #c5c0ff
primary_container:  #3c29bd
secondary:          #ffb68c
secondary_container:#753400
background:         #131316
surface:            #1b1c1c
surface_container_low:      #1f2020
surface_container:          #242525
surface_container_high:     #2e2f2f
surface_container_highest:  #39393a
surface_container_lowest:   #131316
on_surface:         #e4e2e2
on_surface_variant: #c8c4d7
```

### Typography
- **Display**: Plus Jakarta Sans, 800 weight, tight tracking
- **Headlines**: Plus Jakarta Sans, 600-700 weight
- **Body/Labels**: Inter, 400-600 weight

### Spacing Scale (rem)
```
0: 0, 1: 0.25, 2: 0.5, 3: 0.75, 4: 1, 5: 1.7, 6: 1.5, 8: 2.75, 10: 3.5, 12: 4.25
```

### Border Radius
```
DEFAULT: 0.25rem, lg: 0.5rem, xl: 1.5rem, full: 9999px
```

### Elevation
- **No 1px solid borders** — use surface shifts instead
- **Ghost borders**: `outline-variant` at 15% opacity
- **Glass panels**: `rgba(255,255,255,0.7)` + `backdrop-blur(20px)`
- **Ambient shadows**: `0px 10px 30px rgba(27,28,28,0.06)`

---

## 5. Data Model (Core Entities)

### Auth & Multi-tenancy
```
Organization
├── id, name, slug, stripe_account_id, plan, settings (JSON)
└── created_at, updated_at

User
├── id, email, name, avatar_url, role (COACH | CLIENT | ADMIN)
├── organization_id (FK → Organization)
├── auth_provider, auth_provider_id
└── created_at, updated_at, deleted_at

CoachProfile
├── id, user_id (FK → User), organization_id (FK → Organization)
├── specialties[], bio, certifications[]
├── default_program_template_id
└── created_at, updated_at

ClientProfile
├── id, user_id (FK → User), coach_id (FK → User)
├── organization_id (FK → Organization)
├── status (ACTIVE | PAUSED | CHURNED)
├── start_date, end_date
├── current_package_id (FK → Package)
└── created_at, updated_at
```

### Programs & Workouts
```
Program
├── id, organization_id, created_by (FK → User)
├── name, description, difficulty, duration_weeks
├── is_template, is_published
├── tags[]
└── created_at, updated_at

Workout
├── id, program_id (FK → Program), day_number, name
├── notes, estimated_duration_min
└── created_at, updated_at

Exercise
├── id, organization_id
├── name, description, muscle_groups[], equipment[]
├── video_url, thumbnail_url, instructions
└── created_at, updated_at

WorkoutExercise (join)
├── id, workout_id, exercise_id
├── order, sets, reps, rest_seconds, weight_suggestion
├── is_superset, superset_group
└── notes
```

### Nutrition
```
MealPlan
├── id, organization_id, created_by
├── name, description, daily_calories_target
├── macro_split { protein_pct, carbs_pct, fat_pct }
├── is_template, is_published
└── created_at, updated_at

MealPlanDay
├── id, meal_plan_id, day_of_week
└── meals[] (embedded)

Meal
├── id, meal_plan_day_id, meal_type (BREAKFAST|LUNCH|DINNER|SNACK)
├── name, calories, protein_g, carbs_g, fat_g
└── food_items[] (embedded)

FoodItem
├── id (embedded), name, quantity, unit
├── calories, protein_g, carbs_g, fat_g, fiber_g
└── source (DATABASE | CUSTOM)

FoodDatabase
├── id, organization_id, name
├── calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
├── serving_size, serving_unit
└── source (USDA | CUSTOM)
```

### Supplements
```
Supplement
├── id, organization_id
├── name, brand, dosage, unit, frequency
├── description, timing_instructions
└── created_at, updated_at

SupplementProtocol
├── id, client_id (FK → ClientProfile)
├── coach_id (FK → User)
├── name, notes
└── created_at, updated_at

SupplementProtocolEntry
├── id, protocol_id, supplement_id
├── dosage, frequency, timing (MORNING|AFTERNOON|EVENING|BEDTIME)
├── meal_relation (WITH_FOOD|EMPTY_STOMACH|ANY)
└── notes
```

### Calendar & Scheduling
```
CalendarEvent
├── id, organization_id
├── title, description, event_type (SESSION|CHECK_IN|CONSULTATION|PERSONAL)
├── coach_id, client_id (nullable)
├── start_time, end_time, timezone
├── recurrence_rule (RRULE string, nullable)
├── location, notes
└── created_at, updated_at

PipelineStage
├── id, organization_id
├── name, color, order, is_default
└── created_at

PipelineEntry
├── id, organization_id, client_id (nullable)
├── stage_id (FK → PipelineStage)
├── contact_name, contact_email, contact_phone
├── notes, value
└── created_at, updated_at
```

### Check-ins & Forms
```
CheckIn
├── id, client_id, coach_id, organization_id
├── check_in_type (DAILY | WEEKLY)
├── status (PENDING | SUBMITTED | REVIEWED)
├── submitted_at, reviewed_at
└── created_at

CheckInResponse
├── id, check_in_id
├── form_id (FK → Form, nullable)
├── responses JSON
└── video_urls[], image_urls[]

Form
├── id, organization_id, created_by
├── name, description, form_type (CHECK_IN|INTAKE|ASSESSMENT|CUSTOM)
├── fields JSON (drag-and-drop schema)
├── is_template, is_published
└── created_at, updated_at

FormSubmission
├── id, form_id, submitted_by (FK → User)
├── responses JSON
├── status (DRAFT | SUBMITTED | REVIEWED)
└── submitted_at
```

### Messaging
```
Conversation
├── id, organization_id
├── participants[] (FK → User)
├── last_message_at, last_message_preview
└── created_at, updated_at

Message
├── id, conversation_id, sender_id (FK → User)
├── content, message_type (TEXT | IMAGE | VIDEO | FILE)
├── read_by JSON ({user_id: timestamp})
└── created_at
```

### Vault & Content
```
VaultItem
├── id, organization_id, created_by
├── title, description, content_type (VIDEO|PDF|ARTICLE|LINK|IMAGE)
├── file_url, thumbnail_url
├── is_published, access_expiration (nullable)
├── tags[], category
└── created_at, updated_at

VaultAssignment
├── id, vault_item_id, client_id (FK → ClientProfile)
├── assigned_at, expires_at
├── access_count, last_accessed_at
└── created_at
```

### Financial
```
Package
├── id, organization_id, created_by
├── name, description, price_cents
├── billing_type (SUBSCRIPTION | ONE_TIME)
├── billing_interval (MONTHLY | QUARTERLY | YEARLY, nullable)
├── features JSON, duration_days
├── is_published, stripe_price_id
└── created_at, updated_at

Payment
├── id, organization_id, client_id, coach_id
├── package_id (FK → Package)
├── amount_cents, currency, status (PENDING|PAID|FAILED|REFUNDED)
├── stripe_payment_intent_id
├── paid_at, refunded_at
└── created_at

FinancialSummary (materialized view)
├── organization_id, coach_id
├── period (MONTH | QUARTER | YEAR)
├── total_revenue, active_clients, churned_clients
└── calculated_at
```

### Progress & Logging
```
ProgressLog
├── id, client_id, coach_id, organization_id
├── log_type (WEIGHT|BODY_FAT|MEASUREMENT|PERFORMANCE|PHOTO)
├── value, unit, notes
├── logged_at
└── created_at

WorkoutLog
├── id, client_id, workout_id (FK → Workout)
├── started_at, completed_at, status (IN_PROGRESS|COMPLETED|SKIPPED)
├── notes, rating
└── created_at

WorkoutSetLog
├── id, workout_log_id, exercise_id
├── set_number, reps_completed, weight_used
├── is_pr
└── created_at

NutritionLog
├── id, client_id, date
├── total_calories, total_protein, total_carbs, total_fat
├── water_ml
└── meals[] (embedded, references MealPlan or custom)

HydrationLog
├── id, client_id, date
├── water_ml, target_ml
└── created_at
```

### Tasks
```
Task
├── id, organization_id, assigned_by (FK → User)
├── assigned_to (FK → User, nullable for self)
├── client_id (FK → ClientProfile, nullable)
├── title, description, priority (LOW|MEDIUM|HIGH)
├── status (TODO|IN_PROGRESS|DONE), due_date
└── created_at, updated_at
```

---

## 6. API Surface (Route Groups)

### `/api/auth/*` — NextAuth.js handlers

### `/api/coach/*` — Coach-protected routes
```
GET        /api/coach/dashboard                — Dashboard metrics
GET/POST   /api/coach/clients                   — List/create clients
GET/PATCH  /api/coach/clients/:id               — Get/update client
GET/POST   /api/coach/programs                  — List/create programs
GET/PATCH  /api/coach/programs/:id              — Get/update program
POST       /api/coach/programs/:id/duplicate     — Duplicate program
GET/POST   /api/coach/workouts                  — List/create workouts
GET/POST   /api/coach/exercises                 — List/create exercises
GET/POST   /api/coach/calendar                  — List/create events
GET/POST   /api/coach/meal-plans                 — List/create meal plans
GET/POST   /api/coach/food-database              — Search/manage food database
GET/POST   /api/coach/supplements                — List/create supplements
GET/POST   /api/coach/supplement-protocols       — List/create protocols
GET/POST   /api/coach/vault                      — List/create vault items
POST       /api/coach/vault/:id/assign           — Assign vault item to client
GET/POST   /api/coach/forms                      — List/create forms
GET        /api/coach/forms/:id/submissions     — Get submissions
GET/POST   /api/coach/team                       — Team management
GET/POST   /api/coach/social                     — Social scheduling
GET        /api/coach/financials                  — Financial summary
GET        /api/coach/financials/payments         — Payment breakdown
GET/POST   /api/coach/packages                    — List/create packages
GET/POST   /api/coach/check-ins                  — List/create check-in assignments
PATCH      /api/coach/check-ins/:id/review       — Review a check-in
GET/POST   /api/coach/pipeline                   — List/manage pipeline
GET/POST   /api/coach/tasks                      — List/create tasks
GET/POST   /api/coach/nutrition-plans             — List/create nutrition plans
GET/POST   /api/coach/messages                   — List/send messages
```

### `/api/client/*` — Client-protected routes
```
GET        /api/client/dashboard              — Today's plan summary
GET        /api/client/training                — Training hub (programs, workouts, calendar)
GET        /api/client/workout/:id              — Get assigned workout
POST       /api/client/workout/:id/log          — Log workout completion
GET        /api/client/nutrition-plan            — Assigned nutrition plan
POST       /api/client/nutrition-log             — Log food intake
GET        /api/client/supplement-protocol       — Assigned supplements
GET        /api/client/education                 — Assigned vault content
GET        /api/client/progress                  — Progress data
POST       /api/client/progress/log              — Log progress
GET        /api/client/calendar                  — Assigned events
GET        /api/client/check-in/:id              — Get check-in form
POST       /api/client/check-in/:id/submit       — Submit check-in
GET/POST   /api/client/messages                 — List/send messages
GET/POST   /api/client/hydration                 — Get/log hydration
```

### `/api/shared/*` — Shared routes
```
GET/POST   /api/shared/upload                   — Presigned R2 upload URL
GET        /api/shared/search                   — Global search
```

### `/api/stripe/*` — Webhook handlers
```
POST       /api/stripe/webhook                  — Stripe webhook
GET        /api/stripe/connect                   — Coach onboarding link
```

---

## 7. Frontend Route Structure

### Coach Routes (`/coach/*`)
```
/coach                              — Dashboard
/coach/clients                      — Clients
/coach/clients/:id                  — Client profile
/coach/clients/:id/protocols        — Protocol management
/coach/clients/:id/progress         — Progress analytics
/coach/clients/:id/check-ins        — Check-in review
/coach/clients/:id/calendar         — Client calendar
/coach/training                     — Training hub
/coach/training/programs            — Program library
/coach/training/programs/:id        — Program detail/editor
/coach/training/workouts            — Workout library
/coach/training/workouts/:id        — Workout editor
/coach/training/calendar            — Planning calendar
/coach/nutrition                    — Nutrition hub
/coach/nutrition/meal-plans         — Meal plan library
/coach/nutrition/food-database      — Food database
/coach/supplements                  — Supplementation hub
/coach/supplements/:id              — Supplement detail
/coach/supplements/protocols        — Protocol builder
/coach/education                    — Education hub
/coach/education/vault              — Educational vault
/coach/education/vault/:id          — Vault item detail
/coach/education/forms              — Form builder
/coach/education/forms/:id/edit    — Form editor
/coach/team                         — Team management
/coach/social                       — Social scheduling
/coach/social/calendar              — Social media calendar
/coach/social/upload                — Content upload
/coach/financials                   — Finance hub
/coach/financials/analytics          — Financial analytics
/coach/financials/payments           — Payment breakdown
/coach/packages                     — Packages
/coach/packages/new                  — Create package
/coach/forms                         — Forms management
/coach/forms/:id/edit               — Form editor
/coach/pipeline                      — Sales pipeline (accessible from Dashboard)
/coach/tasks                         — Task management (accessible from Dashboard)
/coach/settings                      — Settings
/coach/profile                       — Coach profile
/coach/onboarding                    — New client intake
/coach/messages                      — Message center
```

### Client Routes (`/client/*`)
```
/client                             — Dashboard
/client/training                    — Training hub (programs, workouts, calendar)
/client/training/workout/:id        — Active workout
/client/nutrition                   — Nutrition plan
/client/nutrition/log               — Nutrition log
/client/supplements                  — Supplementation stack
/client/supplements/:id             — Supplement detail
/client/education                   — Education (vault content)
/client/education/vault/:id        — Vault item detail
/client/progress                    — Progress analytics
/client/calendar                    — Calendar (accessible from top bar)
/client/check-in/daily              — Daily check-in
/client/check-in/weekly             — Weekly check-in
/client/messages                    — Messages (accessible from top bar)
/client/settings                    — Settings (accessible from top bar)
```

### Auth Routes
```
/auth/signin                         — Sign in
/auth/signup                        — Coach sign up
/auth/invite/:token                 — Client invitation
```

---

## 8. File Structure

```
complete-coach/
├── apps/
│   └── web/                         # Next.js application
│       ├── src/
│       │   ├── app/                  # App Router pages
│       │   │   ├── (auth)/          # Auth route group
│       │   │   ├── (coach)/         # Coach route group
│       │   │   ├── (client)/        # Client route group
│       │   │   ├── api/             # API route handlers
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/          # React components
│       │   │   ├── ui/             # Design system primitives
│       │   │   ├── coach/          # Coach-specific components
│       │   │   ├── client/         # Client-specific components
│       │   │   └── shared/         # Shared components
│       │   ├── hooks/              # Custom React hooks
│       │   ├── lib/                # Utilities, helpers
│       │   ├── styles/            # Global styles, Tailwind config
│       │   └── types/             # TypeScript types
│       ├── public/                 # Static assets
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
├── pkg/
│   ├── ui/                         # Shared design system package
│   │   ├── src/
│   │   │   ├── tokens/             # Design tokens (colors, spacing, etc.)
│   │   │   ├── primitives/         # Button, Card, Input, Chip, etc.
│   │   │   ├── compositions/      # SideNavBar, TopNav, DataTable, etc.
│   │   │   └── index.ts
│   │   └── package.json
│   ├── db/                         # Database package
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Full Prisma schema
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── client.ts           # Prisma client singleton
│   │   │   ├── seed.ts             # Seed data
│   │   │   └── queries/           # Reusable query functions
│   │   └── package.json
│   ├── auth/                       # Auth package
│   │   ├── src/
│   │   │   ├── config.ts           # NextAuth config
│   │   │   ├── guards.ts           # Role-based route guards
│   │   │   └── middleware.ts
│   │   └── package.json
│   ├── core/                       # Business logic package
│   │   ├── src/
│   │   │   ├── programs/
│   │   │   ├── nutrition/
│   │   │   ├── supplements/
│   │   │   ├── calendar/
│   │   │   ├── messaging/
│   │   │   ├── financials/
│   │   │   ├── forms/
│   │   │   ├── vault/
│   │   │   ├── pipeline/
│   │   │   ├── checkins/
│   │   │   ├── progress/
│   │   │   └── tasks/
│   │   └── package.json
│   └── shared/                     # Shared utilities
│       ├── src/
│       │   ├── types/              # Shared TypeScript types
│       │   ├── validation/          # Zod schemas
│       │   ├── constants/          # App constants
│       │   └── utils/             # Utility functions
│       └── package.json
├── integrations/
│   ├── stripe/                     # Stripe integration
│   │   ├── src/
│   │   │   ├── checkout.ts
│   │   │   ├── webhooks.ts
│   │   │   ├── connect.ts
│   │   │   └── products.ts
│   │   └── package.json
│   ├── storage/                    # Cloudflare R2 integration
│   │   ├── src/
│   │   │   ├── upload.ts           # Presigned URLs
│   │   │   ├── stream.ts           # Cloudflare Stream (video DRM)
│   │   │   └── client.ts
│   │   └── package.json
│   └── email/                      # Email integration
│       ├── src/
│       │   ├── templates/          # React Email templates
│       │   └── send.ts
│       └── package.json
├── migrations/                     # Database migrations (managed by Prisma)
├── deploy/                          # Deployment configs
│   ├── docker-compose.yml          # PostgreSQL + app
│   ├── Dockerfile                  # Multi-stage build
│   └── vercel.json                 # Vercel deployment config
├── docs/                            # Documentation
│   ├── templates/                  # Existing harness templates
│   ├── BUILD_SPEC.md               # This file
│   ├── ROADMAP.md                  # Milestone roadmap
│   ├── DESIGN_SYSTEM.md            # Design system reference
│   └── API.md                      # API documentation
├── scripts/                         # Existing harness scripts
├── .agents/                         # Existing AI agent profiles
├── .codex/                          # Existing coding rules
├── .github/                         # Existing CI/CD
├── AGENTS.md
├── LICENSE
└── README.md
```

---

## 9. Security Requirements

- **Auth**: NextAuth.js with JWT sessions, HTTP-only cookies
- **Multi-tenancy**: All queries scoped by `organization_id`; row-level security via Prisma middleware
- **RBAC**: Coach, Client, Admin roles enforced at middleware level
- **Input validation**: Zod schemas on all API routes (shared between client/server)
- **SQL injection**: Prisma parameterized queries (no raw SQL)
- **XSS**: Next.js built-in escaping, no dangerouslySetInnerHTML
- **CSRF**: NextAuth.js CSRF tokens on all mutations
- **File upload**: Presigned URLs (no direct server upload), size limits enforced
- **Video DRM**: Cloudflare Stream signed URLs with expiration
- **Rate limiting**: Vercel Edge Middleware rate limiting on API routes
- **Secrets**: Environment variables only (never committed); Vercel encrypted env
- **HTTPS**: Vercel enforces HTTPS
- **Data isolation**: Strict `organization_id` filtering on every query
- **Audit logging**: Key actions (payment, auth, data changes) logged
