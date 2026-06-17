# API Contract Specification

## Standards
- Base path: `/api/v1`.
- External analysis path: `/api/v1/external`.
- Webhooks: `/api/webhooks`.
- Request/response content type: `application/json` unless uploading/downloading files through signed URLs.
- Internal authenticated APIs use NextAuth session cookies.
- External APIs use organization-scoped API keys.
- Webhook requests use provider-specific signatures.

## Response Envelope
Success:
```json
{
  "data": {},
  "meta": {},
  "links": {}
}
```

Collection:
```json
{
  "data": [],
  "meta": {
    "limit": 50,
    "cursor": "next-cursor",
    "has_more": true
  },
  "links": {
    "next": "/api/v1/clients?cursor=next-cursor&limit=50"
  }
}
```

Error:
```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "code": "invalid_format",
        "message": "Must be a valid email address"
      }
    ]
  }
}
```

## Status Codes
- `200 OK`: successful read/update with body.
- `201 Created`: successful creation.
- `204 No Content`: successful delete/archive with no body.
- `400 Bad Request`: malformed query/body.
- `401 Unauthorized`: missing/invalid auth.
- `403 Forbidden`: authenticated but not permitted.
- `404 Not Found`: record does not exist or is not visible to actor.
- `409 Conflict`: duplicate or invalid state transition.
- `422 Unprocessable Entity`: semantically invalid request.
- `429 Too Many Requests`: rate limit exceeded.
- `500 Internal Server Error`: unexpected failure.

## Pagination
Use cursor pagination for all growing collections. Cursor must encode stable ordering fields and be opaque to clients.

Default:
- `limit`: 50.
- Max `limit`: 200 for internal APIs.
- Max `limit`: 1000 for external export APIs with explicit export scope.

## Internal App APIs
### Organizations
- `GET /api/v1/organizations`: list organizations available to current user.
- `GET /api/v1/organizations/current`: get active organization context.
- `PATCH /api/v1/organizations/current`: update organization settings.
- `GET /api/v1/organizations/current/email-domains`: list organisation sender domains and provider DNS records. Requires `team:manage`.
- `POST /api/v1/organizations/current/email-domains`: creates a Resend sender domain for the active organisation and returns DNS records. Body: `domain`, `fromLocalPart`, `senderName`. Requires `team:manage`.
- `POST /api/v1/organizations/current/email-domains/{sender_domain_id}/verify`: asks Resend to verify DNS records and refreshes stored record/status data. Requires `team:manage`.

### Team
- `GET /api/v1/team-members`: returns organization-scoped memberships with `activeClientCount`, `capacityLimit`, `capacityPercent`, and pending invitations. Requires `team:read`.
- `POST /api/v1/team-members/invitations`: creates a seven-day invitation for `admin`, `coach`, or `assistant`, stores only a SHA-256 token hash, queues a Resend email, and audits the action. Requires `team:manage`. Production responses do not return the raw token.
- `POST /api/v1/team-invitations/accept`: accepts a pending invitation for the authenticated user's matching email, activates the membership atomically, consumes the invitation, and audits acceptance. Body: `token`.
- `PATCH /api/v1/team-members/{membership_id}`: updates `role` and/or `status`. The last active owner cannot be demoted. Requires `team:manage`.
- `DELETE /api/v1/team-members/{membership_id}`: marks the membership removed. The last active owner cannot be removed. Requires `team:manage`.

### Clients
- `GET /api/v1/clients`
- `POST /api/v1/clients`
- `GET /api/v1/clients/{client_id}`
- `PATCH /api/v1/clients/{client_id}`
- `POST /api/v1/clients/{client_id}/archive`
- `GET /api/v1/clients/{client_id}/profile`
- `PATCH /api/v1/clients/{client_id}/profile`
- `GET /api/v1/clients/{client_id}/metrics`
- `GET /api/v1/clients/{client_id}/timeline`

Query filters:
- `status`
- `primary_coach_user_id`
- `check_in_day`
- `search`
- `cursor`
- `limit`

