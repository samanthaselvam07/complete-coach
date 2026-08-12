# Complete Coach Product Specification

## Status
Planning baseline. No implementation may start until this specification, roadmap, architecture notes, and review checklists are accepted.

## Product Intent
Complete Coach is a multi-tenant coaching operations platform for fitness and performance coaching businesses. The product combines CRM, client management, forms/check-ins, training, nutrition, education, supplements, messaging, packages/payments, team operations, analytics, and external analysis APIs into one coach-facing workspace.

The imported UI design in `ui-design/Complete Coach.zip` is the visual source of truth. The first implementation deliverable must be a launchable UI stub that carries the design across verbatim using sample data. Backend and production workflows will then replace local sample state incrementally without changing the established visual system.

## Confirmed Decisions
- Tenancy: multi-tenant SaaS using organization/workspace tenancy.
- Client ownership: clients belong to exactly one organization for MVP.
- Auth: NextAuth/Auth.js.
- App foundation: Next.js App Router.
- Database: PostgreSQL on Neon.
- ORM/migrations: Prisma.
- File/media storage: S3-compatible object storage.
- Storage provider: Cloudflare R2.
- Payments: Stripe Billing.
- Multi-tenant payment routing: Stripe Connect.
- Roles: `owner`, `admin`, `coach`, `assistant`, `client`.
- Client portal: minimal foundation included, coach/admin workflows prioritized first.
- MVP priority: clients/CRM, forms/check-ins, training, nutrition, messaging/tasks/dashboard, payments, education/supplements, team/analytics polish.
- Training/nutrition model: reusable templates plus client-specific assigned copies.
- Exercise/food/supplement libraries: global curated library plus tenant-owned private items.
- Assignment records: snapshot library item details to preserve historical accuracy.
- Forms/check-ins: hybrid model with versioned JSON definitions/submissions plus typed extracted metrics.
- External analysis access: versioned REST API plus signed webhooks.
- External API auth: organization-scoped API keys with scoped permissions, rotation, rate limits, audit logs, optional IP allowlists.
- External data privacy: de-identified exports by default; PII requires elevated scope.
- Messaging: in-app coach-client messaging with attachments, read receipts, notification records.
- Notifications: in-app plus transactional email.
- Email provider: Resend.
- Social media: MVP is planning/content calendar only; full integrations are a later phase.
- AI-assisted coaching: architectural foundation and audit controls now; user-facing automation later.
- Audit baseline: audit logs for auth, role changes, client access/changes, forms, exports, API key use, payments/webhooks, uploads/downloads, AI-assisted actions.
- Logging: comprehensive structured debug logging, redacted by default.
- Deployment: Vercel app, Neon database, Cloudflare R2 media, Stripe Connect, Resend, Inngest jobs.
- Queue/workflows: Inngest.
- Environments: local, preview, staging, production with isolated credentials and data.
- Secrets: no hardcoded secrets or keys anywhere.
- Observability: Sentry, structured request logs, Vercel logs, Inngest run history, persisted webhook events.

## User Roles
### Owner
The organization owner controls subscription, Stripe Connect onboarding, workspace settings, billing configuration, team access, and all organization records.

### Admin
Admins manage team members, client records, forms, packages, content libraries, and operational settings. Admins cannot remove the owner or transfer organization ownership unless explicitly granted later.

### Coach
Coaches manage assigned clients, training/nutrition/supplement plans, check-ins, messages, tasks, and resources. Coaches can view organization libraries but only mutate records allowed by role policy.

### Assistant
Assistants support admin tasks such as reviewing form queues, scheduling, content preparation, and CRM updates. They have limited access to sensitive health notes and payment data.

### Client
Clients access a minimal portal for assigned check-ins/forms, messages, plans/resources, and profile-level data. Client portal functionality is foundational at first and expanded after coach workflows stabilize.

## Core Product Domains
### Dashboard And Operations
The dashboard gives coaches an immediate operating view:
- Revenue and capacity metrics.
- Priority tasks.
- New onboarding actions.
- Program review actions.
- Live pipeline events.
- Work to-do lists by category.
- Quick actions for adding tasks, reports, messages, and client activity.

MVP dashboard data can initially be sample-backed in the UI stub, then progressively backed by real clients, check-ins, CRM, payments, messages, and tasks.

### Clients
The client roster supports:
- Search and filtering by status and check-in day.
- Statuses: active, archived, new, deactivated.
- Client profile navigation.
- Compliance score display.
- Latest check-in metadata.
- CSV export/import planning.
- Package assignment display.
- Progress and coaching data surfaces.

