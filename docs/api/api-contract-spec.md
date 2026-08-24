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
- `GET /api/v1/organizations/current/automations`: returns the active organisation email automation settings merged with Complete Coach defaults. Requires `team:manage`.
- `PUT /api/v1/organizations/current/automations`: upserts the active organisation email automation settings. Body: `automations[]` with trigger `id`, `enabled`, `subject`, `template`, `delay`, and `interval`. Requires `team:manage`.
- `GET|POST /api/v1/organizations/current/automations/jobs/process`: generates scheduled automation jobs and processes due queued jobs. Vercel Cron calls this with `Authorization: Bearer $AUTOMATION_JOBS_SECRET` or `$CRON_SECRET` to process all organisations. Authenticated `team:manage` users process only their active organisation. Optional POST body: `limit`, `enqueueScheduled`.

### Founder Onboarding
- `GET /api/v1/onboarding/founder`: returns the active organization's first-login founder onboarding state and the current user's first name. Requires `team:manage`.
- `POST /api/v1/onboarding/founder`: completes the first-login founder onboarding wizard for the active organization. Body: `focus` (`General fitness`, `Fat loss`, `Muscle building`, `Sports performance`, `Health and lifestyle`, `Other`), `rosterSize` (`1 to 5`, `6 to 15`, `16 to 30`, `31 to 50`, `50 plus`), `platform` (`Trainerize`, `Everfit`, `TrueCoach`, `Kahunas`, `1Fit`, `Google Sheets or spreadsheet`, `My own system`, `Other`, `Just getting started (no existing clients)`), and required `otherPlatform` when `platform` is `Other`. Persists completion on the organization, writes `founder_onboarding.completed`, and sends the personalized Sammi completion email once. Requires `team:manage`.

### Team
- `GET /api/v1/team-members`: returns organization-scoped memberships with `activeClientCount`, `capacityLimit`, `capacityPercent`, and pending invitations. Requires `team:read`.
- `POST /api/v1/team-members/invitations`: creates a seven-day invitation for `admin`, `coach`, or `assistant`, stores only a SHA-256 token hash, queues a Resend email, and audits the action. Requires `team:manage`. Production responses do not return the raw token.
- `POST /api/v1/team-invitations/accept`: accepts a pending invitation for the authenticated user's matching email, activates the membership atomically, consumes the invitation, and audits acceptance. Body: `token`.
- `PATCH /api/v1/team-members/{membership_id}`: updates `role` and/or `status`. The last active owner cannot be demoted. Requires `team:manage`.
- `DELETE /api/v1/team-members/{membership_id}`: marks the membership removed. The last active owner cannot be removed. Requires `team:manage`.

