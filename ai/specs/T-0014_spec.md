---
type: spec
task_id: T-0014
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

# T-0014 Spec

## Task metadata

- **Task ID:** T-0014
- **Title:** Alle Docs für das Jump and Run nachziehen
- **Lane type:** docs-lane
- **Executor:** codex

## Problem statement

The repository contains a playable jump-and-run game implementation in `index.html`, but the documented source-of-truth files referenced by `AGENTS.md` are not present in the provided repo truth set:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/`

Because these docs are missing from the available inputs, the current project state is under-documented and the game behavior is discoverable only by reading code. This creates a documentation gap for core concepts such as game state, entities, progression, controls, level generation, collisions, HUD, menus, and runtime rules.

The task is therefore to bring the documentation up to date for the jump-and-run game based on the currently available repository truth. Since the expected docs are absent, any documentation derived from code must explicitly note that it is code-inferred and potentially subject to drift until confirmed by the human owner or additional docs.

## Source of truth

Primary truth available in the provided inputs:

1. `AGENTS.md`
   - States that the intended source of truth should be:
     - `docs/DOMAIN_MODEL.md`
     - `docs/INVARIANTS.md`
     - `docs/ARCHITECTURE.md`
     - `docs/ADR/`
   - Also states the drift rule: if docs and tested code disagree, do not decide silently; document conflict in `ai/current-state/drift-register.md`.

2. `CLAUDE.md`
   - Requires minimal safe changes and clear documentation of blockers or drift.

3. `index.html`
   - Only concrete implementation artifact provided for the jump-and-run game.
   - Acts as the practical behavior reference for this task because the expected docs are not available in the repo truth set.

Uncertainty to state explicitly:
- The canonical documentation files named in `AGENTS.md` are not included in the provided repo truth. Therefore, documentation work for this task can only be specified as either:
  - creating the missing docs from current code behavior, or
  - updating existing docs if they are present in the actual repo but omitted from the prompt.
- If existing docs are found in the real repository and they differ from `index.html`, that conflict must be treated as drift and documented rather than silently resolved.

## Desired behavior

The task should produce or update project documentation so that the jump-and-run game is described in the repo’s expected documentation structure, using the implemented behavior in `index.html` as the best available reference where no prior docs exist.

Expected documentation coverage, without inventing new rules:

- **Domain documentation**
  - Describe the main game entities and data structures visible in code, including at minimum:
    - game state (`gs`)
    - player
    - level
    - tiles
    - enemies
    - moving platforms
    - particles
    - floating texts
    - skins
    - skills
    - power-ups
  - Document key attributes and relationships as they currently appear in code.

- **Architecture documentation**
  - Describe the app as a single-page browser game implemented in one HTML file with embedded CSS and JavaScript.
  - Document the major runtime subsystems visible in code, such as:
    - input handling
    - game loop
    - update cycle
    - rendering
    - level generation
    - collision handling
    - progression / XP / skills
    - UI overlays and HUD

- **Invariant / rules documentation**
  - Capture stable rules that are explicitly implemented, such as:
    - game phases
    - XP leveling behavior
    - unlock conditions for skins and skills
    - tile solidity rules
    - death and level transition behavior
    - power-up duration counters
  - Distinguish between confirmed code behavior and any assumptions that cannot be confirmed from docs.

- **ADR coverage if applicable**
  - If the repo currently uses ADRs to capture important decisions, add or update an ADR only if that structure already exists or is clearly expected by the real repo.
  - Do not invent architectural decisions beyond what can be evidenced from the code and current repository conventions.

- **Drift handling**
  - If actual repo docs exist and differ from `index.html`, the change should document the discrepancy explicitly.
  - If required by workflow, add an entry to `ai/current-state/drift-register.md` instead of silently reconciling conflicts.

## Constraints

- Do not implement gameplay changes or refactor code.
- Do not invent business or game-design rules that are not evidenced in the provided code or docs.
- Treat repository docs as primary truth if they exist in the actual repo, even though they were not provided here.
- If code appears ahead of docs, state that uncertainty explicitly in the documentation/spec.
- Keep changes scoped to documentation artifacts relevant to the jump-and-run game.
- Follow the repo discipline from `AGENTS.md`:
  - one writing agent per task
  - no edits outside assigned task scope
- If the required doc files are absent, creating them is in scope only insofar as needed to align the repo with the documented expected structure from `AGENTS.md`.
- If there is insufficient evidence for a statement, mark it as unknown or inferred-from-code.

## Acceptance criteria

- Documentation for the jump-and-run game exists or is updated in the repo’s expected docs structure.
- The documentation reflects the implemented behavior in `index.html` at least for the following areas:
  - controls
  - game phases / menus
  - player movement capabilities
  - skills and unlock levels
  - skins and unlock levels
  - tile and power-up types
  - enemy types
  - level generation characteristics
  - scoring / XP / progression
  - death and retry flow
  - HUD and overlay behavior
- Any statement not grounded in existing docs or code is avoided.
- Any mismatch found between existing docs and code is explicitly called out as drift rather than silently merged.
- If applicable, `ai/current-state/drift-register.md` is updated with identified conflicts.
- No gameplay code behavior is changed as part of this task.
- Changed files are limited to documentation-related scope.

## Risks

- **Missing primary docs risk:** The files declared as source of truth in `AGENTS.md` are not present in the provided inputs, so the task may need to infer documentation from code. This increases the risk of documenting implementation details that were not yet formally approved.
- **Code-doc drift risk:** `index.html` may already be ahead of undocumented intended behavior. Without the missing docs, it is not possible to know whether all implemented mechanics are final.
- **Single-file implementation risk:** Because game logic, UI, and rendering are all embedded in one file, documentation extraction may miss implicit relationships unless done carefully.
- **Terminology risk:** Existing project terminology may differ from code naming if unseen docs already exist in the actual repository.
- **Scope creep risk:** “Alle Docs” could be interpreted broadly. The safe interpretation is to update only the jump-and-run-related project docs supported by current evidence.

## Open questions

- Are `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, and any `docs/ADR/` entries already present in the actual repository but omitted from the prompt?
- If those docs exist, should this task update them in place, or create missing sections/files only where gaps are found?
- Is `ai/current-state/drift-register.md` already present and expected to be updated as part of this docs task when discrepancies are found?
- What exact file set is intended by “Alle Docs” for this game:
  - only the source-of-truth docs from `AGENTS.md`,
  - plus README-style user docs,
  - or also ADRs and task-specific notes?
- Should the documentation describe the current code behavior exactly, even where the code may contain quirks, or should such quirks be called out as implementation-specific uncertainty?

## Related Documents
- [[ai/reviews/T-0014_gemini_review.md|T-0014 review]]
- [[ai/briefs/T-0014_implementation.md|T-0014 document]]
- [[ai/results/T-0014_executor_report.md|T-0014 result]]
- [[ai/results/T-0014_result.md|T-0014 result]]
- [[ai/followups/T-0014_followups.md|T-0014 followup]]
- [[ai/pr/T-0014_pr_draft.md|T-0014 pr-draft]]
