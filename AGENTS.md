# AGENTS.md

All automated agents working in this repository must:

- stay within task scope
- update docs when interfaces change
- add tests for new behavior
- avoid speculative architecture changes without ADR updates
- validate security assumptions before merging sensitive changes
- keep implementation and documentation aligned in the same change
- maintain clean import boundaries — shared code belongs in shared packages, not duplicated across apps or services
- use AI-assisted development workflows documented in `.agents/` profiles and `.codex/` rules

## Agent Profiles

Refer to `.agents/profiles/` for role-specific guidance on architecture, coding, review, security, and testing work.

## Skills

Refer to `.agents/skills/` for domain-specific patterns covering API design, backend, database migrations, deployment, e2e testing, frontend, golang, Python, security, and TDD workflows.

## Lifecycle Policy

Respect the lifecycle policy defined in `.agents/lifecycle-policy.toml` for how agents should behave across session boundaries, context management, and task handoffs.

## Coding Standards

Follow the rules in `.codex/rules/` for language-specific standards (TypeScript, Go, Python) and cross-cutting concerns (security, performance, testing, patterns).

## Working Rules

1. Keep boundaries clean. Shared code belongs in shared packages.
2. Keep API contracts current when handlers change.
3. Keep migrations and schema docs current when persistence changes.
4. Maintain at least 80% test coverage for all test suites.
5. Do not leave placeholder routes, docs, or stubs once real product behavior exists.
6. Use PostgreSQL as the durable source of truth unless otherwise specified.
7. Treat docs, schemas, and contracts as first-class deliverables alongside code.
