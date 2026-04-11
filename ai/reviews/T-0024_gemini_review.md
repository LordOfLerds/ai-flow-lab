---
type: review
task_id: T-0024
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0024 Gemini Review

## Review target
- Task: Update architecture docs to reflect actual entry points and T-0018 behavior
- Spec: `ai/specs/T-0024_spec.md`

## Contradictions
- **Gemini Routing Discrepancy**: Within the provided `CLAUDE.md` content, there is a conflict regarding App Mode. One paragraph states: *"Steps routed to OpenAI or Gemini... go through a prompt queue"*. However, the routing table immediately below it states: *"Gemini | critique | Automatic via Gemini API"*. The architecture documentation must resolve which is the actual truth for T-0018 behavior.
- **Entry Point Naming**: The spec mentions updating docs to reflect "actual entry points," and the context shows `game.html` redirecting to `index.html`. However, standard web architecture often treats `index.html` as the entry point by default. The docs need to be clear if `index.html` is the "App/Dashboard" entry point or the "Game" entry point, as the current `index.html` seems to contain both game logic and auth panels.

## Missing edge cases
- **Redirect Lifecycle**: If `game.html` is now a pure redirect, the architecture doc should define the deprecation strategy. Is it a permanent alias or a temporary bridge?
- **Offline/CLI vs. App Mode**: The architecture docs should specify how the system behaves if a task is started in CLI mode but later needs to transition to App Mode (or vice versa), specifically regarding the `state/prompts-queue/` persistence.
- **Multi-tasking Collisions**: If two tasks are running in App Mode simultaneously, how does the architecture ensure `.prompt.md` files in `state/prompts-queue/` don't collide? (The spec doesn't mention task-id prefixing for these files).

## Scope risks
- **Domain Model Drift**: The spec focuses heavily on `ARCHITECTURE.md`, but T-0018 introduced significant "State" entities (Prompts, Responses, Poll Loops). There is a risk that `DOMAIN_MODEL.md` will become outdated if these aren't added as formal entities or "Ephemeral State" definitions.
- **ADR Consistency**: The context mentions `ADR-0003-end-to-end-reference-flow.md`. The executor might update `ARCHITECTURE.md` in a way that diverges from this ADR if not explicitly told to synchronize them.

## Missing tests
- **Documentation Link Integrity**: As this is a `docs-lane` task, the "tests" should include a verification that all internal cross-references (links between `ARCHITECTURE.md`, `CLAUDE.md`, and `ADR/`) remain valid after the update.
- **Visual Consistency**: Verification should ensure the "App Mode UI Flow" described in text matches the actual UI elements found in `index.html` (e.g., checking for the presence of the "inline prompt/response widget" logic).

## Hidden assumptions
- **"The Dashboard" is the Game**: The spec assumes the architecture should reflect that the game and the automation dashboard are now hosted within the same entry point (`index.html`).
- **Poll Loop Implementation**: Assumes the "polling" mechanism described in `CLAUDE.md` is an architectural standard for this project rather than a temporary implementation detail.

## Recommended corrections
- **Resolve Gemini Ambiguity**: Explicitly state in the "Desired Behavior" whether Gemini is automatic (API) or manual (Prompt Queue) in App Mode, based on the current functional code.
- **Formalize state/prompts-queue**: The architecture doc should explicitly define the `state/` directory structure as a "Communication Interface" between the Node.js pipeline and the Browser-based Dashboard.
- **Cross-Reference ADR-0003**: Add a requirement to ensure the updated `ARCHITECTURE.md` specifically aligns with the flow defined in `docs/ADR/ADR-0003-end-to-end-reference-flow.md`.
- **Define Entry Point Roles**: Clarify in the docs that `index.html` is the "Unified Interface" (Game + Dashboard) while `game.html` is a legacy entry point.

## Related Documents
- [[ai/specs/T-0024_spec.md|T-0024 spec]]
- [[ai/briefs/T-0024_implementation.md|T-0024 document]]
- [[ai/results/T-0024_executor_report.md|T-0024 result]]
- [[ai/followups/T-0024_followups.md|T-0024 followup]]
- [[ai/pr/T-0024_pr_draft.md|T-0024 pr-draft]]
