# Data Model Specification

## Principles
- PostgreSQL is the durable source of truth.
- Every tenant-owned table includes `organization_id`.
- Use `timestamptz` for timestamps.
- Use `numeric` for money and measurement values where precision matters.
- Prefer `bigint` or UUIDv7-compatible IDs consistently after final Prisma decision.
- Add indexes for foreign keys and common filters.
- Use soft delete where history/audit matters.
- Snapshot assigned content so historical client records do not change when library/templates change.
- Store flexible form definitions and submissions as versioned JSON while extracting key metrics into typed tables.

## Core Identity And Tenancy
### `organizations`
Purpose: coaching business/workspace.

Fields:
- `id`
- `name`
- `slug`
- `status`
- `timezone`
- `stripe_connect_account_id`
- `stripe_connect_status`
- `created_at`
- `updated_at`
- `deleted_at`

Indexes:
- Unique `slug`.
- `status`.

### `users`
Purpose: authenticated platform user mirrored from NextAuth identity.

Fields:
- `id`
- `email`
- `name`
- `image_url`
- `auth_provider`
- `auth_provider_account_id`
- `created_at`
- `updated_at`

Indexes:
- Unique `email`.
- Unique provider/account pair.

### `organization_memberships`
Purpose: user role in an organization.

Fields:
- `id`
- `organization_id`
- `user_id`
- `role`
- `status`
- `invited_by_user_id`
- `joined_at`
- `created_at`
- `updated_at`

Indexes:
- Unique `organization_id,user_id`.
- `organization_id,role`.
- `user_id,status`.

### `team_invitations`
Purpose: one-time organization invitation lifecycle before membership activation.

Fields:
- `id`
- `organization_id`
- `email`
- `role`
- `status` pending/accepted/revoked/expired.
- `token_hash`
- `invited_by_user_id`
- `expires_at`
- `accepted_at`
- `created_at`
- `updated_at`

Security:
- Store only the SHA-256 token hash.
- Invitations expire after seven days.
- Acceptance requires an authenticated user with the exact invited email.

Indexes:
- Unique `token_hash`.
- `organization_id,status,created_at`.
- `organization_id,email,status`.
- `expires_at`.

## Clients
### `clients`
Purpose: organization-owned coaching client.

Fields:
- `id`
- `organization_id`
- `client_user_id` nullable for portal login.
- `first_name`
- `last_name`
- `email`
- `phone`
- `status`
- `package_id`
- `primary_coach_user_id`
- `check_in_day`
- `timezone`
- `start_date`
- `archived_at`
- `created_at`
- `updated_at`
- `deleted_at`

Indexes:
- `organization_id,status`.
- `organization_id,primary_coach_user_id`.
- `organization_id,check_in_day`.
- Unique `organization_id,email` when email present and not deleted.

### `client_profiles`
Purpose: sensitive profile and coaching metadata.

Fields:
- `id`
- `organization_id`
- `client_id`
- `date_of_birth`
- `sex`
- `goals`
- `injuries`
- `medical_notes`
- `bio`
- `emergency_contact`
- `created_at`
- `updated_at`

Security:
- Treat as sensitive health/PII data.
- Do not include by default in external exports.

### `client_measurements`
Purpose: typed metrics extracted from check-ins or entered directly.

Fields:
- `id`
- `organization_id`
- `client_id`
- `source_type`
- `source_id`
- `measured_at`
- `metric_key`
- `metric_value`
- `unit`
- `metadata`
- `created_at`

Indexes:
- `organization_id,client_id,metric_key,measured_at`.
- `organization_id,source_type,source_id`.

## AI-Assisted Coaching
### `ai_prompt_versions`
Purpose: immutable prompt/model registry for AI workflows.

Fields:
- `id`
- `organization_id` nullable for platform defaults.
- `workflow` check-in review, message draft, resource recommendation, or extraction enhancement.
- `version`
- `name`
- `provider`
- `model`
- `system_prompt`
- `user_prompt_template`
- `output_schema`
- `is_active`
- `created_by_user_id`
- `created_at`

Indexes:
- Unique `organization_id,workflow,version`.
- `organization_id,workflow,is_active`.
- `created_by_user_id`.

### `ai_methodology_profiles`
Purpose: organization-scoped coach methodology profiles used to tailor AI-assisted check-in reviews to a coach's principles, tone, section emphasis, red-flag rules, and adjustment rules without allowing unsafe free-form prompt control.