### Clients
- `GET /api/v1/client/me`: client-facing endpoint for the authenticated `client` role. Returns the linked client profile, active organization summary, assigned training program snapshots, and assigned meal plan snapshots for the `Client.clientUserId` attached to the signed-in user. This endpoint must only return data for the signed-in client's own organization-scoped `Client` record.
- `GET /api/v1/client/profile`: client-facing endpoint for the authenticated `client` role. Returns the signed-in client's editable account profile, linked client details, profile photo URL, and privacy policy URL. Reads are scoped to the signed-in user's linked organization/client record.
- `PATCH /api/v1/client/profile`: updates the signed-in client's first name, last name, email, phone, optional password, and optional profile photo data URL. Body fields: `firstName`, `lastName`, `email`, `phone`, `password`, `photoDataUrl`. Passwords are hashed server-side and duplicate account emails return `409 email_already_exists`.
- `DELETE /api/v1/client/profile`: deactivates the signed-in client's portal account after typed confirmation. Body: `confirmation` must equal `DELETE`. The route soft-deletes/deactivates the client record, unlinks the portal user, revokes sessions/provider accounts, disables credential login, and writes an audit event while preserving coaching history.
- `GET /api/v1/client/daily-check-in`: client-facing endpoint for the authenticated `client` role. Returns the signed-in client's current assigned daily form, preferring a published `habit-tracker` assignment before a `check-in` assignment. The response includes the immutable assigned form version schema.
- `POST /api/v1/client/daily-check-in`: submits answers for the signed-in client's current assigned daily form. Body: `answers`. Habit tracker assignments are reusable and remain assigned after submission; check-in assignments keep the normal one-off assignment completion and check-in creation behavior. Metric fields are extracted into client measurements.
- `GET /api/v1/client/hydration`: client-facing endpoint for the authenticated `client` role. Query: optional `date` (`YYYY-MM-DD`, defaults to today). Returns the signed-in client's daily water intake total from `client_measurements` with metric key `water_intake`.
- `POST /api/v1/client/hydration`: adds water to the signed-in client's daily hydration total. Body: optional `date` (`YYYY-MM-DD`) and `amountMl` (0-10000). The route upserts the `client_measurements` record using `sourceType=client_hydration`, `sourceId=hydration:{date}`, unit `ml`, and writes an audit event.
- `GET /api/v1/client/workout-notes`: client-facing endpoint for the authenticated `client` role. Query: `assignmentName`, `dayName`, optional `limit`. Returns the signed-in client's notes for that assigned workout/day.
- `POST /api/v1/client/workout-notes`: creates a client-authored workout note as an organization-scoped `ClientNote` so it is visible in the coach-facing client profile notes. Body: `assignmentName`, `dayName`, optional `exerciseName`, and `body`.
- `GET /api/v1/client/workout-sessions`: client-facing endpoint for the authenticated `client` role. Query: optional `assignmentName`, `dayName`, and `limit`. Returns the signed-in client's completed workout sessions, including logged sets and personal best metadata.
- `POST /api/v1/client/workout-sessions`: stores a completed client workout session for the signed-in client. Body: `assignmentId`, `assignmentName`, optional `dayId`, `dayName`, `startedAt`, `durationSeconds`, `exercises[]` with prescribed exercise metadata and logged sets, and optional `personalBests[]`. The route writes `client_workout_sessions`, marks the client activity log training domain as completed for the completion date, recalculates the client's seven-day compliance score, and writes an audit event.
- `GET /api/v1/clients`
- `POST /api/v1/clients`: creates an organization-scoped client. Body: `firstName`, `lastName`, optional `email`, `phone`, `status`, `packageId`, `packageName`, `checkInDay`, `timezone`, `startDate`, and optional `onboarding` setup metadata for the new-client intake flow (`dateOfBirth`, `paymentMode` as `offline` or `payment-link`, selected form ids, check-in frequency/days, weight unit, and default exercise unit). When `email` is present, the API creates a seven-day one-time client setup token and queues an onboarding email. When `onboarding.needsPayment=true` and `paymentMode=payment-link`, `email` and `packageId` are required, a connected-account Stripe Checkout subscription session is created for the selected synced recurring package, and the email links to Stripe before account setup.
- `GET /api/v1/clients/{client_id}`
- `PATCH /api/v1/clients/{client_id}`
- `POST /api/v1/clients/{client_id}/archive`
- `DELETE /api/v1/clients/{client_id}`: removes the client from roster views by setting `deletedAt`, archives the client status, deletes the attached `client_profiles` row, and writes an audit event. Requires `clients:write`.
- `POST /api/v1/clients/{client_id}/registration-email`: resends a seven-day one-time client setup email for an organization-scoped client with an email address. Existing setup tokens for the client are invalidated before the new SHA-256 token hash is stored. If the client requires online payment and has no active/trialing subscription, the email includes a fresh connected-account Stripe Checkout link before account setup. Requires `clients:write`.
- `POST /api/v1/clients/{client_id}/membership-pause`: schedules a client membership pause window. Body: `pauseStartDate` and `pauseResumeDate` as `YYYY-MM-DD`, with resume after start. When the pause starts immediately, the route pauses Stripe subscription collection for the connected-account subscription, stores the pause window on `client_subscriptions`, marks the subscription `paused`, deactivates the client account, and writes an audit event. Requires `payments:manage`.
- `GET /api/v1/clients/{client_id}/profile`
- `PATCH /api/v1/clients/{client_id}/profile`
- `GET /api/v1/clients/{client_id}/logs`: returns organization-scoped completed/missed logs for training, nutrition, and supplementation. Query: `days` (1-90, default 7) or `dateFrom` and `dateTo`. Response includes `logs` and `summary`.
- `POST /api/v1/clients/{client_id}/logs`: upserts one organization-scoped activity log by `domain`, `logDate`, and client. Query accepts `days` or `dateFrom` and `dateTo` for the returned compliance summary. Body: `domain` (`training`, `nutrition`, `supplementation`), `logDate`, `status` (`completed`, `missed`), optional `notes`. The route recalculates the selected compliance window and stores that score on the client record.
- `GET /api/v1/clients/{client_id}/workout-sessions`: coach-facing endpoint for completed workout history. Query: optional `assignmentName`, `dayName`, and `limit`. Requires `clients:read`, scopes reads to the active organization, and applies assigned-coach visibility rules for non-admin roles.
- `GET /api/v1/clients/{client_id}/goals`: returns organization-scoped client goals as countdown records. Query: `limit`.
- `POST /api/v1/clients/{client_id}/goals`: creates a client goal with `title`, `targetDate`, optional `notes`, and optional `roadmapPhaseId`. The route validates that the roadmap phase belongs to the same active-organization client, writes an account activity event, and returns countdown metadata.
- `GET /api/v1/clients/{client_id}/activity`: returns organization-scoped account activity events for the client. Query: `limit`.
- `POST /api/v1/clients/{client_id}/activity`: creates a client account activity event for profile-embedded plan edits. Body: `type`, `title`, optional `metadata`.
- `GET /api/v1/clients/{client_id}/metrics`
- `GET /api/v1/clients/{client_id}/timeline`
- `GET /api/v1/client-onboarding/{token}`: public setup-link endpoint. Returns invited client, organization, package, payment status, and whether password setup is currently allowed. Tokens are stored as SHA-256 hashes in `verification_tokens` and expire after seven days.
- `PATCH /api/v1/client-onboarding/{token}`: public setup-link completion endpoint. Body: `password`. Creates or updates the client login user, links it to the client profile, consumes the one-time token, and audits completion. If a client subscription exists and is not `active` or `trialing`, returns `402 payment_required`; Stripe webhooks remain the source of truth for payment status.

