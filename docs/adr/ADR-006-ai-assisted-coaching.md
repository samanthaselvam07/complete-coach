# ADR-006 - AI-Assisted Coaching

## Status
Accepted for M12.

## Context
M12 adds user-facing AI support for coaching workflows. The source workflow for this phase is the `kahunas-complete-coach` skill from `https://github.com/MikeS071/kahunas-fitness-skills/tree/main/kahunas-complete-coach`, which combines Kahunas check-in extraction with a Clean Health Fitness Institute 17-step weekly review process.

The external skill established several product requirements:
- Full weekly reviews need complete check-in Q&A, not only summary metrics.
- The preferred report is a concise five-section review: Weight / Waist, Training & Progression, Fatigue / Recovery, Nutrition, and Goals for Next Week.
- Injury, stress, fatigue, nutrition compliance, mobility, measurement, and plateau flags must be prioritized.
- Client-impacting recommendations must remain human-reviewed before they are sent or applied.
- Secrets, contact details, raw medical notes, and provider payloads must not be written to unsafe logs.

## Decision
Complete Coach stores AI work as durable, auditable records:
- `ai_prompt_versions` tracks workflow, provider, model, prompt text, output schema, and active version.
- `ai_generations` tracks each run, target record, redacted/minimized input, output metadata, status, usage, and estimated cost.
- `ai_outputs` stores generated summaries, risk flags, suggestions, drafts, resource recommendations, and extraction enhancements in approval states.

The first M12 provider is a deterministic `complete-coach/heuristic-v1` engine implementing CHFI-style rules. It is intentionally conservative and avoids external model calls until provider credentials, budgets, and live approval policy are explicitly configured.

## Safety Rules
- Use minimized check-in inputs. Do not include direct email, phone, raw medical notes, or emergency-contact data in AI input.
- All generated outputs default to `pending-approval`.
- Coach/admin/owner approval is required before client-impacting recommendations are considered usable.
- Audit logs capture metadata only: workflow, prompt version, generation id, counts, target ids, and status changes.
- API responses never expose raw redacted input or raw provider output JSON.
- Usage reports aggregate token and cost estimates per organization.

## Consequences
- The app can support check-in summaries, risk flags, workout/nutrition suggestions, message drafts, resource recommendations, and extraction enhancement outputs with one approval model.
- Future external LLM providers can be added behind the same generation/output tables.
- Human approval is part of the data model, not just UI behavior.
- The copyrighted source PDFs remain outside this repository; distilled review rules are encoded as product logic and tests.