Fields:
- `id`
- `organization_id`
- `name`
- `methodology`
- `description`
- `tone`
- `principles_json`
- `check_in_sections_json`
- `red_flag_rules_json`
- `adjustment_rules_json`
- `forbidden_recommendations_json`
- `is_default`
- `is_active`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

Rules:
- Profiles are organization-scoped.
- At most one active profile should be treated as the default by application code; setting a default unsets previous defaults for the organization.
- Forbidden recommendations guide generation constraints but should not be echoed back into generated output text or audit metadata.

Indexes:
- `organization_id,is_active,is_default`.
- `organization_id,name`.
- `created_by_user_id`.

### `ai_generations`
Purpose: durable audit/cost record for each AI run.

Fields:
- `id`
- `organization_id`
- `workflow`
- `status`
- `prompt_version_id`
- `methodology_profile_id`
- `provider`
- `model`
- `client_id`
- `target_type`
- `target_id`
- `input_hash`
- `input_summary`
- `redacted_input`
- `output_json`
- `error_message`
- `input_tokens`
- `output_tokens`
- `estimated_cost_cents`
- `requested_by_user_id`
- `created_at`
- `updated_at`

Security:
- Store minimized/redacted input only.
- Do not expose `redacted_input` or raw `output_json` in app API responses.

Indexes:
- `organization_id,workflow,created_at`.
- `organization_id,client_id,created_at`.
- `organization_id,target_type,target_id`.
- `prompt_version_id`.
- `methodology_profile_id`.
- `requested_by_user_id`.

### `ai_outputs`
Purpose: generated summaries, risk flags, suggestions, drafts, resource recommendations, and extraction enhancements awaiting human approval.

Fields:
- `id`
- `organization_id`
- `generation_id`
- `client_id`
- `target_type`
- `target_id`
- `type`
- `status`
- `severity`
- `title`
- `content_markdown`
- `data_json`
- `requires_approval`
- `approved_by_user_id`
- `approved_at`
- `rejected_by_user_id`
- `rejected_at`
- `rejection_reason`
- `created_at`
- `updated_at`

Rules:
- Client-impacting outputs default to `pending-approval`.
- Approval/rejection writes audit events.
- Rejection audit metadata records reason length, not the raw reason text.

Indexes:
- `organization_id,status,created_at`.
- `organization_id,client_id,status`.
- `organization_id,target_type,target_id`.
- `generation_id`.
- `approved_by_user_id`.
- `rejected_by_user_id`.

