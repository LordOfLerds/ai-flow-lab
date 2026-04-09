# T-0017 Spec

## Task metadata

- **Task ID:** T-0017
- **Title:** Score goes higher while player not moving
- **Lane type:** feature-lane
- **Executor:** codex

## Problem statement

The reported issue is that score increases even while the player is not moving. The requested outcome is: “Score should only advance for progress ingame.”

Based on the task description, current scoring behavior appears to reward elapsed gameplay rather than actual player progress. This creates a mismatch between the visible score and the player’s in-game advancement.

Because the repository truth provided here does not include gameplay documentation from `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, or `docs/ADR/`, there is no documented business definition of “progress ingame” available in the supplied source set. The spec therefore must stay narrow: it should align scoring with measurable in-game progress and stop passive score gain while the player is stationary.

## Source of truth

Primary documented source of truth is declared in `AGENTS.md` as:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/`

However, those files were not included in the provided repo truth content for this task. Therefore:

- **Documented gameplay/scoring rules are currently unavailable in the supplied materials.**
- The task description is the clearest available requirement: **“Score should only advance for progress ingame.”**
- `index.html` confirms there is a HUD score display (`#hud-score`) in the current game UI.
- Any finer interpretation of “progress” beyond observable gameplay advancement is **uncertain** until the docs are inspected.

If implementation behavior in code currently defines scoring more specifically than docs, that would need to be treated as potential drift rather than silently accepted.

## Desired behavior

- Score increases only when the player makes actual in-game progress.
- Score does not increase merely because time passes.
- Score does not increase while the player remains stationary.
- When the player resumes making progress, score continues increasing in step with that progress.
- The change should be limited to score progression behavior and should not redefine unrelated systems unless existing docs explicitly require it.

Because no scoring design docs were provided, this spec intentionally does **not** define:
- the exact formula for score gain,
- whether vertical movement counts as progress,
- whether forced world scrolling counts as player progress,
- whether airborne motion without horizontal advancement counts as progress.

Those details remain open unless existing docs or code clearly establish them.

## Constraints

- Do not invent new business rules beyond the task request.
- Prefer the minimal safe change needed to stop score gain while the player is not moving.
- Respect documented source-of-truth precedence from `AGENTS.md`.
- If docs and current tested code disagree on what counts as progress, that conflict must be called out explicitly rather than resolved implicitly.
- The HUD score display in `index.html` must continue to reflect the actual score value.
- Scope should remain limited to gameplay scoring behavior relevant to this bug.

## Acceptance criteria

- While the player is stationary in-game, score remains unchanged.
- Score no longer increases solely due to elapsed time.
- When the player makes in-game progress, score increases accordingly.
- The visible score in the HUD stays consistent with the underlying score state.
- No unrelated HUD elements or progression displays are changed as part of this task.
- If repository docs define “progress ingame” differently from current code assumptions, that discrepancy is documented explicitly before implementation proceeds.

## Risks

- The term “progress ingame” is underdefined in the supplied materials, so implementation could choose the wrong movement/progress signal.
- If the game includes camera movement, auto-scroll, knockback, or environmental motion, it may be unclear whether those should count as scoreable progress.
- If current scoring is tied to a shared game-loop timer, changing it may have side effects on other progression systems.
- There is a drift risk because source-of-truth docs referenced by `AGENTS.md` were not available in the provided repo truth set.

## Open questions

- How is “progress ingame” defined in the missing docs: horizontal displacement, world distance traveled, camera advance, or something else?
- If the player jumps in place without net forward movement, should score increase?
- If the environment scrolls while the player appears still, should that count as progress?
- Is score expected to track raw distance, milestones, or another progression metric?
- Are there existing tests or invariants for scoring that need to be updated alongside this fix?