---
type: pr-draft
task_id: T-0030
created: 2026-04-10
tags: [ai-flow-lab, pr-draft]
---

# [T-0030] Build on-canvas HUD with score, coins, level, and health display

## Summary
Build on-canvas HUD with score, coins, level, and health display

**Task ID**: T-0030
**Parent Goal**: none
**Parent Task**: T-0029
**Lane**: feature-lane
**Executor**: codex

## What Changed
Build on-canvas HUD with score, coins, level, and health display


codex


- `index.html`




- Rebuilt `#hud` markup to match the spec (score, coins, gems, level, shield, powerup slots) so the overlay is ready for real-time data binding.
- Added `CONFIG.DEBUG_HUD` toggle plus new HUD helpers (`init…

## Spec Summary
- **task_id:** T-0030
- **title:** Build on-canvas HUD with score, coins, level, and health display
- **lane_type:** feature-lane
- **executor:** codex
- **parent_task_id:** T-0029


All gameplay metrics (score, coins, gems, level number, shield HP, active powerups, death count) are tracked in game …

## Review Highlights
- **Task ID:** T-0030
- **Title:** Build on-canvas HUD with score, coins, level, and health display
- **Spec File:** `ai/specs/T-0030_spec.md`


- **Title vs. Implementation:** The task title specifies an "on-canvas HUD," but the primary solution (Sections 1-4) focuses on an HTML/DOM HUD. Section 5 …

## Implementation Brief
Wire the existing HTML HUD to game state so players see real-time score, coins, gems, level number, shield status, and active powerup timers during gameplay. Add a minimal on-canvas HUD as a debug fallback (disabled by default).


Modify only `index.html` (repo root). Add `initHUD()`, `updateHUD()`,…

## Linked Decisions
(none)

## Validation
- [ ] Spec written and reviewed
- [ ] Implementation brief synthesized
- [ ] Executor report completed
- [ ] Follow-ups proposed

- [ ] Tests pass (if applicable)
- [ ] No regressions in existing functionality

## Risks
Issues

## Non-Goals
Out of scope — basic display first.

## Follow-Up Notes
T-0030 implemented the HUD system for Pixel Runner. The HTML HUD now displays real-time score, coins, gems, level number, shield indicator, and active powerup timers during gameplay. DOM references are cached in `initHUD()` and only updated when values change (throttled writes). A canvas-based debug…

---
**Branch**: `feature/T-0030-build-on-canvas-hud-with-score-coins-level-and-health-display` → `main`
**Generated**: 2026-04-07T23:57:52.326Z
**Generator**: generate-pr-draft.mjs


## Related Documents
- [[ai/specs/T-0030_spec.md|T-0030 spec]]
- [[ai/reviews/T-0030_gemini_review.md|T-0030 review]]
- [[ai/briefs/T-0030_implementation.md|T-0030 document]]
- [[ai/results/T-0030_executor_report.md|T-0030 result]]
- [[ai/followups/T-0030_followups.md|T-0030 followup]]