Query filters:
- `status`
- `primary_coach_user_id`
- `check_in_day`
- `search`
- `cursor`
- `limit`

Roster status display treats `new` clients as new for three days from creation; after that window, non-archived/non-deactivated `new` rows are returned/displayed as `active`.

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
- Form `type` values: `check-in`, `intake`, `application`, `contact`, `habit-tracker`, `terms-and-conditions`.
- Form responses include `shareSlug` and `shareUrlPath`; share URLs are organization-scoped platform links intended for coaches to copy from the form library.
- `GET /api/v1/forms/respond/{share_slug}`: public, unauthenticated endpoint that returns the latest saved form version for a share URL so recipients can fill out the form.
- `POST /api/v1/forms/respond/{share_slug}`: public, unauthenticated endpoint that accepts `answers` for the shared form. When a name or email can be extracted, the submission creates or updates an organization-scoped CRM lead and records a lead activity.
- `GET /api/v1/forms/{form_id}`: returns one active-organization form plus immutable versions.
- `PATCH /api/v1/forms/{form_id}`: updates mutable metadata only. Body: any explicit subset of `name`, `description`, `type`, `status`. Legacy `draft` status payloads are accepted but normalized to `published`.
- `POST /api/v1/forms/{form_id}/versions`: creates the next immutable published version, sets it as the current version, and keeps the parent form published. Body: validated `schema`, optional `ui`. Blank schemas may contain an empty `fields` array so coaches can save blank forms started from scratch.
- Form version field `type` values include `short-text`, `long-text`, `content-block`, `number`, `scale`, `multiple-choice`, `radio-buttons`, `dropdown`, `rating-10`, `checkbox`, `date`, `time`, `email`, `phone`, and `photo`.
- `POST /api/v1/forms/{form_id}/publish`: publishes a version and sets `current_version_id`. Body: `formVersionId`.
- `POST /api/v1/forms/{form_id}/assignments`: assigns a published version to a scoped client. Body: `clientId`, optional `formVersionId`, optional `dueAt`.
- `GET /api/v1/form-assignments`: returns active-organization form assignments including `formId`, `formName`, and `formType` for client editor reloads. Query: `clientId`, `status`, `limit`.
- `GET /api/v1/form-assignments/{assignment_id}`: returns one active-organization assignment with the immutable assigned form version.
- `POST /api/v1/form-assignments/{assignment_id}/submit`: submits answers for the assigned immutable version, creates a submission, creates a check-in where appropriate, extracts configured metrics, and creates or updates a CRM lead when the submitted form type is `application`. Body: `answers`.
- `GET /api/v1/form-submissions`: returns active-organization form submissions with persisted answers and immutable `formVersion.schema` for answer label rendering. Query: `clientId`, `formId`, `status`, `limit`.
- `GET /api/v1/form-submissions/{submission_id}`: returns one active-organization submission with persisted answers, form metadata, and immutable `formVersion.schema`.

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
- `GET /api/v1/ai/recommendations`: returns organization-scoped AI outputs. Query: optional `clientId`, `targetType`, `targetId`, `type`, `status`, `limit`. Requires `ai:read`. Responses include a safe `client` summary (`id`, `name`) when the AI output is linked to a client; raw client email/profile details and raw AI generation input/output remain excluded.
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