### CRM
- `GET /api/v1/leads`
- `POST /api/v1/leads`
- `GET /api/v1/leads/{lead_id}`
- `PATCH /api/v1/leads/{lead_id}`
- `POST /api/v1/leads/{lead_id}/stage-transitions`
- `GET /api/v1/leads/{lead_id}/activities`
- `POST /api/v1/leads/{lead_id}/activities`

### Forms
- `GET /api/v1/forms`: returns active-organization forms. Query: `status`, `type`, `search`, `limit`.
- `POST /api/v1/forms`: creates a form container. Body: `name`, `description`, `type`, optional `status`.
- `GET /api/v1/forms/{form_id}`: returns one active-organization form plus immutable versions.
- `PATCH /api/v1/forms/{form_id}`: updates mutable metadata only. Body: any explicit subset of `name`, `description`, `type`, `status`.
- `POST /api/v1/forms/{form_id}/versions`: creates the next immutable version. Body: validated `schema`, optional `ui`.
- `POST /api/v1/forms/{form_id}/publish`: publishes a version and sets `current_version_id`. Body: `formVersionId`.
- `POST /api/v1/forms/{form_id}/assignments`: assigns a published version to a scoped client. Body: `clientId`, optional `formVersionId`, optional `dueAt`.
- `GET /api/v1/form-assignments`: returns active-organization form assignments. Query: `clientId`, `status`, `limit`.
- `GET /api/v1/form-assignments/{assignment_id}`: returns one active-organization assignment with the immutable assigned form version.
- `POST /api/v1/form-assignments/{assignment_id}/submit`: submits answers for the assigned immutable version, creates a submission, creates a check-in where appropriate, and extracts configured metrics. Body: `answers`.
- `GET /api/v1/form-submissions`: returns active-organization form submissions. Query: `clientId`, `formId`, `status`, `limit`.
- `GET /api/v1/form-submissions/{submission_id}`: returns one active-organization submission with persisted answers and form metadata.

### Check-Ins
- `GET /api/v1/check-ins`: returns active-organization check-ins. Query: `clientId`, `status`, `limit`.
- `GET /api/v1/check-ins/{check_in_id}`: returns one active-organization check-in with persisted submission answers and extracted metrics.
- `POST /api/v1/check-ins/{check_in_id}/review`: transitions a pending check-in to reviewed. Body: optional `summary`, optional `coachNotes`.
- `POST /api/v1/check-ins/{check_in_id}/complete`: transitions a check-in to completed.
- `GET /api/v1/check-ins/{check_in_id}/extracted-metrics`: returns metrics extracted from the check-in submission.
- `POST /api/v1/check-ins/{check_in_id}/ai-review`: generates a CHFI-style AI-assisted review for one organization-scoped check-in. Requires `ai:generate`. Optional body: `methodologyProfileId` to use a specific active organization methodology profile; otherwise the organization default profile is used when present. Creates an `ai_generation`, pending `ai_outputs`, and an audit event. Response includes serialized generation usage and pending outputs; it never includes raw provider output or unsafe input.

### AI-Assisted Coaching
- `GET /api/v1/ai/methodology-profiles`: returns active organization-scoped coach methodology profiles. Requires `ai:read`.
- `POST /api/v1/ai/methodology-profiles`: creates a coach methodology profile. Requires `ai:approve`. Body: `name`, `methodology`, optional `description`, optional `tone`, optional arrays `principles`, `checkInSections`, `redFlagRules`, `adjustmentRules`, `forbiddenRecommendations`, and optional `isDefault`. If `isDefault` is true, existing organization defaults are unset. Writes an audit event with counts only.
- `POST /api/v1/ai/methodology-profiles/{profile_id}/default`: sets an active organization profile as the default for future AI check-in reviews. Requires `ai:approve`. Writes an audit event.
- `GET /api/v1/ai/recommendations`: returns organization-scoped AI outputs. Query: optional `clientId`, `targetType`, `targetId`, `status`, `limit`. Requires `ai:read`.
- `POST /api/v1/ai/recommendations/{recommendation_id}/approve`: approves a pending AI output. Requires `ai:approve`. Writes an audit event.
- `POST /api/v1/ai/recommendations/{recommendation_id}/reject`: rejects a pending AI output. Requires `ai:approve`. Body: `reason`. Writes an audit event with reason length only.
- `GET /api/v1/ai/usage`: returns organization-level generation counts, token totals, estimated cost cents, and status breakdowns. Query: optional `dateFrom`, `dateTo`. Requires `ai:read`.