## CRM
### `leads`
Fields:
- `id`
- `organization_id`
- `name`
- `email`
- `phone`
- `source`
- `status`
- `stage`
- `location`
- `notes`
- `last_contact_at`
- `days_in_stage`
- `assigned_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

Indexes:
- `organization_id,stage`.
- `organization_id,status`.
- `organization_id,assigned_user_id`.
- `organization_id,email`.

### `lead_activities`
Fields:
- `id`
- `organization_id`
- `lead_id`
- `actor_user_id`
- `type`
- `body`
- `occurred_at`
- `created_at`

## Forms And Check-Ins
### `forms`
Purpose: form definition container.

Fields:
- `id`
- `organization_id`
- `name`
- `description`
- `type`
- `status`
- `current_version_id`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

Indexes:
- `organization_id,status`.
- `organization_id,type`.

### `form_versions`
Purpose: immutable versioned schema.

Fields:
- `id`
- `organization_id`
- `form_id`
- `version_number`
- `schema_json`
- `ui_json`
- `published_at`
- `created_by_user_id`
- `created_at`

Indexes:
- Unique `form_id,version_number`.
- `organization_id,form_id`.

### `form_assignments`
Purpose: assign forms/check-ins to clients.

Fields:
- `id`
- `organization_id`
- `form_id`
- `form_version_id`
- `client_id`
- `status`
- `due_at`
- `completed_at`
- `created_by_user_id`
- `created_at`
- `updated_at`

Indexes:
- `organization_id,client_id,status,due_at`.
- `organization_id,form_id,status`.

### `form_submissions`
Purpose: raw submission payload.

Fields:
- `id`
- `organization_id`
- `form_id`
- `form_version_id`
- `assignment_id`
- `client_id`
- `submitted_by_user_id`
- `answers_json`
- `status`
- `submitted_at`
- `reviewed_at`
- `reviewed_by_user_id`
- `created_at`
- `updated_at`

Indexes:
- `organization_id,client_id,submitted_at`.
- `organization_id,status,submitted_at`.
- `organization_id,form_id,submitted_at`.

### `check_ins`
Purpose: typed review queue item that may originate from a form submission.

Fields:
- `id`
- `organization_id`
- `client_id`
- `form_submission_id`
- `type`
- `status`
- `due_at`
- `submitted_at`
- `reviewed_at`
- `reviewed_by_user_id`
- `summary`
- `coach_notes`
- `created_at`
- `updated_at`

Indexes:
- `organization_id,status,due_at`.
- `organization_id,client_id,submitted_at`.

## Training
### `exercise_library_items`
Fields:
- `id`
- `organization_id` nullable for global records.
- `scope` global/private.
- `name`
- `category`
- `equipment`
- `primary_muscles`
- `secondary_muscles`
- `difficulty`
- `video_object_id`
- `image_object_id`
- `default_sets`
- `default_reps`
- `default_rest_seconds`
- `default_rpe`
- `execution_cues`
- `created_at`
- `updated_at`
- `deleted_at`

Indexes:
- `scope`.
- `organization_id,name`.
- GIN index for muscles/tags if JSONB arrays are used.

### `training_program_templates`
Fields:
- `id`
- `organization_id`
- `name`
- `description`
- `goal`
- `duration_weeks`
- `status`
- `template_json`
- `created_by_user_id`
- `created_at`
- `updated_at`

### `training_program_assignments`
Fields:
- `id`
- `organization_id`
- `client_id`
- `template_id`
- `name`
- `status`
- `starts_on`
- `ends_on`
- `snapshot_json`
- `created_by_user_id`
- `created_at`
- `updated_at`

Snapshot stores template identity, duration, exercises, sets, reps, RPE, RIR, section, tempo, rest, cues, and notes at assignment time so access expiry and renewal tasks can be driven from `ends_on`.

## Nutrition
### `food_library_items`
Fields:
- `id`
- `organization_id` nullable for global records.
- `scope`
- `name`
- `category`
- `serving_size`
- `calories`
- `protein_g`
- `carbs_g`
- `fat_g`
- `fiber_g`
- `metadata`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

Indexes:
- `scope`.
- `organization_id,name`.
- `organization_id,category`.

### `meal_plan_templates`
Fields:
- `id`
- `organization_id`
- `name`
- `phase`
- `target_calories`
- `protein_g`
- `carbs_g`
- `fat_g`
- `status`
- `template_json`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

`template_json` stores structured days, meals, and food rows. Food rows preserve database linkage and builder state with `foodId`, `foodName`, `servingSize`, calories/macros, optional `fiberGrams`, optional `quantity`, optional `measurementUnit`, and optional `micronutrients` so edited plans and imported meal templates can hydrate individual ingredients instead of summary rows.

### `meal_plan_assignments`
Fields:
- `id`
- `organization_id`
- `client_id`
- `template_id`
- `name`
- `phase`
- `target_calories`
- `protein_g`
- `carbs_g`
- `fat_g`
- `status`
- `snapshot_json`
- `starts_on`
- `ends_on`
- `created_by_user_id`
- `created_at`
- `updated_at`

Snapshot stores template identity, template name, phase, macro targets, and the structured day/meal/food plan at assignment time.

## Supplementation
### `supplement_library_items`
Fields:
- `id`
- `organization_id` nullable for global records.
- `scope`
- `name`
- `category`
- `recommended_timing`
- `dosage`
- `bioavailability_notes`
- `clinical_description`
- `tags`
- `image_object_id`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

### `supplement_coach_details`
Purpose: organization-scoped overlay for coach-controlled supplement instructions and commercial links. This keeps imported/global supplement facts separate from each organization's editable dosage guidance, notes, and affiliate/product links.

Fields:
- `id`
- `organization_id`
- `supplement_id`
- `coach_dosage_instructions`
- `coach_notes`
- `affiliate_link`
- `created_by_user_id`
- `updated_by_user_id`
- `created_at`
- `updated_at`

Constraints:
- Unique `(organization_id, supplement_id)` so each organization has one editable overlay per supplement.
- Cascades when the organization or supplement is deleted.

### `supplement_plan_templates`
Fields:
- `id`
- `organization_id`
- `name`
- `description`
- `status`
- `template_json`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

### `supplement_plan_assignments`
Fields:
- `id`
- `organization_id`
- `client_id`
- `template_id`
- `name`
- `status`
- `snapshot_json`
- `starts_on`
- `ends_on`
- `created_by_user_id`
- `created_at`
- `updated_at`

## Education
### `education_resources`
Fields:
- `id`
- `organization_id`
- `title`
- `description`
- `category`
- `resource_type`
- `object_id`
- `external_url`
- `tags`
- `visibility`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

### `education_resource_assignments`
Fields:
- `id`
- `organization_id`
- `resource_id`
- `client_id`
- `assigned_by_user_id`
- `status`
- `assigned_at`
- `completed_at`
- `created_at`
- `updated_at`

## Messaging And Notifications
### `conversations`
Fields:
- `id`
- `organization_id`
- `client_id`
- `title`
- `created_at`
- `updated_at`

### `messages`
Fields:
- `id`
- `organization_id`
- `conversation_id`
- `sender_user_id`
- `sender_client_id`
- `body`
- `created_at`
- `edited_at`
- `deleted_at`

### `message_attachments`
Fields:
- `id`
- `organization_id`
- `message_id`
- `object_id`
- `created_at`

### `message_receipts`
Fields:
- `id`
- `organization_id`
- `message_id`
- `user_id`
- `client_id`
- `read_at`

### `notifications`
Fields:
- `id`
- `organization_id`
- `recipient_user_id`
- `recipient_client_id`
- `type`
- `title`
- `body`
- `entity_type`
- `entity_id`
- `read_at`
- `created_at`

### `email_deliveries`
Fields:
- `id`
- `organization_id`
- `notification_id`
- `provider`
- `provider_email_id`
- `to_email`
- `subject`
- `status`
- `event_type`
- `error_message`
- `metadata`
- `created_at`
- `updated_at`

### `organization_sender_domains`
Fields:
- `id`
- `organization_id`
- `domain`
- `provider`
- `provider_domain_id`
- `status`
- `from_local_part`
- `sender_name`
- `records_json`
- `verified_at`
- `created_by_user_id`
- `created_at`
- `updated_at`

Notes:
- Unique `(organization_id, domain)`.
- Stores Resend-returned DNS records for owner-managed sender verification.
- Transactional email uses the newest verified sender domain; otherwise it falls back to `RESEND_FROM_EMAIL`.

## Tasks And Dashboard
### `tasks`
Fields:
- `id`
- `organization_id`
- `title`
- `description`
- `category`
- `priority`
- `status`
- `due_at`
- `assigned_user_id`
- `client_id`
- `created_by_user_id`
- `created_at`
- `updated_at`

Allowed `category` values:
- `current-client-care`
- `new-client-onboarding`
- `social-media`
- `business-operations`

Indexes:
- `organization_id,status,due_at`.
- `organization_id,assigned_user_id,status`.

## Payments
### `packages`
Fields:
- `id`
- `organization_id`
- `name`
- `description`
- `price_amount`
- `currency`
- `billing_interval`
- `stripe_product_id`
- `stripe_price_id`
- `status`
- `features_json`
- `color`
- `created_by_user_id`
- `deleted_at`
- `created_at`
- `updated_at`

### `client_subscriptions`
Fields:
- `id`
- `organization_id`
- `client_id`
- `package_id`
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_checkout_session_id`
- `status`
- `current_period_start`
- `current_period_end`
- `cancel_at`
- `created_at`
- `updated_at`

