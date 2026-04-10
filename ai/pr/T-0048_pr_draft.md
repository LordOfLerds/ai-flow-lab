# [T-0048] Expand skill system: 8+ skills with meaningful progression tree

## Summary
Expand skill system: 8+ skills with meaningful progression tree

**Task ID**: T-0048
**Parent Goal**: G-0005
**Parent Task**: none
**Lane**: feature-lane
**Executor**: codex

## What Changed
- **Expanded SKILLS array from 3 to 8 skills**: Added Magnet (Lv7), Wall Jump (Lv10), Glide (Lv15), Ground Pound/Stomp (Lv20), and Time Slow (Lv30) to existing Double Jump (Lv2), Dash (Lv3), and Shield (Lv5)
- **Added new game state variables**: `timeScale`, `timeSlowTimer`, `timeSlowCooldown` in gl…

## Spec Summary
Expand from 3 skills to 8 skills with meaningful progression and gameplay effects.


Replace current 3-skill SKILLS array:
```js
const SKILLS = [
  { id: 'double_jump', name: 'Double Jump', icon: '⬆️', desc: 'Jump again mid-air', levelReq: 2, unlocked: false },
  { id: 'dash', name: 'Dash', icon: '�…

## Review Highlights
Spec T-0048: Expand skill system from 3 to 8 skills with progression tree.


- None found. The spec correctly extends the existing SKILLS array pattern.


1. **Magnet + collectibles already collected**: Need to ensure magnet only targets uncollected items and doesn't re-pull collected ones.
2. **Wal…

## Implementation Brief
Expand the skill system from 3 skills to 8 skills with meaningful gameplay mechanics and a progression tree tied to player level.


1. Replace SKILLS array with 8 skills: Double Jump (Lv2), Dash (Lv3), Shield (Lv5), Magnet (Lv7), Wall Jump (Lv10), Glide (Lv15), Ground Pound (Lv20), Time Slow (Lv30).…

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
- title: Add visual feedback and particle effects for new skills activation
- description: When skills like Ground Pound, Time Slow, Wall Jump, and Glide activate, add visual particle effects and screen feedback (screen shake for stomp, blue tint for time slow, trail for dash). Currently skills acti…

---
**Branch**: `feature/T-0048` → `main`
**Generated**: 2026-04-09T00:16:12.199Z
**Generator**: generate-pr-draft.mjs