AI output types:
- `check-in-summary`
- `risk-flag`
- `workout-suggestion`
- `nutrition-suggestion`
- `message-draft`
- `resource-recommendation`
- `extraction-enhancement`

AI output statuses:
- `pending-approval`
- `approved`
- `rejected`
- `applied`
- `discarded`

### Client Metrics
- `GET /api/v1/clients/{client_id}/metrics`: returns active-organization client measurements. Query: `metricKey`, `dateFrom`, `dateTo`, `limit`.

### Training
- `GET /api/v1/exercises`: returns global library exercises and active-organization private exercises. Query: `scope`, `category`, `search`, `limit`.
- `POST /api/v1/exercises`: creates a private organization exercise. Body: `name`, `category`, optional `equipment`, `primaryMuscles`, optional `secondaryMuscles`, `difficulty`, optional media object keys, defaults, and execution cues.
- `GET /api/v1/exercises/{exercise_id}`: returns a global or organization-owned exercise.
- `PATCH /api/v1/exercises/{exercise_id}`: updates private organization-owned exercises only; global exercises are read-only to tenant users.
- `POST /api/v1/exercises/media-upload-url`: creates a short-lived signed R2 `PUT` URL for exercise image/video uploads. Body: `mediaType` (`video` or `image`), `filename`, `contentType`, `byteSize`, optional `checksumSha256`. Returns `objectKey`, `uploadUrl`, `expiresAt`, `method`, required headers, max bytes, and media type. Object keys are generated as `organizations/{organization_id}/training/exercises/{media_type}/{uuid}.{extension}`.
- `GET /api/v1/training-program-templates`: returns organization-owned templates. Query: `status`, `limit`.
- `POST /api/v1/training-program-templates`: creates a template with validated JSON days/exercises. Body includes `name`, optional `description`, optional `goal`, `durationWeeks`, `status`, and `template.days[].exercises[]` entries with `exerciseId`, `exerciseName`, `sets`, `reps`, optional `restSeconds`, optional `rpe`, optional `rir`, optional `section` (`warmUp`, `workout`, `coolDown`), optional `tempo`, optional `cues`, and optional `notes`.
- `DELETE /api/v1/training-program-templates/{template_id}`: soft-deletes an organization-owned template and writes an audit event.
- `GET /api/v1/training-program-assignments`: returns organization-scoped assignments. Query: `clientId`, `limit`.
- `POST /api/v1/training-program-assignments`: assigns a template to a scoped client and writes immutable `snapshot_json`. Body: `clientId`, `templateId`, optional `name`, `startsOn`, optional `endsOn`.
- `GET /api/v1/clients/{client_id}/training-programs`: returns training assignments for one organization-scoped client.