Client profile supports:
- Overview metrics.
- Training, nutrition, and supplementation tabs.
- Workout calendar.
- Calendar events.
- Progress charting.
- Active meal plan selection.
- Training program editing.
- Exercise drag/reorder interaction.
- Event creation.
- Check-in history.

### CRM
The CRM tracks lead acquisition:
- Leads with contact details, source, status, location, notes, and stage.
- Application form submissions create or update organization-scoped CRM leads from submitted contact details.
- Pipeline stages: initial contact, consultation scheduled, proposal sent, negotiation, closed-won.
- Drag-and-drop movement between stages.
- Contact actions for email, phone, and scheduling.

MVP should persist lead records and stage transitions before introducing advanced automation.

### Forms And Check-Ins
Forms include:
- Form template selection.
- Template-specific preset question checklists before customization.
- Form builder with text, long text, agreement/content blocks, number, multiple choice, radio button, rating out of 10, phone, email, date, time, photo, dropdown, and checkbox fields.
- Click or drag-and-drop field insertion into an independently scrollable builder canvas.
- Saved forms are published/active by default; no coach-created form remains in draft state.
- Organization-scoped share links that coaches can copy from the form library and public recipients can open without signing in.
- Assigned client form submission storage and public form responses that create or update CRM leads when contact details are supplied.
- Check-in review queue.

Check-ins require:
- Pending/completed review states.
- Sorting by oldest/newest/client name.
- Full check-in review flow.
- Mark-as-complete action.
- Metric extraction into typed tables.
- External analysis APIs and webhooks.

### Training
Training includes:
- Training overview.
- Training programs.
- Exercise database.
- Add exercise flow.
- Exercise media/video upload.
- Anatomy filters.
- Equipment filters.
- Program templates.
- Client-specific assignments.
- Assignment snapshots.

The first UI stub must preserve the visual feel of “The Movement Vault” and add-exercise screens exactly from the design export.

### Nutrition
Nutrition includes:
- Nutrition overview.
- Meal plan library.
- Food database.
- Active client assignments.
- Master nutrition templates.
- Macro targets.
- Template cloning.
- Client-specific assigned copies.
- Global and organization-owned foods.
- Historical plan snapshots.

### Education
Education includes:
- Resource library.
- Resource category filters.
- Create new resource flow.
- PDF/video/link/file resources.
- Assignment to clients.
- Resource archive.
- Later analytics for resource engagement.

### Supplementation
Supplementation includes:
- Supplementation overview.
- Supplement plans.
- Supplement database.
- New protocol slide-in panel.
- Timing recommendations.
- Bioavailability notes.
- Clinical description.
- Tags/categories.
- Global and organization-owned supplements.
- Client-specific assignments.

### Messaging
Messaging includes:
- Conversations.
- Message history.
- Message send input.
- Search conversations.
- Attachments via R2 signed URLs.
- Read receipts.
- Notification records.

MVP does not include SMS/WhatsApp/email two-way messaging.

### Packages And Payments
Packages include:
- Package listing.
- Price and tier display.
- Client counts.
- Edit/copy/delete actions.
- Stripe product/price mapping.
- Stripe Connect account linking.
- Subscription and payment webhook handling.

Stripe webhooks are the source of truth for payment and subscription status.

### Social Media
MVP supports planning/content-calendar only. Full social functionality is a later phase and must include separate specs for OAuth, posting permissions, media constraints, provider review requirements, retries, failure handling, and audit logging.

### Team Management
Team management includes:
- Team members.
- Role assignments.
- Tasks.
- Invitation workflow.
- Access control boundaries.
- Audit logs for role changes.

### AI-Assisted Coaching
Foundation only in early phases:
- AI action audit model.
- Redaction policy.
- Prompt/input/output storage rules.
- Human approval flags.
- Cost tracking hooks.

User-facing AI features are deferred to a later phase:
- Check-in summaries.
- Risk flags.
- Workout/nutrition suggestions.
- Form extraction.
- Message drafts.
- Resource recommendations.

## MVP Success Criteria
- A working Next.js UI stub can be launched locally and visually matches the supplied UI design.
- The design-system stylesheet is generated from and traceable to the UI design export.
- Static sample data is isolated from future service/data layers so it can be replaced incrementally.
- Multi-tenant data model is defined before persistence implementation.
- Auth, roles, and organization boundaries are designed before protected workflows are implemented.
- PostgreSQL schema, Prisma models, API contracts, external analysis APIs, and webhook contracts are documented before coding.
- Every implementation ticket includes tests first, documentation updates, and quality gates.
