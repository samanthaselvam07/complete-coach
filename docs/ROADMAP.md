# Complete Coach — Milestone Roadmap & Checklist

**Target launch: 6 months** | Both portals built simultaneously | Kinetic Curator design system only

---

## M0 — Repo Activation (Week 0) ✅

- [x] Harness bootstrapped (CI, agent profiles, skills, rules)
- [x] Design reference screens collected in `frontend/stitch_complete_coach_ui/`
- [x] BUILD_SPEC.md written
- [x] ROADMAP.md written
- [x] README.md with project overview, setup instructions, and architecture summary
- [x] Verify CI pipeline passes (`make bootstrap`, `make test`)
- [x] Create GitHub milestone labels (m0, m1, m2, m3, m4, m5, m6)

### M0 Verification Gate (Mandatory) ✅

- [x] Verify all harness files exist and are syntactically valid (agents, skills, rules, scripts)
- [x] Verify CI pipeline passes green on main
- [x] Verify design reference screens are present and readable in `frontend/stitch_complete_coach_ui/`
- [x] Verify BUILD_SPEC.md, ROADMAP.md, and DESIGN_SYSTEM.md are complete and consistent
- [x] Verify README.md exists with project overview, setup instructions, and architecture summary
- [x] Verify GitHub milestone labels are created
- [x] Verify all M0 checklist items are complete with no gaps
- [x] Fix any defects found during verification before marking M0 complete

---

## M1 — Foundation (Weeks 1-3)

### 1.1 Project Scaffolding
- [ ] Initialize Next.js 14+ monorepo with TypeScript strict mode
- [ ] Configure Turborepo for monorepo builds
- [ ] Set up `pkg/ui` design system package with Kinetic Curator tokens
- [ ] Set up `pkg/db` with Prisma + initial schema (Users, Organizations, CoachProfile, ClientProfile)
- [ ] Set up `pkg/auth` with NextAuth.js v5 (Email + Google providers)
- [ ] Set up `pkg/shared` with Zod validation schemas and shared types
- [ ] Configure Tailwind CSS with custom theme (colors, fonts, spacing, radii)
- [ ] Set up ESLint + Prettier + TypeScript strict mode
- [ ] Create `apps/web` Next.js App Router shell
- [ ] Set up Vercel project + preview deployments
- [ ] Docker Compose for local PostgreSQL
- [ ] Environment variable management (.env.local, Vercel env)

### 1.2 Auth & Multi-tenancy
- [ ] NextAuth.js v5 configuration (credentials + Google provider)
- [ ] Coach signup flow (self-registration, org creation)
- [ ] Client invitation flow (email token, password setup)
- [ ] Role-based middleware (redirect `/coach/*` vs `/client/*`)
- [ ] Organization scoping middleware (all DB queries filter by org)
- [ ] Session management (JWT, refresh tokens)
- [ ] Auth pages: `/auth/signin`, `/auth/signup`, `/auth/invite/:token`

### 1.3 Layout Shell
- [ ] Coach sidebar navigation (Kinetic Curator glass panel) with nav items in order: Dashboard, Clients, Training, Nutrition, Supplementation, Education, Team, Social Scheduling, Finance, Packages, Forms
- [ ] Coach top bar (org switcher, notifications, profile)
- [ ] Client bottom tab navigation (mobile-first) with tabs in order: Dashboard, Training, Nutrition, Supplementation, Education, Progress
- [ ] Client top bar (coach name, notifications)
- [ ] Responsive breakpoints (mobile < 768, tablet 768-1024, desktop > 1024)
- [ ] Dark mode toggle (system preference + manual)
- [ ] 404, loading, error boundary pages

### 1.4 Database v1
- [ ] Prisma schema: Organization, User, CoachProfile, ClientProfile
- [ ] Prisma schema: Organization settings (JSON field)
- [ ] Migration v1: core auth tables
- [ ] Seed script: test org, coach, client accounts
- [ ] Database health check API route (`/api/health`)