### Nutrition
- `GET /api/v1/foods`: returns global library foods and active-organization private foods. Query: `scope`, `category`, `search`, `limit`.
- `POST /api/v1/foods`: creates a private organization food. Body: `name`, `category`, `servingSize`, `calories`, `proteinGrams`, `carbsGrams`, `fatGrams`, optional `fiberGrams`, and optional metadata.
- `GET /api/v1/foods/{food_id}`: returns a global or organization-owned food.
- `PATCH /api/v1/foods/{food_id}`: updates an organization-owned private food. Global foods and other-tenant foods are not mutable by tenant users.
- `GET /api/v1/meal-plan-templates`: returns organization-owned meal templates. Query: `status`, `limit`.
- `POST /api/v1/meal-plan-templates`: creates a template with validated `name`, optional `phase`, macro targets, `status`, and structured days/meals/foods `template` JSON. Meal rows may include optional `notes`.
- `PATCH /api/v1/meal-plan-templates/{template_id}`: updates an existing organization-owned meal template in place. Body: any explicit subset of `name`, optional `phase`, macro targets, `status`, and structured `template` JSON. Meal rows may include optional `notes`. Food rows in `template.days[].meals[].foods[]` may include `foodId`, `foodName`, `servingSize`, calories/macros, optional `fiberGrams`, optional `quantity`, optional `measurementUnit`, and optional `micronutrients`.
- `DELETE /api/v1/meal-plan-templates/{template_id}`: soft-deletes an organization-owned meal template by setting `deletedAt`; deleted meal plans/templates are excluded from subsequent list results.
- `GET /api/v1/meal-plan-assignments`: returns organization-scoped meal assignments with client names. Query: `clientId`, `limit`.
- `POST /api/v1/meal-plan-assignments`: assigns an organization-owned template to a scoped client and writes immutable `snapshot_json` from the current template.
- `GET /api/v1/clients/{client_id}/meal-plans`: returns meal plan assignments for one organization-scoped client.

### Supplementation
- `GET /api/v1/supplements`: lists global and active-organization private supplements. Query: optional `scope`, optional `category`, optional `search`, optional `limit`.
- `POST /api/v1/supplements`: creates an active-organization private supplement. Body: `name`, `category`, optional `recommendedTiming`, optional `dosage`, optional `bioavailabilityNotes`, optional `clinicalDescription`, optional `tags`, optional `imageObjectId`.
- `GET /api/v1/supplements/{supplement_id}/coach-details`: returns the active organization's supplement-specific coach overlay for dosage instructions, coach notes, and affiliate/product link. Global and active-organization private supplements are readable.
- `PATCH /api/v1/supplements/{supplement_id}/coach-details`: upserts the active organization's supplement-specific coach overlay. Body: optional `coachDosageInstructions`, optional `coachNotes`, optional `affiliateLink`.
- `GET /api/v1/supplement-plan-templates`: lists active-organization supplement templates. Query: optional `status`, optional `limit`.
- `POST /api/v1/supplement-plan-templates`: creates a template with validated `name`, optional `description`, `status`, and structured phase/supplement `template` JSON.
- `GET /api/v1/supplement-plan-assignments`: returns organization-scoped supplement assignments with client names. Query: optional `clientId`, optional `limit`.
- `POST /api/v1/supplement-plan-assignments`: assigns an organization-owned template to a scoped client and writes immutable `snapshot_json` from the current template.

### Education
- `GET /api/v1/education-resources`: lists active-organization education resources. Query: optional `category`, optional `resourceType`, optional `search`, optional `limit`.
- `POST /api/v1/education-resources`: creates an active-organization education resource. Body: `title`, optional `description`, `category`, `resourceType`, optional `objectId`, optional `externalUrl`, optional `tags`, optional `visibility`.
- `POST /api/v1/education-resources/upload-url`: creates an R2 presigned PUT URL for an education resource upload. Body: `filename`, `contentType`, `byteSize`, optional `checksumSha256`. Returns `objectId`, `objectKey`, `uploadUrl`, `expiresAt`, `method`, `requiredHeaders`, `maxBytes`, and inferred `resourceType`.
- `GET /api/v1/education-resources/{resource_id}`: returns one active-organization education resource.
- `PATCH /api/v1/education-resources/{resource_id}`: updates one active-organization education resource.
- `POST /api/v1/education-resources/{resource_id}/assignments`: assigns one active-organization education resource to an active-organization client. Body: `clientId`.

