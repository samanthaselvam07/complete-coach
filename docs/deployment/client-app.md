# Client App Deployment

## Worktree

The client-facing Complete Coach app is developed from this worktree:

- Path: `/Users/samanthaszalinski/projects/complete-coach-client-app`
- Branch: `feat/client-app`
- Base: `samantha/main`

This worktree is reserved for the experience clients see when using Complete Coach, separate from the coach-facing workspace on `app.completecoach.fit`.

## Production Origin

The production client app origin is:

```text
https://client.completecoach.fit
```

Set `NEXTAUTH_URL` to this exact origin in the Vercel project that deploys the client app:

```text
NEXTAUTH_URL=https://client.completecoach.fit
```

## Vercel Setup

Use `apps/web` as the Vercel project root unless the client app is later split into a separate package.

The Vercel project should use:

- Framework: Next.js
- Install command: `cd ../.. && pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `.next`
- Production domain: `client.completecoach.fit`

Add `client.completecoach.fit` as the production domain in Vercel and follow the DNS records Vercel generates for the domain. Do not reuse the `app.completecoach.fit` project domain for the client app.

## Environment

Keep production secrets in Vercel only. At minimum, configure:

- `AUTH_SECRET`
- `DATABASE_URL`
- `DIRECT_URL` when available
- `NEXTAUTH_URL=https://client.completecoach.fit`

Add feature-specific secrets only when the client app uses those live integrations.

## Client Workout Surface

The client workout tab is served from:

```text
/workout
```

It reads the signed-in client's linked organization and client profile from:

```text
GET /api/v1/client/me
```

The response includes the client's assigned training program snapshots. The workout tab renders the `snapshot.days` array as the training-day tabs and only displays exercises from the selected assigned day.