### `payment_events`
Fields:
- `id`
- `organization_id`
- `stripe_event_id`
- `type`
- `payload_json`
- `processed_at`
- `processing_status`
- `created_at`

## Files
### `objects`
Fields:
- `id`
- `organization_id`
- `bucket`
- `object_key`
- `filename`
- `content_type`
- `byte_size`
- `checksum_sha256`
- `classification`
- `scan_status`
- `uploaded_by_user_id`
- `uploaded_by_client_id`
- `created_at`
- `deleted_at`

Indexes:
- `organization_id,classification`.
- `checksum_sha256`.

## Social
### `social_connections`
Purpose: tenant-owned OAuth connection to a provider account.

Fields:
- `id`
- `organization_id`
- `provider`
- `provider_account_id`
- `account_name`
- `scopes`
- `status`
- `encrypted_access_token`
- `encrypted_refresh_token`
- `token_expires_at`
- `connected_at`
- `revoked_at`
- `last_error`
- `created_by_user_id`
- `created_at`
- `updated_at`

Security:
- Access and refresh tokens are encrypted at rest.
- API serializers must never return encrypted token fields.

Indexes:
- Unique `organization_id,provider,provider_account_id`.
- `organization_id,status`.
- `organization_id,provider`.

### `social_oauth_states`
Purpose: short-lived OAuth CSRF and PKCE state storage.

Fields:
- `id`
- `organization_id`
- `provider`
- `state_hash`
- `code_verifier`
- `redirect_to`
- `expires_at`
- `consumed_at`
- `created_by_user_id`
- `created_at`