### Messaging
- `GET /api/v1/conversations`: returns tenant-scoped conversations with client names and latest message summaries. Query: `clientId`, `limit`.
- `POST /api/v1/conversations`: creates a conversation for an organization-scoped client. Body: `clientId`, optional `title`.
- `GET /api/v1/conversations/{conversation_id}/messages`: returns tenant-scoped messages. Query: `limit`.
- `POST /api/v1/conversations/{conversation_id}/messages`: creates a coach-authored message. Body: `body`, optional `attachmentObjectIds`. Attachment object ids must be generated by the message attachment upload endpoint for the active organization.
- `POST /api/v1/messages/{message_id}/read`: marks a tenant-scoped message read for the current user.
- `POST /api/v1/messages/attachment-upload-url`: creates a short-lived signed R2 `PUT` URL for message attachments. Body: `filename`, `contentType`, `byteSize`, optional `checksumSha256`. Returns `objectKey`, `uploadUrl`, `expiresAt`, `method`, required headers, and max bytes. Object keys are generated as `organizations/{organization_id}/messages/attachments/{uuid}.{extension}`.

### Tasks
- `GET /api/v1/tasks`: returns organization-scoped tasks ordered by status, due date, priority, then newest created. Query: `category`, `status`, `priority`, `dueFrom`, `dueTo`, `assignedUserId`, `clientId`, `limit`.
- `POST /api/v1/tasks`: creates a task. Body: `title`, optional `description`, `category`, optional `priority`, optional `dueAt`, optional `assignedUserId`, optional `clientId`.
- `PATCH /api/v1/tasks/{task_id}`: updates mutable task fields and status for an organization-scoped task.
- `POST /api/v1/tasks/{task_id}/complete`: marks an organization-scoped task completed.

Task categories: `current-client-care`, `new-client-onboarding`, `social-media`, `business-operations`.

### Dashboard CRM
- `GET /api/v1/dashboard/crm-summary`: returns role-gated CRM dashboard metrics for the active organization. Requires `clients:read`. Response includes `newLeadsLastFiveDays`, `totalLeadsAndCustomers`, `stageBreakdown` with stage id/label/count for every CRM stage, and `updatedAt`.
- `GET /api/v1/dashboard/metadata`: returns role-gated dashboard metadata for the active organization. Requires `tasks:read`. Response includes the organization `timezone` used for dashboard-local date rendering.

### Notifications
- `GET /api/v1/notifications`: returns current-user tenant-scoped notifications. Query: `unreadOnly`, `limit`.
- `POST /api/v1/notifications/{notification_id}/read`: marks one current-user tenant-scoped notification read.
- `POST /api/v1/notifications/read`: marks all current-user unread notifications read.

### Social
- `GET /api/v1/social/connections`: lists active-organization social connections. Requires `social:read`. Response never includes encrypted access or refresh tokens.
- `DELETE /api/v1/social/connections/{connection_id}`: locally revokes a social connection, sets `revokedAt`, and audits the action. Requires `social:manage`.
- `GET /api/v1/social/connections/oauth/start`: creates a hashed OAuth state and redirects to the selected provider. Query: `provider` (`instagram`, `facebook`, `x`), optional safe relative `redirectTo`. Requires `social:manage`.
- `GET /api/v1/social/connections/oauth/callback`: consumes a valid OAuth state, exchanges the code, encrypts provider tokens, upserts the connection, and redirects to the stored safe path.
- `GET /api/v1/social/posts`: lists organization-scoped social posts with target summaries. Query: optional `status`, optional `limit`.
- `POST /api/v1/social/posts`: creates a draft or scheduled social post. Body: `caption`, optional ISO `scheduledFor`, `targetConnectionIds`, optional `media` array with `url`, `mimeType`, and `sizeBytes`. Requires `social:manage`.
- `POST /api/v1/social/posts/{post_id}/cancel`: cancels a non-published post and any pending targets. Requires `social:manage`.
- `POST /api/v1/social/jobs/process`: processes due scheduled, queued, and retrying social targets. Body: optional `limit`. Provider responses are sanitized before persistence.
- `POST /api/v1/social/analytics/ingest`: creates tenant-scoped analytics snapshots for active connections. Body: optional `connectionIds`, optional `postIds`, optional ISO `capturedAt`. In simulated mode the snapshot records safe placeholder metrics.