### Client Compliance Logs
- `client_activity_logs` stores one durable log per organization, client, domain, and date.
- Compliance score is calculated from completed logs divided by possible logs for the selected period. For the default seven-day view, `7 days * 3 domains = 21 possible logs`; `21/21` completed logs returns `100%`.
- Missed logs remain stored for visibility but do not count toward completed compliance.
- `client_account_activity_logs` stores client account history for plan changes and billing lifecycle events. Billing events are written from Stripe webhooks for started, paused, failed, and cancelled subscription status changes.
- `client_goals` stores countdown goals and optional links to `client_roadmap_phases`.

### Training
- `GET /api/v1/exercises`: returns global library exercises and active-organization private exercises. Query: `scope`, `category`, `search`, `limit`.
- `POST /api/v1/exercises`: creates a private organization exercise. Body: `name`, `category`, optional `equipment`, `primaryMuscles`, optional `secondaryMuscles`, `difficulty`, optional media object keys, optional `videoUrl`, defaults (`defaultSets`, free-text `defaultReps`, `defaultRestSeconds`, `defaultRpe`, `defaultRir`), and execution cues. The training program builder custom-exercise flow uses this endpoint before adding the row to a program, saving body part plus default sets, reps, rest seconds, RPE, RIR, and video/link metadata to the organization's exercise database.
- `GET /api/v1/exercises/{exercise_id}`: returns a global or organization-owned exercise.
- `PATCH /api/v1/exercises/{exercise_id}`: updates private organization-owned exercises only; global exercises are read-only to tenant users.
- `POST /api/v1/exercises/media-upload-url`: creates a short-lived signed R2 `PUT` URL for exercise image/video uploads. Body: `mediaType` (`video` or `image`), `filename`, `contentType`, `byteSize`, optional `checksumSha256`. Returns `objectKey`, `uploadUrl`, `expiresAt`, `method`, required headers, max bytes, and media type. Object keys are generated as `organizations/{organization_id}/training/exercises/{media_type}/{uuid}.{extension}`.
- `GET /api/v1/training-program-templates`: returns organization-owned templates. Query: `status`, `limit`.
- `POST /api/v1/training-program-templates`: creates a template with validated JSON days/exercises. Body includes `name`, optional `description`, optional `goal`, `durationWeeks`, `status`, and `template.days[].exercises[]` entries with `exerciseId`, `exerciseName`, `sets`, `reps`, optional `restSeconds`, optional `rpe`, optional `rir`, optional `section` (`warmUp`, `workout`, `coolDown`), optional `primaryMuscles` for anatomy heatmap volume tracking, optional `tempo`, optional `cues`, and optional `notes`. `template.instructions` may store builder-level workout instructions.
- `PATCH /api/v1/training-program-templates/{template_id}`: updates an existing organization-owned template in place. Body accepts any explicit subset of `name`, optional `description`, optional `goal`, `durationWeeks`, `status`, and structured `template` JSON.
- `DELETE /api/v1/training-program-templates/{template_id}`: soft-deletes an organization-owned template and writes an audit event.
- `GET /api/v1/training-program-assignments`: returns organization-scoped assignments. Query: `clientId`, `limit`.
- `POST /api/v1/training-program-assignments`: assigns a template to a scoped client and writes immutable `snapshot_json`. Body: `clientId`, `templateId`, optional `name`, `startsOn`, optional `endsOn`.
- `GET /api/v1/clients/{client_id}/training-programs`: returns training assignments for one organization-scoped client.

