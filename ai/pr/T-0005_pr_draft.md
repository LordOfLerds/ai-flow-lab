# [T-0005] Implement collectibles, rewards, and power-ups

## Summary
Implement collectibles, rewards, and power-ups

**Task ID**: T-0005
**Parent Goal**: G-0001
**Parent Task**: none
**Lane**: feature-lane
**Executor**: codex

## What Changed
(none)

## Spec Summary
- Task ID: T-0005
- Title: Implement collectibles, rewards, and power-ups
- Lane: feature-lane
- Executor: codex (ChatGPT)
- Depends on: T-0003 (collision system), T-0004 (obstacles/enemies, optional for level density)


The game currently has no reward or progression system. To make gameplay engagi…

## Review Highlights
Spec for implementing collectible coins, gems, and three power-up types (speed boost, shield, magnet) with pickup animations and per-level persistence.


1. **Power-up expiry vs. death** - Spec says "expires on level restart" for shield but also "8 seconds" for speed boost/magnet. Unclear: does shie…

## Implementation Brief
Implement collectible coins (+10 XP), gems (+50 XP), and three power-up types (speed boost, shield, magnet) with pickup animations and frame-based persistence. Track collected coins per level for XP system integration in T-0006.


1. **Coins** - Rotating 16x16 sprite, +10 XP, pickup animation (scale…

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
T-0005 successfully implemented collectibles (coins, gems), power-ups (invulnerability shield, speed boost), and reward mechanisms. The system integrates pickups with score/XP tracking and visual feedback (particles, sounds). Gameplay now has a complete reward loop driving player engagement.


1. **…

---
**Branch**: `feature/T-0005-implement-collectibles-rewards-and-power-ups` → `main`
**Generated**: 2026-04-07T05:46:34.140Z
**Generator**: generate-pr-draft.mjs
