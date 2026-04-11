---
type: pr-draft
task_id: T-0046
created: 2026-04-10
tags: [ai-flow-lab, pr-draft]
---

# [T-0046] Fix critical game bugs: exit collision, level complete screen, skin progression

## Summary
Fix critical game bugs: exit collision, level complete screen, skin progression

**Task ID**: T-0046
**Parent Goal**: G-0005
**Parent Task**: none
**Lane**: bug-lane
**Executor**: claude

## What Changed
- **Modified `index.html` line ~2149**: Fixed `checkExitCollision()` function to call `completeLevel()` and `showLevelCompleteScreen()` instead of immediately starting next level
- **Added `showLevelCompleteScreen()` function** after line 2154: New celebration screen that displays star rating, score…

## Spec Summary
Fix 4 critical bugs found during UI testing that break core game loop and progression.


**File:** `index.html` line ~2149
**Current:** `checkExitCollision()` calls `gs.levelNum++; startGame()` without calling `completeLevel()`.
**Fix:** Before incrementing level, call `completeLevel(gs.levelNum, gs…

## Review Highlights
Spec T-0046 addresses 4 critical game bugs: exit collision not saving progress, missing level complete screen, broken skin progression, and undefined skill level requirements. The fixes involve UI flow changes, game state management, and data structure updates.


- **Skin unlock logic contradiction*…

## Implementation Brief
1. Fix checkExitCollision (most critical — breaks level progression)
2. Add showLevelCompleteScreen (needed for exit to work properly)
3. Fix skin progression (quality of life)
4. Fix skill levelReq field (cosmetic)




**Current broken code:**
```js
function checkExitCollision(p) {
  const TS = CON…

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
concerns

## Non-Goals
(see spec)

## Follow-Up Notes
- **lane_type:** feature-lane
- **executor:** codex
- **priority:** LOW
- **rationale:** Level complete screen and death screen now exist but have no audio feedback. Add Web Audio API hooks (beep patterns) for: level complete jingle, death sound, coin collect, gem collect.
- **smallest_safe_scope:**…

---
**Branch**: `feature/T-0046` → `main`
**Generated**: 2026-04-08T23:55:38.562Z
**Generator**: generate-pr-draft.mjs


## Related Documents
- [[ai/specs/T-0046_spec.md|T-0046 spec]]
- [[ai/reviews/T-0046_gemini_review.md|T-0046 review]]
- [[ai/briefs/T-0046_implementation.md|T-0046 document]]
- [[ai/results/T-0046_executor_report.md|T-0046 result]]
- [[ai/followups/T-0046_followups.md|T-0046 followup]]
