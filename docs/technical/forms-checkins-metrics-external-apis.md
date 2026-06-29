# Forms, Check-Ins, Metrics, And External APIs

Ticket 013 / M4 turns the fixture-backed forms and check-in UI into a persistent workflow and exposes de-identified analytics data to external analysis systems.

## Current State
- `/forms` now loads persisted forms from `/api/v1/forms`, can save drafts, publish forms, and assign published forms to clients. When the persistence API is unavailable, it renders an empty/error state rather than local demo forms.
- `/clients/check-ins` now loads persisted check-ins from `/api/v1/check-ins`, opens persisted submission details, and supports review/complete actions. When the persistence API is unavailable, it renders an empty/error state rather than local demo check-ins.
- Prisma has auth, tenancy, clients, client profiles, leads, lead activities, forms, form versions, assignments, submissions, check-ins, measurements, external API keys, export jobs, webhook endpoints, and webhook deliveries.
- Internal forms APIs now exist for form containers, immutable versions, publishing, and assignments.
- Existing role capabilities already include `forms:*`, `submissions:*`, `metrics:read`, `api_keys:manage`, and `exports:read`.

## Ticket 013A Outcome
Completed on May 14, 2026.

Delivered:
- Prisma schema and forward-only migration for forms, immutable versions, assignments, submissions, check-ins, client measurements, external API keys, export jobs, webhook endpoints, and webhook deliveries.
- Stable per-organization `external_client_id` support on clients.
- `actor_api_key_id` support on audit logs for future external API access auditing.
- Demo seed data for a published weekly check-in form, version, assignment, submission, check-in, and extracted metrics.
- Zod form definition validation helpers.
- Deterministic metric extraction helpers.
- External API key prefix/generation/hash/verify helpers.
- Webhook signature generation and verification helpers.
- Unit tests for form validation, metric extraction, API key hashing, and webhook signing.

## Ticket 013B Outcome
Completed on May 14, 2026.

Delivered:
- `GET /api/v1/forms` with active-organization scoping and filters for status, type, search, and limit.
- `POST /api/v1/forms` with Zod validation, tenant ownership, and `form.created` audit logging.
- `GET /api/v1/forms/{form_id}` with tenant scoping and version listing.
- `PATCH /api/v1/forms/{form_id}` with explicit-field-only metadata updates and `form.updated` audit logging.
- `POST /api/v1/forms/{form_id}/versions` with immutable incrementing version creation and `form.version.created` audit logging.
- `POST /api/v1/forms/{form_id}/publish` with transactional version publishing, `current_version_id` update, status transition to published, and `form.published` audit logging.
- `POST /api/v1/forms/{form_id}/assignments` with published-version enforcement, scoped client lookup, and `form.assigned` audit logging.
- Route integration tests for authentication, tenant scoping, versioning, publishing, assignment, and cross-tenant client denial.

## Ticket 013C Outcome
Completed on May 14, 2026.

Delivered:
- `/forms` management list now prefers persisted forms from `GET /api/v1/forms?limit=20`.
- Fixture-backed recent forms remain visible only when the persistence API is unavailable.
- Form builder now edits title and description instead of hardcoded metadata.
- Save draft creates or updates the form container, then creates an immutable form version.
- Publish saves the current draft version, then calls the publish endpoint and updates local persisted state.
- Assignment loads clients from `GET /api/v1/clients?limit=100` and assigns a published current version to the selected client.
- Component tests cover API-backed forms, fallback behavior, draft save, publish, assignment, and existing local field interactions.

## Ticket 013D Outcome
Completed on May 14, 2026.

Delivered:
- `GET /api/v1/form-assignments` and `GET /api/v1/form-assignments/{assignment_id}` with organization scoping and immutable assigned version payloads.
- `POST /api/v1/form-assignments/{assignment_id}/submit` with answer validation, exact-version `answers_json` persistence, check-in creation for check-in forms, idempotent metric upserts, and audit logging without raw answer or note payloads.
- `GET /api/v1/form-submissions` and `GET /api/v1/form-submissions/{submission_id}` for persisted submission reads.
- `GET /api/v1/check-ins`, `GET /api/v1/check-ins/{check_in_id}`, review, complete, and extracted-metrics routes with semantic state transition errors.
- `GET /api/v1/clients/{client_id}/metrics` with client, metric key, date range, and limit filters.
- `/clients/check-ins` now prefers persisted API data, opens persisted answers and extracted metrics, and performs review/complete mutations against the API.
- Integration and component tests cover assignment submission, check-in review/complete transitions, metric extraction/querying, and UI fallback behavior.