### Nutrition
- `GET /api/v1/foods`: returns global library foods and active-organization private foods. Query: `scope`, `source` (`AUS/NZ`, `EFSA`, `USDA`), `category`, `search`, `sort` (`name` or `recent`), `limit`. Source filtering uses imported food metadata such as FSANZ/AUSNUT, EFSA, and USDA source ids so large verified libraries remain searchable from plan builders. `sort=recent` is used by the meal-plan builder selector to show a short recent list while keeping full database search server-side.
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
- `GET /api/v1/supplement-plan-templates/{template_id}`: returns one active-organization supplement template for editing.
- `PATCH /api/v1/supplement-plan-templates/{template_id}`: updates an existing active-organization supplement template in place. Body accepts any explicit subset of `name`, optional `description`, `status`, and structured phase/supplement `template` JSON.
- `DELETE /api/v1/supplement-plan-templates/{template_id}`: soft-deletes an active-organization supplement template and writes an audit event.
- `GET /api/v1/supplement-plan-assignments`: returns organization-scoped supplement assignments with client names. Query: optional `clientId`, optional `limit`.
- `POST /api/v1/supplement-plan-assignments`: assigns an organization-owned template to a scoped client and writes immutable `snapshot_json` from the current template.
- `DELETE /api/v1/supplement-plan-assignments/{assignment_id}`: deletes an active-organization supplement assignment and writes an audit event.

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

### Global Search
- `GET /api/v1/search`: returns active-organization global search results for the app shell top search. Query: `query` (minimum two characters to search), optional `limit` (1-10, default 5). Response includes `results` with `type` (`task`, `client`, `lead`), `id`, `title`, `subtitle`, and `href`. Tasks are limited to open tasks. Clients exclude deleted and archived records, and non-admin roles only see their assigned clients. CRM leads exclude deleted records, and non-admin roles only see leads assigned to them.

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

### Coach Profile And Account Settings
- `GET /api/v1/coach-profile`: returns the signed-in coach's account/profile details for the active organization. Response includes name, email, professional title, phone, stored photo filename, bio, philosophy, speciality tags, and credential metadata. Password hashes are never returned.
- `PATCH /api/v1/coach-profile`: updates the signed-in coach's account/profile details for the active organization and writes `coach.profile_updated` audit metadata. Body accepts any explicit subset of `name`, `email`, `professionalTitle`, `phone`, `photoFileName`, `bio`, `philosophy`, `specialities`, `credentials`, and write-only `password`. Omitted profile fields preserve existing database values.

### Files
- `POST /api/v1/files/upload-url`: create signed R2 upload URL.
- `POST /api/v1/files/{object_id}/download-url`: create signed R2 download URL.
- `GET /api/v1/files/{object_id}`: object metadata.