Social provider identifiers:
- `instagram`
- `facebook`
- `x`

Social post statuses:
- `draft`
- `scheduled`
- `queued`
- `publishing`
- `published`
- `failed`
- `cancelled`

### Calendar Connections
- `GET /api/v1/calendar/connections`: lists active-organization calendar connections. Query: `scope` (`organization` or `coach`, default `coach`). Coach scope returns the current coach's connections; organization scope is owner/admin only. Requires `calendar:read`. Response never includes encrypted access or refresh tokens.
- `POST /api/v1/calendar/connections`: creates or refreshes an Apple Calendar CalDAV setup record. Body: `scope` (`organization` or `coach`, default `coach`). Organization scope is owner/admin only. Requires `calendar:manage`.
- `POST /api/v1/calendar/connections/apple`: alias for Apple Calendar setup.
- `GET /api/v1/calendar/connections/oauth/start`: creates a hashed OAuth state and redirects to Google or Outlook. Query: `provider` (`google` or `outlook`), `scope` (`organization` or `coach`), optional safe relative `redirectTo`. Requires `calendar:manage`.
- `GET /api/v1/calendar/connections/oauth/callback`: consumes a valid OAuth state, exchanges the code, encrypts provider tokens, upserts the calendar connection, audits the action, and redirects to the stored safe path.

Calendar provider identifiers:
- `apple`
- `google`
- `outlook`

Calendar connection scopes:
- `organization`
- `coach`

### Files
- `POST /api/v1/files/upload-url`: create signed R2 upload URL.
- `POST /api/v1/files/{object_id}/download-url`: create signed R2 download URL.
- `GET /api/v1/files/{object_id}`: object metadata.

### Packages And Payments
- `GET /api/v1/packages`: lists active-organization packages. Query: optional `status`, optional `limit`.
- `POST /api/v1/packages`: creates an active-organization package. Body: `name`, optional `description`, `priceAmount`, optional `currency`, `billingInterval`, optional `features`, optional `color`. Client-supplied Stripe product/price ids are rejected.
- `PATCH /api/v1/packages/{package_id}`: updates an active-organization package. Body: any explicit subset of `name`, `description`, `priceAmount`, `currency`, `billingInterval`, `features`, `color`, and `status`. Client-supplied Stripe product/price ids are rejected.
- `POST /api/v1/packages/{package_id}/stripe-sync`: creates or reuses trusted server-side Stripe product/price ids for an active-organization package. Requires `payments:manage`, `STRIPE_SECRET_KEY`, and active-organization Stripe Connect setup.
- `POST /api/v1/stripe/connect/account-link`: creates or reuses the active organization's Stripe connected account and returns a server-generated Account Link. Body: optional `returnUrl`, optional `refreshUrl`; values may be absolute URLs or safe relative paths that the server resolves against the request origin. Requires `payments:manage` and `STRIPE_SECRET_KEY`.
- `GET /api/v1/stripe/connect/onboarding/start`: creates or reuses the active organization's Stripe connected account and redirects directly to Stripe Express onboarding. Query: optional `returnUrl`, optional `refreshUrl`; values may be absolute URLs or safe relative paths that the server resolves against the request origin. Stripe/API errors redirect back to `/organization-settings?stripe_error=...`. Requires `payments:manage` and `STRIPE_SECRET_KEY`.
- `POST /api/v1/stripe/connect/dashboard-link`: creates an on-demand Stripe Express Dashboard login link for the active organization's connected account. Requires `payments:manage`, `STRIPE_SECRET_KEY`, and a stored connected account id. Login links are returned only to authenticated users and are not persisted.
- `GET /api/v1/client-subscriptions`: lists active-organization client subscriptions. Query: optional `clientId`, optional `status`, optional `limit`.
- `POST /api/v1/client-subscriptions`: creates a Stripe Checkout subscription session for an active-organization client and synced monthly package. Body: `clientId`, `packageId`, optional `successUrl`, optional `cancelUrl`. Local status starts as `incomplete`; final subscription/payment status is webhook-driven.
- `GET /api/v1/dashboard/financial-reporting`: returns Stripe-backed dashboard revenue for the active organization. Query: `period` (`weekly`, `monthly`, `quarterly`, `yearly`, `custom`; default `monthly`), plus required `startDate` and `endDate` (`YYYY-MM-DD`) when `period=custom`. The report includes `amount` in minor units, `currency`, `label`, `change`, `source: "stripe"`, `stripeSubscriptionCount`, range dates, and chart `bars`. Requires `payments:read`; only subscriptions with trusted Stripe subscription ids and billable Stripe-derived statuses are counted.