## Ticket 013E Outcome
Completed on May 14, 2026.

Delivered:
- External bearer API key authentication that identifies keys by prefix, verifies the stored hash, enforces active/non-expired status, optional IP allowlists, scopes, and per-key/IP rate limits.
- External request audit logging through `actor_api_key_id` without writing API secrets, raw answers, free-text notes, coach notes, or raw health notes.
- `GET /api/v1/external/clients` with default de-identification, explicit `include_pii=true` support, and `external:client_pii:read` gating.
- `GET /api/v1/external/clients/{external_client_id}/metrics` and `GET /api/v1/external/metrics` with typed metric payloads and stable external client identifiers only.
- `GET /api/v1/external/form-submissions` with safe answer export limited to fields marked `metadata` or `metric`.
- `GET /api/v1/external/check-ins` with typed review status and no summary, coach notes, or raw health-note payloads.
- Cursor pagination and limit caps on all external read endpoints.
- Integration tests cover external auth failures, scopes, PII gating, pagination, audit logs, de-identification, and rate limiting.

## Ticket 013F Outcome
Completed on May 14, 2026.

Delivered:
- `POST /api/v1/external/exports` creates queued export jobs with type, format, filters, requester API key, and timestamps.
- `GET /api/v1/external/exports/{export_id}` returns queued/running/completed/failed export status. Completed exports expose a stable download URL placeholder while keeping internal object keys private.
- `GET /api/v1/external/webhook-endpoints` lists configured webhook endpoints without returning signing secrets or hashes.
- `POST /api/v1/external/webhook-endpoints` creates HTTPS-only endpoints, stores a hashed signing secret, and returns the signing secret once at creation.
- `PATCH /api/v1/external/webhook-endpoints/{endpoint_id}` updates mutable endpoint metadata and event subscriptions.
- `DELETE /api/v1/external/webhook-endpoints/{endpoint_id}` disables endpoints without deleting delivery history.
- Export creation creates pending webhook delivery records for active endpoints subscribed to `external_export.created`.
- Webhook delivery execution is intentionally deferred to a future background worker. The persisted delivery model is retry-ready with `status`, `attempt_count`, `next_retry_at`, and `last_error`.
- Integration tests cover export creation/status, webhook endpoint management, secret non-retrieval, delivery persistence, scope enforcement, validation, and tenant ownership.

## Ticket 013G Outcome
Completed on May 14, 2026.

Delivered:
- Mandatory M4 review compared implementation against the technical plan, ADR-004, API contract, data model spec, roadmap, and checklist.
- Closed the remaining E2E coverage gap for coach form creation, publishing, assignment, check-in review, check-in completion, and de-identified external metrics.
- Verified migrations and seed against a clean disposable PostgreSQL database.
- Verified API integration tests, component tests, E2E tests, lint, typecheck, build, coverage, and the full `pnpm --dir apps/web check` gate.

## Source Specs
- `docs/adr/ADR-004-forms-checkins-and-external-analysis.md`
- `docs/api/api-contract-spec.md`
- `docs/architecture/architecture-spec.md`
- `docs/architecture/data-model-spec.md`
- `docs/roadmap/implementation-roadmap.md`
- `docs/roadmap/implementation-ticket-map.md`

## Assumptions
- PostgreSQL remains the durable source of truth.
- Authenticated coach/admin/owner users use Auth.js session context and active organization tenancy.
- External analysis systems use bearer API keys, not Auth.js sessions.
- API keys are shown only once at creation and stored hashed.
- External APIs are de-identified by default.
- PII export requires `external:client_pii:read`, explicit `include_pii=true`, and audit logging.
- Client-facing submission can start as a signed assignment token flow if full client portal auth is not ready.
- Export jobs and webhook retries can be persisted synchronously first, with background workers added when Inngest is introduced.

## Non-Goals
- AI-assisted metric extraction.
- File upload storage for form photo/file fields.
- Full client portal beyond assigned form/check-in submission.
- Analytics dashboards beyond typed data export endpoints.
- Webhook delivery worker infrastructure beyond durable records and signing primitives.

## Data Model
Add a forward-only Prisma migration for:
- `forms`
- `form_versions`
- `form_assignments`
- `form_submissions`
- `check_ins`
- `client_measurements`
- `external_api_keys`
- `external_export_jobs`
- `external_webhook_endpoints`
- `external_webhook_deliveries`

