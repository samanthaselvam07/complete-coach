# Complete Coach Marketing Landing Redesign

This is a local rebuild workspace for the public marketing landing page. It does not replace the existing app or deployed marketing site yet.

## Local App

- App: `apps/marketing`
- Local dev command: `pnpm --filter @complete-coach/marketing dev`
- Local URL: `http://localhost:3010`
- Founder CTA contract: `Join Founder Program` links to `/founder-program`
- Current direction: Complete Coach brand-led SaaS page using the live-site purple/off-white/orange palette, a laptop hero with the real app dashboard screenshot, and scroll-reveal/sticky sections.
- Added local routes: `/platform`, `/resources`, `/resources/[slug]`, `/pricing`, and `/roadmap`, with `/features` kept as a compatibility route to the platform page.
- Latest direction: remodel inspired by 1FIT's SaaS content rhythm while keeping Complete Coach distinct: AI-assisted coaching, business operating system, client delivery, education resources and founder access.
- Scroll behavior: reveal sections use IntersectionObserver plus per-element depth transforms for stronger movement as users move down the page.

## Tooling Downloaded

- `vendor/design-agent-tools/magic-mcp`
- `vendor/design-agent-tools/anthropics-skills`
- `vendor/design-agent-tools/vercel-agent-skills`
- `vendor/design-agent-tools/shadcn-mcp.html`

Installed Codex skills:

- `frontend-design`
- `web-design-guidelines`
- `composition-patterns`
- `react-view-transitions`
- `react-best-practices`

Restart Codex to pick up newly installed skills in future sessions.

## Notes

Magic MCP requires a 21st.dev API key before it can be enabled as an MCP server. shadcn MCP can be configured with `npx shadcn@latest mcp` in an MCP client config.
