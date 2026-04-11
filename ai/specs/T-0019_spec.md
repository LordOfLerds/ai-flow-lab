---
type: spec
task_id: T-0019
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0019 Spec

## Task metadata
- task_id: T-0019
- title: Add browser smoke coverage for Start UI visibility across supported entry points
- lane_type: test-lane
- executor: claude

## Problem statement
The repository shows at least two browser entry points for the game experience:
- `index.html`, which contains the visible start overlay and menu container
- `game.html`, which redirects to `index.html`

The task asks for browser smoke coverage that verifies Start UI visibility across supported entry points. Based on the provided repo truth, there is currently no documented browser smoke test coverage described in the supplied files.

Because the source-of-truth docs referenced by `AGENTS.md` (`docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, and `docs/ADR/`) were not included in the task inputs, support expectations and test strategy details are partially undocumented from the material available here. The code suggests that `index.html` is the canonical interactive entry point and `game.html` is a compatibility redirect entry point, but this should be treated as code-derived and therefore somewhat uncertain until confirmed against docs.

## Source of truth
Primary truth available in this task:
- `index.html`
- `game.html`
- `AGENTS.md`
- `CLAUDE.md`

Observed code facts from available files:
- `index.html` renders:
  - `#overlay`
  - a visible title `🎮 PIXEL RUNNER`
  - subtitle/instructions
  - `#menu-content`
- `game.html` performs redirect behavior:
  - meta refresh to `./index.html`
  - script-based `window.location.replace('./index.html')` when path ends with `/game.html` or `/game`

Uncertainty to state explicitly:
- The project-level docs named in `AGENTS.md` were not provided, so supported entry points, required browser matrix, and approved smoke-test toolchain are not fully established from docs.
- If those docs define different entry points or different visibility requirements, those docs must override code-derived assumptions.
- If code behavior is ahead of docs, the implementation should document that uncertainty rather than silently deciding.

## Desired behavior
Add minimal browser smoke coverage that validates the Start UI is visible when the application is opened through each supported browser entry point confirmed by repo truth.

At minimum, based on currently provided files, the smoke coverage should verify:
1. Loading the canonical entry point (`index.html`) shows the Start UI.
2. Loading the redirect entry point (`game.html`) still results in the Start UI being visible after redirect resolution.

The smoke assertions should stay lightweight and focused on visibility of the initial Start UI rather than deeper gameplay behavior.

Because the exact Start UI contract is not documented in supplied docs, the safest code-backed interpretation is to assert visibility of stable, user-facing start screen elements already present in `index.html`, such as:
- the overlay container `#overlay`, and/or
- the visible game title text, and/or
- other clearly initial-menu content that is present before gameplay starts

The coverage should avoid asserting speculative business rules such as authentication requirements, session state, skin availability, or gameplay progression unless those are explicitly documented elsewhere.

## Constraints
- Do not invent business rules beyond the provided repo truth.
- Treat documentation as primary truth; if the missing docs contradict code-derived assumptions, that conflict must be surfaced explicitly.
- Prefer minimal safe changes consistent with `CLAUDE.md`.
- Scope is test-lane: this task should add smoke coverage, not redesign entry-point behavior.
- Tests should target only supported entry points that can be justified by docs or current code.
- Assertions should be resilient to redirect timing for `game.html`.
- Assertions should avoid brittle coupling to dynamic game state or implementation details not required for “Start UI visibility.”
- If the existing repo lacks an established browser test framework in available truth, the spec should not assume one as mandated; implementation should align with whatever test toolchain is already present in the full repo, or otherwise document the absence as a blocker/risk.

## Acceptance criteria
- Browser smoke coverage exists for Start UI visibility on the canonical entry point.
- Browser smoke coverage exists for Start UI visibility on the redirect/alternate entry point if that entry point is confirmed as supported.
- Visiting `index.html` in the browser smoke test results in a passing assertion that the Start UI is visible.
- Visiting `game.html` in the browser smoke test results in a passing assertion that, after redirect completion, the Start UI is visible.
- The test uses stable selectors or stable visible text already present in `index.html` and does not rely on speculative UI behavior.
- The coverage is intentionally smoke-level only and does not expand into unrelated gameplay or auth flows.
- If project docs or current code disagree about supported entry points, the discrepancy is documented in `ai/current-state/drift-register.md` per `AGENTS.md`.

## Risks
- The required source-of-truth docs were referenced but not provided, so “supported entry points” may be broader or narrower than inferred from code.
- `game.html` redirect behavior may create test flakiness if assertions do not wait for final navigation/state stabilization.
- The inline script in `index.html` was not fully provided, so it may dynamically hide or mutate overlay content in ways not visible from the snippet alone.
- If Start UI content depends on runtime conditions not shown in the provided files, a naive visibility check may be unstable.
- If no browser test framework is already established in the repo, tool-selection may require a separate decision or follow-up.
- If code is ahead of docs, this task could expose drift that must be recorded before proceeding confidently.

## Open questions
- Which browser automation framework is already approved or present in the full repository?
- What exact pages are considered “supported entry points” by the missing docs: only `index.html` and `game.html`, or additional routes as well?
- What element should be treated as the canonical Start UI assertion target: `#overlay`, title text, `#menu-content`, or another documented selector?
- Are there environment/setup requirements for browser tests in this repo that are defined outside the provided files?
- Do the missing architecture/invariants docs define a required browser matrix or CI execution pattern for smoke tests?
- Should redirect coverage also include the `/game` path in addition to `game.html`, since `game.html` contains path-based redirect logic for both?

## Related Documents
- [[ai/reviews/T-0019_gemini_review.md|T-0019 review]]
- [[ai/briefs/T-0019_implementation.md|T-0019 document]]
- [[ai/results/T-0019_executor_report.md|T-0019 result]]
- [[ai/followups/T-0019_followups.md|T-0019 followup]]
- [[ai/pr/T-0019_pr_draft.md|T-0019 pr-draft]]