Required model rules:
- Every tenant-owned table must include `organization_id`.
- Every query must scope by `organization_id`.
- `form_versions` are immutable after creation.
- `form_assignments` reference a specific immutable `form_version_id`.
- `form_submissions` reference the exact `form_version_id` used for rendering/submission.
- `client_measurements` reference source records with `source_type` and `source_id`.
- External client IDs must be stable per organization and not equal to internal client IDs.

Recommended indexes:
- `forms`: `organization_id,status`, `organization_id,type`.
- `form_versions`: unique `form_id,version_number`, plus `organization_id,form_id`.
- `form_assignments`: `organization_id,client_id,status,due_at`, `organization_id,form_id,status`.
- `form_submissions`: `organization_id,client_id,submitted_at`, `organization_id,status,submitted_at`, `organization_id,form_id,submitted_at`.
- `check_ins`: `organization_id,status,due_at`, `organization_id,client_id,submitted_at`.
- `client_measurements`: `organization_id,client_id,metric_key,measured_at`, `organization_id,source_type,source_id`.
- `external_api_keys`: unique key prefix, `organization_id,status`, `organization_id,expires_at`.
- `external_webhook_deliveries`: `organization_id,status,next_retry_at`, `organization_id,endpoint_id,created_at`.

## Internal API Surface
Implement internal APIs under `/api/v1` with existing response/error envelopes.

Forms:
- `GET /api/v1/forms`
- `POST /api/v1/forms`
- `GET /api/v1/forms/{form_id}`
- `PATCH /api/v1/forms/{form_id}`
- `POST /api/v1/forms/{form_id}/versions`
- `POST /api/v1/forms/{form_id}/publish`
- `POST /api/v1/forms/{form_id}/assignments`

Assignments and submissions:
- `GET /api/v1/form-assignments`
- `GET /api/v1/form-assignments/{assignment_id}`
- `POST /api/v1/form-assignments/{assignment_id}/submit`
- `GET /api/v1/form-submissions`
- `GET /api/v1/form-submissions/{submission_id}`

Check-ins:
- `GET /api/v1/check-ins`
- `GET /api/v1/check-ins/{check_in_id}`
- `POST /api/v1/check-ins/{check_in_id}/review`
- `POST /api/v1/check-ins/{check_in_id}/complete`
- `GET /api/v1/check-ins/{check_in_id}/extracted-metrics`

Client metrics:
- `GET /api/v1/clients/{client_id}/metrics`

## External API Surface
Implement external APIs under `/api/v1/external`.

API key and request requirements:
- Authenticate `Authorization: Bearer cc_live_*` or `cc_test_*`.
- Hash stored keys with a strong one-way hash.
- Match by key prefix before verifying hash.
- Enforce scopes per endpoint.
- Enforce expiry, revocation, optional IP allowlist, and rate limit.
- Write audit logs for key creation, revocation, use, PII access, and exports.

Endpoints:
- `GET /api/v1/external/clients`
- `GET /api/v1/external/clients/{external_client_id}/metrics`
- `GET /api/v1/external/metrics`
- `GET /api/v1/external/form-submissions`
- `GET /api/v1/external/check-ins`
- `POST /api/v1/external/exports`
- `GET /api/v1/external/exports/{export_id}`
- `GET /api/v1/external/webhook-endpoints`
- `POST /api/v1/external/webhook-endpoints`
- `PATCH /api/v1/external/webhook-endpoints/{endpoint_id}`
- `DELETE /api/v1/external/webhook-endpoints/{endpoint_id}`

## De-Identification Policy
Default external responses must not include:
- Names.
- Emails.
- Phone numbers.
- Exact addresses or fine-grained location.
- Photos or file URLs.
- Free-text notes.
- Raw health, injury, or medical notes.

Default external responses may include:
- Stable `external_client_id`.
- Broad status.
- Broad dates/timestamps where allowed.
- Typed metrics.
- Form/submission/check-in metadata.
- Structured non-PII answers explicitly marked exportable in form schema.

PII may only be returned when:
- The API key has `external:client_pii:read`.
- The endpoint supports PII.
- The request includes `include_pii=true`.
- The request is audit logged.

## Form Schema And Metric Extraction
Form schema should be JSON but validated before persistence.

Minimum field shape:
- `id`
- `type`
- `label`
- `required`
- `options`
- `metric_key`
- `metric_unit`
- `export_policy`

Metric extraction rules:
- Only fields with `metric_key` create `client_measurements`.
- Numeric metric fields must parse to finite numbers.
- Metric `measured_at` should default to submitted time unless the field provides a measurement date.
- Metric extraction must be deterministic and covered by unit tests.
- Re-running extraction for the same submission should be idempotent.

