---
type: pr-draft
task_id: T-0049
created: 2026-04-10
tags: [ai-flow-lab, pr-draft]
---

# [T-0049] Fix skin progression lock and expand shop with meaningful items

## Summary
Fix skin progression lock and expand shop with meaningful items

**Task ID**: T-0049
**Parent Goal**: G-0005
**Parent Task**: none
**Lane**: feature-lane
**Executor**: codex

## What Changed
1. **Updated SKINS array** - Replaced existing 6-skin array with new 12-tiered skin system with proper unlock types (free/level/coins/gems) as specified in the spec
2. **Updated BOOSTERS array** - Replaced SHOP_BOOSTERS with new BOOSTERS array containing the 4 specific boosters from the spec (2x XP,…

## Spec Summary
- task_id: T-0049
- title: Fix skin progression lock and expand shop with meaningful items
- lane_type: feature-lane
- executor: codex


Currently all skins are unlocked by default or easily accessible without meaningful progression. The shop lacks variety — no boosters, no cosmetic trails, no tiere…

## Review Highlights
Spec T-0049: Fix skin progression lock and expand shop with meaningful items.


- Spec says `unlockType: 'coins'` requires `levelReq AND cost`, but some coin skins have `levelReq: 0` (e.g., Mystic). Clarify: is levelReq 0 treated as "no level requirement" or "available from level 0"? Suggest: levelR…

## Implementation Brief
Fix skin unlock progression so skins require levels/coins/gems, expand shop to 3 tabs (Skins, Boosters, Trails), and persist purchases in localStorage.


1. Replace SKINS array with 12 tiered skins (free/level/coins/gems unlock types).
2. Update `showSkinsMenu()` to show lock icons, requirements, an…

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
- title: Balance economy — adjust coin/gem drop rates for shop pricing
- description: With the new shop prices (skins up to 3000 coins, gems up to 100), the current coin/gem drop rates may make premium items unachievable. Need to audit drop rates across 100 levels and adjust so players can afford mi…

---
**Branch**: `feature/T-0049` → `main`
**Generated**: 2026-04-09T00:28:20.700Z
**Generator**: generate-pr-draft.mjs


## Related Documents
- [[ai/specs/T-0049_spec.md|T-0049 spec]]
- [[ai/reviews/T-0049_gemini_review.md|T-0049 review]]
- [[ai/briefs/T-0049_implementation.md|T-0049 document]]
- [[ai/results/T-0049_executor_report.md|T-0049 result]]
- [[ai/followups/T-0049_followups.md|T-0049 followup]]
