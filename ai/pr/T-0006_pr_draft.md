---
type: pr-draft
task_id: T-0006
created: 2026-04-10
tags: [ai-flow-lab, pr-draft]
---

# [T-0006] Build XP, leveling, skills, and skins system

## Summary
Build XP, leveling, skills, and skins system

**Task ID**: T-0006
**Parent Goal**: G-0001
**Parent Task**: none
**Lane**: feature-lane
**Executor**: codex

## What Changed
(none)

## Spec Summary
- Task ID: T-0006
- Title: Build XP, leveling, skills, and skins system
- Lane: feature-lane
- Executor: codex (ChatGPT)
- Depends on: T-0005 (collectibles with XP), T-0002 (player movement for skill implementation)


The game currently has no progression system. To provide long-term engagement, we …

## Review Highlights
Spec for implementing XP/leveling system, skill tree (double jump, dash, shield start), 5 unlockable skins, character select menu, and localStorage persistence.


1. **Skill point generation mechanic** - Spec says "Wizard skin: 20% skill point generation" but also states "Each level-up grants 1 skil…

## Implementation Brief
Implement XP/leveling (cumulative thresholds: 100, 250, 500, 1000, 2000), skill tree (double jump, dash, shield start), 5 unlockable skins with stat bonuses, character select menu, and localStorage persistence.


1. **XP bar and leveling** - Display current/next threshold; level-up at cumulative thr…

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
(none identified in review)

## Non-Goals
(see spec)

## Follow-Up Notes
T-0006 successfully implemented XP, leveling, skills, and character skins systems. The implementation includes XP accumulation from collectibles and defeats, level thresholds unlocking new skins, and skill tree UI for displaying unlocked abilities. Players now have visible progression and character …

---
**Branch**: `feature/T-0006-build-xp-leveling-skills-and-skins-system` → `main`
**Generated**: 2026-04-07T05:47:06.503Z
**Generator**: generate-pr-draft.mjs


## Related Documents
- [[ai/specs/T-0006_spec.md|T-0006 spec]]
- [[ai/reviews/T-0006_gemini_review.md|T-0006 review]]
- [[ai/briefs/T-0006_implementation.md|T-0006 document]]
- [[ai/followups/T-0006_followups.md|T-0006 followup]]