## UI Wiring Plan
Forms:
- Load recent forms from `GET /api/v1/forms`.
- Save builder drafts through `POST /api/v1/forms` and `POST /api/v1/forms/{form_id}/versions`.
- Publish drafts through `POST /api/v1/forms/{form_id}/publish`.
- Assign published versions through `POST /api/v1/forms/{form_id}/assignments`.
- Preview environments must apply the API schema and seed Neon data; runtime forms/check-in pages do not use local fixture fallback.

Check-ins:
- Load queue from `GET /api/v1/check-ins`.
- Open a check-in detail view backed by `GET /api/v1/check-ins/{check_in_id}`.
- Review through `POST /api/v1/check-ins/{check_in_id}/review`.
- Complete through `POST /api/v1/check-ins/{check_in_id}/complete`.
- Show extracted metrics from `GET /api/v1/check-ins/{check_in_id}/extracted-metrics`.

Client submission:
- Render assigned form version from assignment lookup.
- Submit raw answers to the assignment submit endpoint.
- Create/update `form_submissions`, `check_ins`, and `client_measurements`.

## Audit Events
Required actions:
- `form.created`
- `form.updated`
- `form.version.created`
- `form.published`
- `form.assigned`
- `form.submission.created`
- `check_in.reviewed`
- `check_in.completed`
- `metric.extracted`
- `external_api_key.created`
- `external_api_key.revoked`
- `external_api_key.used`
- `external_api.pii_accessed`
- `external_export.created`
- `external_webhook_endpoint.created`
- `external_webhook_endpoint.updated`
- `external_webhook_endpoint.disabled`
- `external_webhook_delivery.created`
- `external_webhook_delivery.failed`
- `external_webhook_delivery.succeeded`

Audit metadata must exclude API key secrets, raw health notes, raw free-text answers, and unredacted PII.

## Webhook Delivery Retry Model
Ticket 013F persists webhook delivery records but does not perform outbound HTTP delivery yet.

Retry-ready fields:
- `status`: `pending`, `succeeded`, or `failed`.
- `attempt_count`: number of delivery attempts performed by a future worker.
- `next_retry_at`: timestamp when a failed delivery becomes eligible for retry.
- `last_error`: redacted delivery error summary.

Future worker behavior:
- Select `pending` or retry-eligible `failed` deliveries by organization and `next_retry_at`.
- Sign payloads with the endpoint signing secret model used by `buildWebhookSignature`.
- Increment `attempt_count` on each attempt.
- Mark `succeeded` on 2xx responses.
- Mark `failed` and schedule `next_retry_at` with backoff on network failures or non-2xx responses.

## Test Strategy
Use TDD for each slice.

Unit tests:
- Form schema validation.
- Form version immutability helpers.
- Metric extraction.
- De-identification mappers.
- External API key hashing/prefix matching.
- Webhook signature generation and verification.
- Rate limit decisions.

Integration tests:
- Form CRUD, version creation, publish, and assignment.
- Submission creates raw submission and extracted metrics.
- Check-in review/complete state transitions.
- Tenant isolation and cross-tenant denial.
- External API scopes, de-identification, PII gating, pagination, and audit logs.
- Webhook endpoint CRUD and delivery persistence.

Component tests:
- Form builder save/publish/assign flows.
- Check-in queue load/review/complete.
- Submission form rendering and validation.

E2E tests:
- Coach creates, publishes, assigns, and reviews a check-in form.
- Client or signed assignment submits a check-in.
- External metrics endpoint returns de-identified data.

Verification command:
```bash
pnpm --dir apps/web check
```

## Implementation Order
1. Ticket 013A: Schema, migrations, generated Prisma client, seed data, and pure domain helpers.
2. Ticket 013B: Form definition/version/publish/assignment internal APIs.
3. Ticket 013C: Form builder UI persistence and assignment UI.
4. Ticket 013D: Submission flow, check-in queue APIs, review/complete transitions, and metric extraction.
5. Ticket 013E: External API key model, authentication helper, scopes, de-identification, rate limits, and metrics/client/submission/check-in read APIs.
6. Ticket 013F: External exports, webhook endpoint management, one-time signing secrets, delivery persistence, and retry-ready status model.
7. Ticket 013G: M4 mandatory review gate.

## Open Risks
- M4 is larger than previous tickets and should not be merged as one undifferentiated implementation.
- External API rate limiting may need a durable store for production-grade distributed limits; a database-backed limiter is acceptable for the first production slice.
- Background export and webhook delivery processing may need a follow-up when Inngest is introduced.
- Client-facing submission UX depends on whether full client portal auth is prioritized now or signed assignment links are acceptable for M4.
