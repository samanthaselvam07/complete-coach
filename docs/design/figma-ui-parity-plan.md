# Figma UI Parity Plan

Source: Figma Make file `g51indcBk3IOhM1jIrh4Pv`

This tracker keeps the Figma UI port aligned with the production Next.js app. The Figma Make file is the visual reference, but Complete Coach remains the source of truth for auth, routing, persistence, API contracts, and tests.

## Porting Rules

- Port screen surfaces into existing Next.js routes instead of merging the generated Figma app wholesale.
- Preserve current route structure, Auth.js session handling, Neon-backed API calls, and fixture fallbacks.
- Add or update tests for each production component that receives new visible behavior.
- Keep large screens split into smaller components before they cross the repo file-size gate.
- Update contracts/docs only when UI work changes public API behavior or persistence semantics.

## Shared Foundations

| Area | Production Location | Status | Notes |
| --- | --- | --- | --- |
| App shell, sidebar, top bar | `apps/web/components/app-shell/*` | Pending | Needs Figma screenshots/source comparison for spacing, active states, grouped nav, and search/actions. |
| Shared cards, buttons, tabs, badges | `apps/web/components/ui/*` and page-local classes | Pending | Prefer existing shadcn-style primitives; avoid importing generated UI files unless a primitive is missing. |
| Page section headers and metric cards | Page components | Pending | Standardize after first 2-3 screens are ported. |

## Screen Map

| Figma Screen | Production Route | Production Component | Status |
| --- | --- | --- | --- |
| `dashboard-page.tsx` | `/` | `apps/web/components/dashboard/dashboard-page.tsx` | Pending |
| `clients-page.tsx` | `/clients` | `apps/web/components/clients/clients-page.tsx` | Started |
| `client-profile.tsx` | `/clients/[id]` | `apps/web/components/clients/client-profile-page.tsx` | Started |
| `check-in-management-page.tsx` | `/clients/check-ins` | `apps/web/components/check-ins/check-in-management-page.tsx` | Pending |
| `messages-page.tsx` | `/messages` | `apps/web/components/messages/messages-page.tsx` | Pending |
| `training-page.tsx` | `/training` | `apps/web/components/training/training-page.tsx` | Pending |
| `training-programs-page.tsx` | `/training/programs` | `apps/web/components/training/training-programs-page.tsx` | Pending |
| `exercise-database-page.tsx` | `/training/exercises` | `apps/web/components/training/exercise-database-page.tsx` | Pending |
| `nutrition-page.tsx` | `/nutrition` | `apps/web/components/nutrition/nutrition-page.tsx` | Pending |
| `meal-plans-page.tsx` | `/nutrition/meal-plans` | `apps/web/components/nutrition/meal-plans-page.tsx` | Pending |
| `food-database-page.tsx` | `/nutrition/food-database` | `apps/web/components/nutrition/food-database-page.tsx` | Started |
| `education-page.tsx` | `/education` | `apps/web/components/education/education-page.tsx` | Started |
| `add-resource-page.tsx` | `/education/add` | `apps/web/components/education/add-resource-page.tsx` | Pending |
| `supplementation-page.tsx` | `/supplementation` | `apps/web/components/supplementation/supplementation-page.tsx` | Started |
| `supplement-plans-page.tsx` | `/supplementation/plans` | `apps/web/components/supplementation/supplement-plans-page.tsx` | Pending |
| `supplement-database-page.tsx` | `/supplementation/database` | `apps/web/components/supplementation/supplement-database-page.tsx` | Pending |
| `forms-page.tsx` | `/forms` | `apps/web/components/forms/forms-page.tsx` | Pending |
| `forms/form-management.tsx` | `/forms` | `apps/web/components/forms/form-management.tsx` | Pending |
| `forms/form-builder.tsx` | `/forms` | `apps/web/components/forms/form-builder.tsx` | Pending |
| `social-media-page.tsx` | `/social-media` | `apps/web/components/social/social-media-page.tsx` | Started |
| `create-post-page.tsx` | `/social-media/create` | `apps/web/components/social/create-post-page.tsx` | Pending |
| `team-management-page.tsx` | `/team-management` | `apps/web/components/team/team-management-page.tsx` | Started |
| `packages-page.tsx` | `/packages` | `apps/web/components/packages/packages-page.tsx` | Started |
| `create-package-page.tsx` | `/packages/create` | `apps/web/components/packages/create-package-page.tsx` | Pending |
| `coach-profile-page.tsx` | `/coach-profile` | `apps/web/components/coach/coach-profile-page.tsx` | Started |
| `scheduling-page.tsx` | `/schedule` | `apps/web/components/scheduling/scheduling-page.tsx` | Started |
| `settings-page.tsx` | `/settings` | `apps/web/components/settings/settings-page.tsx` | Started |

## Current Evidence

- The updated client profile dashboard screenshot has been partially ported to `/clients/[id]`.
- The Food Database screenshot has been partially ported to `/nutrition/food-database`, including source controls, search styling, promo card polish, and image-style ingredient cards.
- The supplied UI screenshot batch is now being ported in route-sized slices. The first slice covers `/education`, `/supplementation`, and `/clients` roster parity.
- The second screenshot slice covers `/social-media`, `/team-management`, and `/packages` visual parity while preserving the existing scheduling, invitation, and package persistence flows.
- The third screenshot slice covers `/schedule`, `/settings`, and `/coach-profile` as static parity surfaces pending persistence prioritization.
- Production deployment `26a3c28` contains the new client profile bundle strings.
- Direct Figma Make resource links are visible through the Figma connector, but file reads currently fail from the MCP resource reader. Screenshots or a local exported reference repo/zip will speed up exact parity checks.

## Recommended Port Order

1. App shell/sidebar/top bar.
2. Dashboard and client roster.
3. Client profile remaining tabs and check-in management.
4. Messages.
5. Training, nutrition, education, and supplementation.
6. Forms, packages, team, social, schedule, coach profile, settings.
