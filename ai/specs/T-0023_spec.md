---
type: spec
task_id: T-0023
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0023 Spec

## Task metadata
- **task_id:** T-0023
- **title:** Document `game.html` as a compatibility redirect entry point in architecture docs
- **lane_type:** docs-lane
- **executor:** claude

## Problem statement
The current repo includes both:
- `index.html` as the main Pixel Runner entry page, and
- `game.html` as a redirect page that forwards requests to `./index.html`.

Based on the provided code context, `game.html` appears to exist as a compatibility entry point for older or alternate URLs. However, the architecture/source-of-truth docs referenced by repository policy were not included in the supplied materials, so this behavior is visible in code but not confirmed in documentation here.

This creates a documentation gap: architecture docs may not explain that `game.html` is not a separate app surface, but a compatibility redirect layer preserving legacy or alternate entry URLs.

## Source of truth
Per `AGENTS.md`, the primary sources of truth should be consulted in this order:
- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/`

In the supplied task context, those docs were not provided, so they remain the primary truth but are currently unavailable for confirmation in this spec.

Observed code evidence:
- `index.html` contains the actual game shell, HUD, overlay UI, and script loading.
- `game.html` contains:
  - a meta refresh to `./index.html`
  - a script redirect using `window.location.replace('./index.html')`
  - fallback body text linking to `./index.html`

Because docs were not provided, there is **uncertainty** whether architecture documentation already mentions this behavior or whether code has advanced ahead of docs.

## Desired behavior
Architecture documentation should explicitly state that:
- `index.html` is the primary browser entry point for the game experience.
- `game.html` exists as a compatibility redirect entry point.
- `game.html` should be understood as a routing/URL compatibility layer, not an independent runtime surface.
- Requests arriving via `/game.html` and, where applicable per current redirect script intent, `/game` are redirected to `index.html`.

The documentation update should remain descriptive and minimal, reflecting current observed behavior without adding new routing guarantees beyond what is already documented or implemented.

## Constraints
- Only documentation should be changed.
- Do not implement or modify redirect behavior in code as part of this task.
- Do not invent historical rationale, user-facing guarantees, or deployment rules unless they already exist in docs.
- If `docs/ARCHITECTURE.md` or related ADRs already describe entry points differently, that conflict must be called out explicitly rather than silently reconciled.
- If code and docs disagree, the executor should document the conflict in `ai/current-state/drift-register.md` per `AGENTS.md`.
- The spec should assume minimal safe change: likely a targeted architecture-doc clarification rather than broad documentation restructuring.

## Acceptance criteria
- Architecture documentation identifies `index.html` as the main application entry point.
- Architecture documentation identifies `game.html` as a compatibility redirect entry point.
- Documentation makes clear that `game.html` redirects to `index.html` rather than hosting separate gameplay logic.
- Wording is consistent with currently observed code behavior in `game.html`.
- No undocumented business rationale is introduced.
- If the existing architecture docs already contain conflicting statements, the conflict is explicitly noted and handled according to repo drift rules.

## Risks
- The architecture docs may already define entry points differently; without the actual docs in the provided context, this cannot be verified here.
- The redirect script in `game.html` references both `/game.html` and `/game`, but actual deployed routing support for `/game` may depend on hosting configuration not shown in the provided materials.
- Overstating the purpose of `game.html` as a long-term supported compatibility contract would be speculative unless current docs already say so.

## Open questions
- What do `docs/ARCHITECTURE.md` and any related ADRs currently say about browser entry points?
- Is `/game` officially supported in deployment environments, or is that only an implementation hint in the redirect script?
- Should this compatibility redirect also be mentioned in any deployment or routing documentation beyond architecture docs?
- If architecture docs are missing or outdated relative to code, should this task also record the discrepancy in `ai/current-state/drift-register.md`?

## Related Documents
- [[ai/reviews/T-0023_gemini_review.md|T-0023 review]]
- [[ai/briefs/T-0023_implementation.md|T-0023 document]]
- [[ai/results/T-0023_executor_report.md|T-0023 result]]
- [[ai/followups/T-0023_followups.md|T-0023 followup]]
- [[ai/pr/T-0023_pr_draft.md|T-0023 pr-draft]]
