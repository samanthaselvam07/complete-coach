Build a new project at the destination provided by the harness tooling. The project uses this repository's AI dev harness as its foundation.

## What This Harness Provides

- `.agents/` — AI agent profiles (architect, code-agent, reviewer, etc.) and skills
- `.codex/` — coding rules for TypeScript, Go, Python, and cross-cutting concerns
- `.githooks/` — pre-commit validation hooks
- `.github/workflows/` — CI pipeline
- `.github/ISSUE_TEMPLATES/` — PR, bug, feature, question templates
- `docs/templates/` — ADR, milestone, service-spec, review-gate, api-endpoint templates
- `scripts/` — bootstrap and repository automation helpers

## Source Of Truth

Treat these as the operating kit for any project built on this harness:
- `README.md`
- `AGENTS.md`
- `docs/templates/adr-template.md`
- `docs/templates/milestone-template.md`
- `docs/templates/review-gate-template.md`
- `docs/templates/service-spec-template.md`
- `docs/templates/api-endpoint-template.md`

## Repository Structure

Apply the standard structure from the harness to the new project:
- `apps/` — application entrypoints (web, api, cli, workers, etc.)
- `services/` — separately deployable services
- `pkg/` — shared packages consumed by apps and services
- `integrations/` — external platform adapters
- `migrations/` — versioned database migrations
- `deploy/` — deployment assets and configs
- `docs/` — specs, contracts, ADRs, and operational guidance
- `scripts/` — bootstrap, migration, coverage, and automation helpers

## Working Rules

1. Keep boundaries clean. Shared code belongs in `pkg/` or `integrations/`, never imported sideways across `apps/` or `services/`.
2. Keep API contracts (OpenAPI/Postman) current when handlers change.
3. Keep migrations and schema docs current when persistence changes.
4. Maintain at least 80% coverage for all test suites.
5. Treat docs, schemas, and contracts as first-class deliverables.
6. Use PostgreSQL as the durable source of truth unless explicitly replaced.
7. Replace scaffold auth with production auth (OAuth/OIDC) before launch.
8. Do not leave placeholder routes, docs, or stubs once real behavior exists.

## Default Build Commands

Establish project-specific commands in the generated `Makefile`. Typical patterns:
- `make bootstrap` — install dependencies and hooks
- `make test` — run all tests
- `make coverage` — run tests with coverage gate
- `make migrate-up` / `make migrate-down` — database migrations
- `make <app>-run` — run a specific app locally

## Phased Delivery

Use `docs/templates/milestone-template.md` for milestone planning. Typical phases:

### M0 — Repo activation
Confirm docs, CI, GitHub settings, and local bootstrap all work.

### M1 — Foundation
Lock repo structure, config, migration tooling, auth scaffold, and base docs.

### M2 — Product core
Implement the first real domain workflow; replace placeholder stubs.

### M3 — Quality and operations
Tighten coverage, observability, deployment, security, and release readiness.

## First Output

When starting a new project, generate or confirm:
- top-level repo tree
- environment and config assumptions
- migration plan
- API contract summary
- milestone TODO map

Then implement milestone work with tests and doc updates in the same change.