Indexes:
- Unique `state_hash`.
- `organization_id,provider,expires_at`.

## Calendar Connections
### `calendar_connections`
Purpose: tenant-owned Apple, Google, or Outlook calendar connection for shared organisation calendars or individual coach calendars.

Fields:
- `id`
- `organization_id`
- `provider`
- `scope`
- `provider_account_id`
- `account_name`
- `calendar_name`
- `scopes`
- `status`
- `encrypted_access_token`
- `encrypted_refresh_token`
- `token_expires_at`
- `connected_at`
- `revoked_at`
- `last_error`
- `created_by_user_id`
- `created_at`
- `updated_at`

Security:
- Google and Outlook access and refresh tokens are encrypted at rest.
- Apple Calendar setup is tracked as pending CalDAV configuration and does not require OAuth token fields.
- API serializers must never return encrypted token fields.

Indexes:
- Unique `organization_id,scope,provider,provider_account_id,created_by_user_id`.
- `organization_id,scope,status`.
- `created_by_user_id`.

### `calendar_oauth_states`
Purpose: short-lived OAuth CSRF state storage for Google and Outlook calendar connection flows.

Fields:
- `id`
- `organization_id`
- `created_by_user_id`
- `provider`
- `scope`
- `state_hash`
- `code_verifier`
- `redirect_to`
- `expires_at`
- `consumed_at`
- `created_at`

Indexes:
- Unique `state_hash`.
- `organization_id,scope,provider,created_at`.
- `expires_at`.

### `social_posts`
Purpose: scheduled or draft content created by a coach.

Fields:
- `id`
- `organization_id`
- `caption`
- `media`
- `status`
- `scheduled_for`
- `published_at`
- `cancelled_at`
- `created_by_user_id`
- `created_at`
- `updated_at`

Indexes:
- `organization_id,status,scheduled_for`.
- `organization_id,created_at`.

### `social_post_targets`
Purpose: provider-specific delivery state for a social post.

Fields:
- `id`
- `organization_id`
- `post_id`
- `connection_id`
- `provider`
- `status`
- `attempts`
- `provider_post_id`
- `last_error`
- `next_attempt_at`
- `published_at`
- `created_at`
- `updated_at`

Indexes:
- Unique `post_id,connection_id`.
- `organization_id,status,next_attempt_at`.
- `organization_id,provider,status`.

### `social_post_attempts`
Purpose: immutable provider delivery attempt log.

Fields:
- `id`
- `organization_id`
- `target_id`
- `status`
- `provider_status`
- `provider_response`
- `error_code`
- `error_message`
- `retry_at`
- `created_at`

Indexes:
- `organization_id,target_id,created_at`.
- `organization_id,status,created_at`.

### `social_analytics_snapshots`
Purpose: point-in-time provider analytics metrics where provider APIs allow access.

Fields:
- `id`
- `organization_id`
- `connection_id`
- `provider`
- `provider_post_id`
- `metrics`
- `captured_at`
- `created_at`

Indexes:
- `organization_id,connection_id,captured_at`.
- `organization_id,provider,captured_at`.

## External API And Audit
### `api_keys`
Fields:
- `id`
- `organization_id`
- `name`
- `key_prefix`
- `key_hash`
- `scopes`
- `ip_allowlist`
- `expires_at`
- `last_used_at`
- `revoked_at`
- `created_by_user_id`
- `created_at`

### `external_webhook_endpoints`
Fields:
- `id`
- `organization_id`
- `url`
- `description`
- `event_types`
- `signing_secret_hash`
- `status`
- `created_at`
- `updated_at`

### `external_webhook_deliveries`
Fields:
- `id`
- `organization_id`
- `endpoint_id`
- `event_type`
- `payload_json`
- `status`
- `attempt_count`
- `next_retry_at`
- `last_error`
- `created_at`
- `updated_at`

### `audit_logs`
Fields:
- `id`
- `organization_id`
- `actor_user_id`
- `actor_client_id`
- `actor_api_key_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata_json`
- `ip_address`
- `user_agent`
- `created_at`

Indexes:
- `organization_id,created_at`.
- `organization_id,entity_type,entity_id`.
- `organization_id,actor_user_id,created_at`.

### `rate_limit_buckets`
Purpose: durable fixed-window counters shared across Vercel instances.

Fields:
- `key_hash`
- `scope`
- `count`
- `window_start`
- `expires_at`
- `updated_at`

Security:
- Identity values such as IP address and route are SHA-256 hashed before storage.

Indexes:
- `expires_at` for periodic cleanup.
