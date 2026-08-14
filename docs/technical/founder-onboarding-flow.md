# Founder Onboarding Flow

The founder onboarding flow is shown when a coach signs in for the first time and their active organization has `founder_onboarding_required = true` without a `founder_onboarding_completed_at` timestamp.

New self-serve coach sign-ups set `founder_onboarding_required = true` when creating the organization. Existing organizations keep the default `false` value so the migration does not interrupt current workspaces. Admin-created design-partner organizations should set the same flag when they need the first-login wizard.

The app shell redirects authenticated owners/admins with incomplete founder onboarding to `/onboarding` before rendering the normal dashboard chrome. Once `/api/v1/onboarding/founder` completes successfully, the organization stores:

- coaching focus
- current roster size
- current client platform
- optional free-text platform when `Other` is selected
- completion timestamp

Completion is idempotent. If the timestamp already exists, the endpoint returns the stored onboarding state and does not send another email or create another audit event.

The completion email is sent via Resend from `FOUNDER_ONBOARDING_FROM_EMAIL` when configured, otherwise `Sammi Szalinski <info@completecoach.fit>`. The internal Sammi notification email is sent only when `FOUNDER_ONBOARDING_NOTIFY_EMAIL` is configured.
