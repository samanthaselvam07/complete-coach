# App Shell Technical Reference

## Purpose
Ticket 003 adds the reusable dashboard shell and navigation foundation that later page-port tickets will render inside.

## Scope
Included:
- Fixed sidebar navigation with primary and nested links.
- Nested groups for training, nutrition, supplementation, and clients, collapsed by default.
- Nested group parent links navigate to their summary pages and expand their submenu.
- Nested groups can also expand or collapse from the chevron toggle.
- Active route state via `aria-current`.
- Top search control.
- Notification dropdown backed by `GET /api/v1/notifications?limit=20` with mark-all-read behavior and an empty state when the API is unavailable.
- Settings/user menu placeholder.
- Root layout wrapping application pages in the shell.

Excluded:
- Full dashboard content.
- Real notification persistence.
- Authenticated user data.
- Responsive mobile drawer behavior.

## Key Files
- `apps/web/components/app-shell/dashboard-shell.tsx`
- `apps/web/components/app-shell/sidebar-nav.tsx`
- `apps/web/components/app-shell/top-search.tsx`
- `apps/web/components/app-shell/notification-menu.tsx`
- `apps/web/components/app-shell/user-menu.tsx`
- `apps/web/components/app-shell/navigation.ts`
- `apps/web/components/app-shell/notifications.ts`

## Tests
`apps/web/tests/app-shell.test.tsx` verifies:
- Primary and nested navigation links render.
- Active route state is applied to parent and child links.
- Nested sidebar groups are collapsed by default and expand from the parent link or chevron.
- Top search has an accessible searchbox.
- Notification unread count updates after marking all as read.