### Audit
- `GET /api/v1/audit-logs`: returns organization-scoped, newest-first audit records with sanitized metadata. Query: optional `action`, optional `targetType`, optional `targetId`, optional opaque `cursor`, optional `limit` (max 100). Pagination headers: `X-Has-More`, `X-Next-Cursor`.

Owner/admin-only by default.

### Request Protection And Traceability
- API responses include `X-Request-Id`; a valid inbound id is preserved and otherwise a UUID is generated.
- Auth mutations: 10 requests per minute per hashed IP/path identity.
- External APIs: 60 requests per minute per hashed IP/path identity.
- Internal mutations and provider webhooks: 120 requests per minute per hashed IP/path identity.
- `429` responses use the standard error envelope and include `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

## External Analysis APIs
External APIs are intended for analytics and external data science systems. They are de-identified by default.

### Authentication
Use header:
```http
Authorization: Bearer cc_live_xxxxxxxxx
```

API keys:
- Are scoped to one organization.
- Are stored hashed.
- Include prefix for identification.
- Have scopes.
- Can expire.
- Can be revoked.
- Can optionally restrict IPs.
- Are audited on use.

### Required Scopes
- `external:metrics:read`: read extracted metric data.
- `external:submissions:read`: read de-identified submission metadata and answers allowed by export policy.
- `external:clients:read`: read de-identified client records.
- `external:client_pii:read`: elevated PII access.
- `external:webhooks:manage`: manage webhook endpoints.
- `external:exports:read`: bulk export access.

### De-Identification Rules
Default external responses must not include:
- Name.
- Email.
- Phone.
- Address/location below broad region unless explicitly allowed.
- Photos.
- Free-text notes.
- Message bodies.
- Raw health/injury/medical notes.

Default client identifier:
- Stable `external_client_id`, generated per organization and not equal to internal database id.

PII fields are only returned when:
- API key has `external:client_pii:read`.
- Endpoint supports `include_pii=true`.
- Request is audited.

### Endpoints
#### `GET /api/v1/external/clients`
Returns de-identified clients.

Filters:
- `status`
- `updated_since`
- `cursor`
- `limit`
- `include_pii` requires PII scope.

Response: `{ data, meta }`, where default records include `externalClientId`, broad status, package/check-in metadata, dates, compliance, and timestamps. `firstName`, `lastName`, `email`, and `phone` are returned only when `include_pii=true` and the key has `external:client_pii:read`.

#### `GET /api/v1/external/clients/{external_client_id}/metrics`
Returns typed metrics for one client.

Filters:
- `metric_key`
- `from`
- `to`
- `source_type`
- `cursor`
- `limit`

Response: `{ data, meta }` with typed metric records: `externalClientId`, `sourceType`, `sourceId`, `measuredAt`, `metricKey`, `metricValue`, `unit`, non-PII metadata, and `createdAt`.

#### `GET /api/v1/external/metrics`
Returns organization-wide typed metrics.

Filters:
- `metric_key`
- `from`
- `to`
- `client_external_ids`
- `cursor`
- `limit`

Response: `{ data, meta }` with organization-wide typed metric records. Internal client IDs are never returned.

#### `GET /api/v1/external/form-submissions`
Returns de-identified form/check-in submissions.

Filters:
- `form_id`
- `submitted_since`
- `status`
- `cursor`
- `limit`

Response: `{ data, meta }` with submission metadata and `answers` limited to fields whose immutable form schema marks them as `metadata` or `metric`.

#### `GET /api/v1/external/check-ins`
Returns typed check-in records and review status.

Filters:
- `status`
- `submitted_since`
- `reviewed_since`
- `cursor`
- `limit`

Response: `{ data, meta }` with typed check-in metadata and review status. Raw summary, coach notes, health notes, and submission free text are not returned.

#### `POST /api/v1/external/exports`
Creates an asynchronous export job for larger data pulls.

Request:
```json
{
  "type": "metrics",
  "format": "jsonl",
  "filters": {
    "from": "2026-01-01T00:00:00Z",
    "to": "2026-04-27T00:00:00Z"
  }
}
```

Response:
```json
{
  "data": {
    "exportId": "exp_123",
    "type": "metrics",
    "format": "jsonl",
    "status": "queued",
    "filters": {
      "from": "2026-01-01T00:00:00Z",
      "to": "2026-04-27T00:00:00Z"
    },
    "createdAt": "2026-05-14T00:00:00.000Z",
    "updatedAt": "2026-05-14T00:00:00.000Z",
    "completedAt": null
  }
}
```

#### `GET /api/v1/external/exports/{export_id}`
Returns export status and a short-lived signed download URL when ready.

Completed exports return `downloadUrl`; internal object storage keys are never returned.

### External Webhooks
#### `GET /api/v1/external/webhook-endpoints`
List configured endpoints.

Filters:
- `status`
- `limit`

Response records include `id`, `url`, `description`, `eventTypes`, `status`, `createdAt`, and `updatedAt`. Signing secrets and secret hashes are never returned.

#### `POST /api/v1/external/webhook-endpoints`
Create endpoint.

Request:
```json
{
  "url": "https://analysis.example.com/webhooks/complete-coach",
  "description": "Analysis event receiver",
  "eventTypes": ["external_export.created", "metric.extracted"]
}
```

Response includes `signingSecret` once at creation. The secret is stored only as a hash and is not retrievable later.

#### `PATCH /api/v1/external/webhook-endpoints/{endpoint_id}`
Update endpoint.

Mutable fields: `url`, `description`, `eventTypes`.

#### `DELETE /api/v1/external/webhook-endpoints/{endpoint_id}`
Disable endpoint without deleting delivery history.

Supported event types:
- `external_export.created`

Delivery:
- Signed with per-endpoint secret.
- Ticket 013F persists retry-ready delivery records with `status`, `attempt_count`, `next_retry_at`, and `last_error`.
- Outbound HTTP delivery and exponential backoff worker execution are deferred until background workers are introduced.

Signature headers:
```http
X-Complete-Coach-Event: metric.extracted
X-Complete-Coach-Delivery: whd_123
X-Complete-Coach-Timestamp: 1777248000
X-Complete-Coach-Signature: v1=...
```

## Provider Webhooks
### Stripe
Endpoint: `POST /api/webhooks/stripe`

Requirements:
- Verify Stripe signature.
- Persist normalized event payload with redaction policy for sensitive payment fields.
- Idempotently process by `stripe_event_id`.
- Apply trusted state transitions for Checkout session completion, subscription status changes, and Stripe Connect account updates.
- Return a successful duplicate response without reapplying transitions when `stripe_event_id` already exists.
- Emit internal Inngest event for slow downstream work when background workers are introduced.

### Resend
Endpoint: `POST /api/webhooks/resend`

Requirements:
- Verify signature if configured.
- Persist delivery/bounce/complaint events.
- Update notification/email delivery status.
- Verified organisation sender domains are created through Resend Domains. DNS records returned by Resend are stored on organisation sender-domain records and displayed in Organisation Settings.

### Inngest
Endpoint: `/api/inngest` or provider-required route.

Requirements:
- Keep function payload schemas versioned.
- Log run ids and failures.