### Packages And Payments
- `GET /api/v1/packages`: lists active-organization packages. Query: optional `status`, optional `limit`. Each package includes derived `activeSubscriptions`, `projectedMonthlyRevenue`, `customerLtv`, `ltvCustomerCount`, and periodized `customerMetrics` for monthly, quarterly, and annual views. Retention is calculated as `(endingCustomers - newCustomers) / customersAtStart`, churn is calculated from archived clients (`lostCustomers / customersAtStart`), and Customer LTV uses ARPU x gross margin percentage / churn rate.
- `POST /api/v1/packages`: creates an active-organization package. Body: `name`, optional `description`, `priceAmount`, optional `currency`, `billingInterval` (`weekly`, `fortnightly`, `monthly`, `annually`, `custom`, or legacy `one-time`), optional `customBillingIntervalCount`, optional `customBillingIntervalUnit`, optional `termWeeks`, optional scheduled price fields (`scheduledPriceAmount`, `scheduledPriceCurrency`, `scheduledPriceStartsAt`), optional `features`, and optional legacy `color`. Client-supplied Stripe product/price ids are rejected.
- `PATCH /api/v1/packages/{package_id}`: updates an active-organization package. Body: any explicit subset of `name`, `description`, `priceAmount`, `currency`, `billingInterval`, `customBillingIntervalCount`, `customBillingIntervalUnit`, `termWeeks`, scheduled price fields, `features`, legacy `color`, and `status`. Client-supplied Stripe product/price ids are rejected. Immediate price/currency/billing cadence changes clear the stored Stripe price id so a trusted Stripe sync creates a fresh Stripe Price.
- `POST /api/v1/packages/{package_id}/stripe-sync`: creates or reuses trusted server-side Stripe product/price ids for an active-organization package. Recurring package cadences map to Stripe recurring interval metadata, including fortnightly/custom interval counts. Requires `payments:manage`, `STRIPE_SECRET_KEY`, and active-organization Stripe Connect setup.
- `GET /api/v1/stripe/connect/status`: returns the active organization's Stripe Connect state as `connected` and `status`. When a connected account exists and Stripe is configured, the route refreshes account flags from Stripe and persists status changes. Requires `payments:read`.
- `POST /api/v1/stripe/connect/account-link`: creates or reuses the active organization's Standard Stripe connected account and returns a server-generated Account Link. Body: optional `returnUrl`, optional `refreshUrl`; values may be absolute URLs or safe relative paths that the server resolves against the request origin. Requires `payments:manage` and `STRIPE_SECRET_KEY`.
- `GET /api/v1/stripe/connect/onboarding/start`: creates or reuses the active organization's Standard Stripe connected account and redirects directly to Stripe onboarding. Query: optional `returnUrl`, optional `refreshUrl`; values may be absolute URLs or safe relative paths that the server resolves against the request origin. Stripe/API errors redirect back to `/organization-settings?stripe_error=...`. Requires `payments:manage` and `STRIPE_SECRET_KEY`.
- `POST /api/v1/stripe/connect/dashboard-link`: audits an authenticated dashboard-open request for the active organization's Standard connected account and returns the full Stripe Dashboard URL. Requires `payments:manage` and a stored connected account id.
- `GET /api/v1/platform-billing/status`: returns the active organization's id, Complete Coach platform subscription state, access rule result, current Design Partners/Core/Pro/Scale plan, current period end, and usage against team-seat/client limits. Requires `payments:read`. Access rules: `active` and `trialing` allow access; `not_started`, `incomplete`, `incomplete_expired`, `past_due`, `unpaid`, `paused`, and `canceled` block access. Team-seat usage counts active owner/admin/coach/assistant memberships. Client usage counts all non-deleted clients in the active organization. `plan.clientLimit` is `null` for unlimited-client plans.
- `POST /api/v1/platform-billing/checkout`: creates a Stripe Checkout subscription session on the Complete Coach Stripe account for `planId` (`design_partner`, `core`, `pro`, or `scale`). Body: `planId`, optional `successUrl`, optional `cancelUrl`; safe relative paths are resolved server-side. Requires `payments:manage` and `STRIPE_SECRET_KEY`.
- `POST /api/v1/platform-billing/portal`: creates a Stripe Billing Portal session for the active organization's platform customer. Body: optional `returnUrl`; safe relative paths are resolved server-side. Requires `payments:manage`, an existing platform customer id, and `STRIPE_SECRET_KEY`.
- `POST /api/v1/stripe/customer-portal`: explicit Stripe Customer Portal alias for the active organization's Complete Coach platform customer. Body and authorization match `POST /api/v1/platform-billing/portal`.
- `GET /api/v1/client-subscriptions`: lists active-organization client subscriptions. Query: optional `clientId`, optional `status`, optional `limit`.
- `POST /api/v1/client-subscriptions`: creates a Stripe Checkout subscription session for an active-organization client and synced recurring package. Body: `clientId`, `packageId`, optional `successUrl`, optional `cancelUrl`. Local status starts as `incomplete`; final subscription/payment status is webhook-driven.
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