### 1.5 Deployment Pipeline
- [ ] Vercel project connected to GitHub
- [ ] Preview deploys on PRs
- [ ] Production deploys on `main` merge
- [ ] Database migration pipeline (Prisma migrate deploy)
- [ ] Environment secrets configured in Vercel

**M1 Exit Criteria**: Coach can sign up, create org, invite client. Client can sign in. Layout shells render for both roles with responsive nav. Dark mode works. DB is migrated and seeded.

### M1 Verification Gate (Mandatory)
> **This gate MUST be completed and passed before proceeding to M2. It cannot be bypassed.**
>
> Read the codebase for the current phase and verify against the relevant spec that all functionality has been correctly built, tested and is verified to be working. If you identify any gaps or non-working functionality, then go back and fix all defects. This verification gate is mandatory and cannot be bypassed before the whole phase is called complete.

- [ ] Verify all M1 API routes return correct responses (auth, health check)
- [ ] Verify coach signup → org creation → client invitation → client signin flow works end-to-end
- [ ] Verify role-based routing redirects coaches to `/coach/*` and clients to `/client/*`
- [ ] Verify multi-tenant isolation (org A data is invisible to org B)
- [ ] Verify layout shells render correctly on mobile, tablet, and desktop
- [ ] Verify dark mode toggle works and persists preference
- [ ] Verify database migrations and seed scripts run cleanly
- [ ] Verify all M1 checklist items are complete with no gaps
- [ ] Fix any defects found during verification before marking M1 complete

---

## M2 — Coach Core (Weeks 4-8)

### 2.1 Coach Dashboard
- [ ] Dashboard API route (`GET /api/coach/dashboard`)
- [ ] Dashboard page: active clients count, revenue summary, upcoming sessions, recent check-ins
- [ ] Pipeline widget (leads/prospects/active pipeline stages)
- [ ] Quick action cards (new client, new program, new message)
- [ ] Mobile dashboard view

### 2.2 Client Roster
- [ ] Client CRUD API routes
- [ ] Client list page: search, filter by status, sort
- [ ] Client invitation flow (generate invite link, email)
- [ ] Client detail/profile page (tabs: overview, protocols, progress, check-ins, calendar)
- [ ] Client status management (active, paused, churned)

### 2.3 Client Profile & Protocol Management
- [ ] Client profile API (GET/PATCH `/api/coach/clients/:id`)
- [ ] Profile overview tab (personal info, metrics, start date, package)
- [ ] Protocol builder page (sequential protocol editor, no conditional logic)
- [ ] Assign protocol to client
- [ ] Profile progress tab (charts: weight, body fat, performance)
- [ ] Profile check-in tab (review submitted check-ins, video playback)
- [ ] Profile calendar tab (client's scheduled events)

### 2.4 Program Library
- [ ] Program CRUD API routes
- [ ] Program library page: grid/list toggle, search, filter by difficulty/tags
- [ ] Program detail page: overview, weekly structure, workout list
- [ ] Program editor: add/remove weeks, reorder workouts
- [ ] Duplicate program
- [ ] Assign program to client (from program detail or client profile)
- [ ] Mobile program library view

### 2.5 Workout Library
- [ ] Exercise CRUD API routes
- [ ] Exercise database page: search, filter by muscle group, equipment
- [ ] Workout builder: add exercises, set sets/reps/rest, superset grouping
- [ ] Workout preview (read-only view)
- [ ] Mobile workout library view

### 2.6 Calendar
- [ ] Calendar events CRUD API routes
- [ ] Coach calendar page (FullCalendar integration)
- [ ] Create/edit/delete events (sessions, check-ins, consultations, personal)
- [ ] Assign events to clients
- [ ] Recurring events (RRULE support)
- [ ] Mobile calendar view

**M2 Exit Criteria**: Coach can manage clients (CRUD, invite), create programs and workouts, view client profiles with protocols and progress, schedule calendar events. All views render correctly on desktop and mobile.

### M2 Verification Gate (Mandatory)
> **This gate MUST be completed and passed before proceeding to M3. It cannot be bypassed.**
>
> Read the codebase for the current phase and verify against the relevant spec that all functionality has been correctly built, tested and is verified to be working. If you identify any gaps or non-working functionality, then go back and fix all defects. This verification gate is mandatory and cannot be bypassed before the whole phase is called complete.

- [ ] Verify all M2 API routes return correct responses (clients, programs, workouts, exercises, calendar, pipeline)
- [ ] Verify coach dashboard renders with accurate metrics and pipeline widget
- [ ] Verify client roster CRUD (create, read, update, delete, search, filter, sort)
- [ ] Verify client profile tabs (overview, protocols, progress, check-ins, calendar) render and function
- [ ] Verify protocol builder creates and assigns sequential protocols to clients
- [ ] Verify program library grid/list toggle, search, filter, duplicate, and assign-to-client
- [ ] Verify workout builder with exercise search, set/reps/rest config, superset grouping
- [ ] Verify calendar event CRUD with recurring events and client assignment
- [ ] Verify all M2 views render correctly on mobile and desktop
- [ ] Verify all M2 checklist items are complete with no gaps
- [ ] Fix any defects found during verification before marking M2 complete

---

## M3 — Client Core (Weeks 4-8, parallel with M2)

### 3.1 Client Dashboard
- [ ] Client dashboard API route (`GET /api/client/dashboard`)
- [ ] Dashboard page: today's workout, nutrition summary, supplement reminders, quick hydration log
- [ ] Mobile-optimized dashboard layout
- [ ] Quick action cards (log workout, log meal, check-in)

### 3.2 Client Calendar
- [ ] Client calendar API route (`GET /api/client/calendar`)
- [ ] Calendar view: assigned workouts, check-in days, scheduled sessions
- [ ] Mobile calendar view with day detail drill-down

### 3.3 Active Workout
- [ ] Workout execution API (`GET /api/client/workout/:id`, `POST /api/client/workout/:id/log`)
- [ ] Active workout page: exercise list, sets/reps tracking, rest timer
- [ ] Workout summary popup on completion
- [ ] Mobile workout view (swipe between exercises)
- [ ] Mark sets as complete, log actual reps/weight
- [ ] PR detection and celebration

### 3.4 Check-in Forms
- [ ] Check-in API routes (GET form, POST submission)
- [ ] Daily check-in: weight, energy, sleep, hydration, notes
- [ ] Weekly check-in: extended form, progress photos, video upload
- [ ] Video upload to Cloudflare Stream (presigned URL flow)
- [ ] Mobile check-in views

### 3.5 Client Progress
- [ ] Progress API route (`GET /api/client/progress`)
- [ ] Progress charts: weight, body fat, measurements, performance
- [ ] Progress log entry (manual + from workout logs)
- [ ] Mobile progress analytics view

**M3 Exit Criteria**: Client can view dashboard, see assigned workouts, execute workouts with set/rep tracking, submit daily and weekly check-ins with video, and view progress charts.

### M3 Verification Gate (Mandatory)
> **This gate MUST be completed and passed before proceeding to M4. It cannot be bypassed.**
>
> Read the codebase for the current phase and verify against the relevant spec that all functionality has been correctly built, tested and is verified to be working. If you identify any gaps or non-working functionality, then go back and fix all defects. This verification gate is mandatory and cannot be bypassed before the whole phase is called complete.

- [ ] Verify all M3 API routes return correct responses (client dashboard, calendar, workout execution, check-ins, progress)
- [ ] Verify client dashboard renders with today's workout, nutrition summary, supplement reminders, hydration
- [ ] Verify client calendar shows assigned workouts, check-in days, and scheduled sessions
- [ ] Verify active workout flow: view exercises, track sets/reps, rest timer, mark complete, summary popup
- [ ] Verify daily check-in submission (weight, energy, sleep, hydration, notes)
- [ ] Verify weekly check-in submission with video upload to Cloudflare Stream
- [ ] Verify progress charts render with logged data (weight, body fat, measurements, performance)
- [ ] Verify all M3 views render correctly on mobile
- [ ] Verify all M3 checklist items are complete with no gaps
- [ ] Fix any defects found during verification before marking M3 complete

---

## M4 — Nutrition & Supplements (Weeks 9-11)

### 4.1 Nutrition Planning (Coach)
- [ ] Meal plan CRUD API routes
- [ ] Nutrition planning page: create meal plans, daily structure, macro targets
- [ ] Food database management (search, add custom foods, USDA import)
- [ ] Meal plan library (coach's templates)
- [ ] Assign meal plan to client
- [ ] Mobile nutrition planning view

### 4.2 Nutrition Logging (Client)
- [ ] Nutrition log API routes
- [ ] Nutrition plan view (assigned daily meal plan)
- [ ] Nutrition log page: search foods, log meals, track macros
- [ ] Meal detail drawer (macro breakdown per meal)
- [ ] Hydration logging (quick-add water intake)
- [ ] Mobile nutrition views

### 4.3 Supplement Hub (Coach)
- [ ] Supplement CRUD API routes
- [ ] Supplement hub page: library of supplements, search/filter
- [ ] Supplement detail view (dosage, timing, interactions)
- [ ] Supplement protocol builder: create/edit protocols, assign supplements with timing
- [ ] Supplement chart view (visual protocol timeline)
- [ ] Mobile supplement management view

### 4.4 Supplement View (Client)
- [ ] Client supplement API route (`GET /api/client/supplement-protocol`)
- [ ] Supplement stack view (today's supplements, timing)
- [ ] Supplement detail view (instructions, timing, food interactions)
- [ ] Mobile supplement stack view

**M4 Exit Criteria**: Coach can create meal plans, manage food database, create supplement protocols. Client can view assigned nutrition plans, log food intake, view supplement stack with timing.

### M4 Verification Gate (Mandatory)
> **This gate MUST be completed and passed before proceeding to M5. It cannot be bypassed.**
>
> Read the codebase for the current phase and verify against the relevant spec that all functionality has been correctly built, tested and is verified to be working. If you identify any gaps or non-working functionality, then go back and fix all defects. This verification gate is mandatory and cannot be bypassed before the whole phase is called complete.

- [ ] Verify all M4 API routes return correct responses (meal plans, food database, nutrition log, supplements, protocols)
- [ ] Verify coach can create meal plans with daily structure, macro targets, and assign to client
- [ ] Verify food database management (search, add custom foods, USDA import)
- [ ] Verify meal plan library CRUD and template duplication
- [ ] Verify client nutrition plan view and food logging with macro tracking
- [ ] Verify meal detail drawer with macro breakdown
- [ ] Verify hydration logging (quick-add water intake)
- [ ] Verify supplement hub: library, search/filter, detail view, protocol builder, chart view
- [ ] Verify client supplement stack view with timing and detail view
- [ ] Verify all M4 views render correctly on mobile and desktop
- [ ] Verify all M4 checklist items are complete with no gaps
- [ ] Fix any defects found during verification before marking M4 complete

---

## M5 — Communication & Content (Weeks 12-14)

### 5.1 Messaging
- [ ] Conversation and message API routes
- [ ] Message center (desktop): conversation list, thread view, send message
- [ ] Message center (mobile): simplified thread view
- [ ] Message polling (5s interval)
- [ ] Unread badge on nav
- [ ] Image/file attachment in messages
- [ ] Message search

### 5.2 Educational Vault (Coach)
- [ ] Vault item CRUD API routes
- [ ] Vault management page: upload content (video, PDF, images, links)
- [ ] Cloudflare Stream integration for video DRM (signed URLs, expiration)
- [ ] Cloudflare R2 integration for file uploads (presigned URLs)
- [ ] Vault content categories and tags
- [ ] Assign vault items to clients (with optional expiration)
- [ ] Mobile vault management view

### 5.3 Educational Vault (Client)
- [ ] Client vault API route (`GET /api/client/vault`)
- [ ] Vault browse page: assigned content, categories, search
- [ ] Video player (Cloudflare Stream, encrypted)
- [ ] PDF viewer (inline)
- [ ] Link opener (external)
- [ ] Mobile vault view

### 5.4 Form Builder
- [ ] Form CRUD API routes
- [ ] Form builder page: drag-and-drop visual editor (dnd-kit)
- [ ] Field types: text, number, select, multiselect, scale, yes/no, video upload, image upload
- [ ] Form preview (client view)
- [ ] Form templates (check-in, intake, assessment)
- [ ] Form management page: list, duplicate, archive
- [ ] Form submission review (coach side)

### 5.5 Check-in Management
- [ ] Check-in management page (coach): list submitted check-ins, filter by client/status
- [ ] Check-in video review: playback, add coach notes
- [ ] Check-in form assignment to client
- [ ] New client intake flow (assign intake form during onboarding)

**M5 Exit Criteria**: Coach and client can exchange messages with attachments. Coach can upload vault content with DRM and assign to clients. Coach can build custom forms with drag-and-drop. Coach can review check-in submissions with video.

### M5 Verification Gate (Mandatory)
> **This gate MUST be completed and passed before proceeding to M6. It cannot be bypassed.**
>
> Read the codebase for the current phase and verify against the relevant spec that all functionality has been correctly built, tested and is verified to be working. If you identify any gaps or non-working functionality, then go back and fix all defects. This verification gate is mandatory and cannot be bypassed before the whole phase is called complete.

- [ ] Verify all M5 API routes return correct responses (conversations, messages, vault, forms, check-in management)
- [ ] Verify messaging flow: coach sends message → client receives → client replies → coach receives (with polling)
- [ ] Verify message attachments (image, file) upload and display correctly
- [ ] Verify unread badge updates in real-time via polling
- [ ] Verify vault upload flow (video to Cloudflare Stream with DRM, PDF/images to R2)
- [ ] Verify vault DRM: signed URLs work, expiration enforced, download prevention active
- [ ] Verify vault assignment to clients with optional expiration
- [ ] Verify client vault browse, video playback (encrypted), PDF viewer, link opener
- [ ] Verify form builder drag-and-drop creates and saves form schemas correctly
- [ ] Verify all field types (text, number, select, multiselect, scale, yes/no, video/image upload)
- [ ] Verify form preview renders as client would see it
- [ ] Verify check-in management: list, filter, video review, coach notes, form assignment
- [ ] Verify all M5 views render correctly on mobile and desktop
- [ ] Verify all M5 checklist items are complete with no gaps
- [ ] Fix any defects found during verification before marking M5 complete

---

## M6 — Business Operations (Weeks 15-17)

### 6.1 Financial Analytics
- [ ] Financial summary API route (`GET /api/coach/financials`)
- [ ] Financial dashboard: revenue, MRR, client payments, churn
- [ ] Client payment breakdown: per-client revenue, payment history
- [ ] Financial charts (Recharts): revenue over time, client growth, package distribution
- [ ] Date range filters (monthly, quarterly, yearly)
- [ ] Mobile financial view

### 6.2 Package Management
- [ ] Package CRUD API routes
- [ ] Package management page: list, create, edit, archive
- [ ] Create package page: name, description, pricing (subscription or one-time), features, duration
- [ ] Stripe product + price creation on package save
- [ ] Assign package to client
- [ ] Package list view on client profile

### 6.3 Stripe Integration
- [ ] Stripe Connect onboarding for coaches (organization-level)
- [ ] Checkout session creation for client payments
- [ ] Webhook handler (payment success, failure, refund)
- [ ] Payment tracking in database
- [ ] Subscription management (cancel, pause, resume)
- [ ] Invoice generation and receipt emails

### 6.4 Pipeline Management
- [ ] Pipeline API routes (custom stages per org)
- [ ] Pipeline page: Kanban board with drag-and-drop
- [ ] Add/edit/remove pipeline stages
- [ ] Create pipeline entries (leads, contacts)
- [ ] Move entries between stages
- [ ] Pipeline metrics (conversion rates, average time in stage)

### 6.5 New Client Onboarding
- [ ] Onboarding flow: select package → assign intake form → create client profile
- [ ] Intake form assignment and completion tracking
- [ ] Automated welcome email (via Resend)
- [ ] Pipeline entry auto-creation from new client

### 6.6 Coach Profile & Settings
- [ ] Coach profile detail view: bio, specialties, certifications, photo
- [ ] Coach profile setup page (new coach onboarding)
- [ ] Settings page: notification preferences, default program, theme, org settings
- [ ] Organization settings: org name, logo, custom domain (stretch)

**M6 Exit Criteria**: Coach can view financial analytics, create packages with Stripe integration, manage sales pipeline with custom stages, onboard new clients with automated flows, and configure profile/settings.

### M6 Verification Gate (Mandatory)
> **This gate MUST be completed and passed before proceeding to M7. It cannot be bypassed.**
>
> Read the codebase for the current phase and verify against the relevant spec that all functionality has been correctly built, tested and is verified to be working. If you identify any gaps or non-working functionality, then go back and fix all defects. This verification gate is mandatory and cannot be bypassed before the whole phase is called complete.

- [ ] Verify all M6 API routes return correct responses (financials, packages, Stripe, pipeline, onboarding, profile/settings)
- [ ] Verify financial dashboard renders accurate revenue, MRR, client payments, churn metrics
- [ ] Verify client payment breakdown displays per-client revenue and payment history
- [ ] Verify financial charts render with date range filters (monthly, quarterly, yearly)
- [ ] Verify package CRUD: create with subscription or one-time pricing, edit, archive
- [ ] Verify Stripe product + price creation on package save
- [ ] Verify Stripe Connect onboarding flow for coaches
- [ ] Verify checkout session creation and webhook handling (success, failure, refund)
- [ ] Verify subscription management (cancel, pause, resume)
- [ ] Verify pipeline: custom stages per org, Kanban drag-and-drop, entry CRUD, stage movement, metrics
- [ ] Verify new client onboarding: select package → assign intake form → create client → welcome email
- [ ] Verify coach profile and settings pages save and persist correctly
- [ ] Verify all M6 views render correctly on mobile and desktop
- [ ] Verify all M6 checklist items are complete with no gaps
- [ ] Fix any defects found during verification before marking M6 complete

---

## M7 — Polish & Launch (Weeks 18-20)

### 7.1 Task Management
- [ ] Task CRUD API routes
- [ ] Task creation slide-in panel
- [ ] Task list on dashboard
- [ ] Assign tasks to self or clients
- [ ] Task due dates and priorities

### 7.2 Resource Management & Assignment
- [ ] Resource assignment API (programs, meal plans, supplements to clients)
- [ ] Batch assignment from library views
- [ ] Assignment history and status tracking

### 7.3 Scheduling & Events
- [ ] Event creation and management
- [ ] Event types: session, check-in, consultation, personal
- [ ] Calendar sync (iCal export, stretch: Google Calendar integration)

### 7.4 PWA & Mobile Optimization
- [ ] PWA manifest and service worker
- [ ] Offline support for active workout (IndexedDB for workout state)
- [ ] Mobile touch interactions (swipe, pull-to-refresh)
- [ ] Performance audit (Lighthouse > 90 all categories)
- [ ] Image optimization (Next.js Image, WebP, responsive)
- [ ] Bundle size optimization (code splitting, lazy loading)

### 7.5 Notifications
- [ ] In-app notification center (bell icon, dropdown)
- [ ] Browser push notifications (Web Push API)
- [ ] Email notifications via Resend (new message, check-in submitted, payment received, workout completed)
- [ ] Notification preferences page (per-user settings)

### 7.6 Security Audit
- [ ] OWASP Top 10 review
- [ ] Rate limiting on all API routes
- [ ] Input validation audit (all Zod schemas)
- [ ] Auth flow penetration test
- [ ] Multi-tenant isolation test (org A cannot access org B data)
- [ ] File upload security (type validation, size limits, virus scan)
- [ ] CSRF token verification on all mutations
- [ ] Security headers (CSP, HSTS, X-Frame-Options)

### 7.7 Testing
- [ ] Unit tests: >80% coverage on `pkg/core`, `pkg/db`, `pkg/auth`
- [ ] Integration tests: all API routes
- [ ] E2E tests (Playwright): critical paths (signup, create client, assign program, submit check-in, payment)
- [ ] Component tests: design system primitives
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing (iOS Safari, Android Chrome)

### 7.8 Documentation & Launch
- [ ] API documentation (OpenAPI spec)
- [ ] README with setup, development, deployment instructions
- [ ] ADR for major architectural decisions
- [ ] Runbook for production incidents
- [ ] Production deployment checklist
- [ ] DNS and domain configuration
- [ ] SSL certificate verification
- [ ] Monitoring and alerting setup (Sentry, Vercel Analytics)
- [ ] Launch 🚀

**M7 Exit Criteria**: All features complete. PWA installable. Lighthouse > 90. Security audit passed. 80%+ test coverage. Documentation complete. Production deployment verified.

### M7 Verification Gate (Mandatory)
> **This gate MUST be completed and passed before declaring the project launch-ready. It cannot be bypassed.**
>
> Read the codebase for the current phase and verify against the relevant spec that all functionality has been correctly built, tested and is verified to be working. If you identify any gaps or non-working functionality, then go back and fix all defects. This verification gate is mandatory and cannot be bypassed before the whole phase is called complete.

- [ ] Verify all M7 API routes and features work correctly (tasks, resource assignment, scheduling)
- [ ] Verify task CRUD, slide-in panel, dashboard integration, due dates, priorities
- [ ] Verify resource batch assignment from library views
- [ ] Verify PWA: installable, service worker registered, offline workout state via IndexedDB
- [ ] Verify mobile touch interactions (swipe, pull-to-refresh)
- [ ] Verify Lighthouse scores > 90 across all categories (Performance, Accessibility, Best Practices, SEO)
- [ ] Verify in-app notification center, browser push notifications, and email notifications all fire correctly
- [ ] Verify notification preferences page saves and respects per-user settings
- [ ] Verify security audit items: OWASP Top 10, rate limiting, input validation, auth pentest, multi-tenant isolation, file upload security, CSRF, security headers
- [ ] Verify test coverage >80% on `pkg/core`, `pkg/db`, `pkg/auth`
- [ ] Verify integration tests pass for all API routes
- [ ] Verify E2E tests pass for critical paths (signup, create client, assign program, submit check-in, payment)
- [ ] Verify component tests pass for design system primitives
- [ ] Verify accessibility audit passes (WCAG 2.1 AA)
- [ ] Verify cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Verify mobile device compatibility (iOS Safari, Android Chrome)
- [ ] Verify documentation is complete (OpenAPI spec, README, ADRs, runbook)
- [ ] Verify production deployment (DNS, SSL, monitoring, alerting)
- [ ] Verify all M7 checklist items are complete with no gaps
- [ ] Fix any defects found during verification before marking M7 complete

---

## Post-Launch (Backlog)

### P1
- [ ] Team Management (multi-coach org features)
- [ ] Social Media Planning with Instagram API integration
- [ ] WebSocket upgrade for real-time messaging
- [ ] Protocol Builder conditional logic (if X, show Y)
- [ ] Client roster export (CSV)
- [ ] Batch client actions

### P2
- [ ] Google Calendar sync
- [ ] Apple Health / Google Fit integration
- [ ] Custom branded coaching app (white-label)
- [ ] Advanced analytics (cohort analysis, retention curves)
- [ ] Referral program
- [ ] In-app video calls

### P3
- [ ] Native mobile apps (React Native)
- [ ] AI-powered workout suggestions
- [ ] AI meal plan generation
- [ ] Automated check-in scoring
- [ ] Group coaching features
