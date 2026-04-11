---
type: review
task_id: T-0006
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0006 Gemini Review

## Review target
Spec for implementing XP/leveling system, skill tree (double jump, dash, shield start), 5 unlockable skins, character select menu, and localStorage persistence.

## Contradictions
1. **Skill point generation mechanic** - Spec says "Wizard skin: 20% skill point generation" but also states "Each level-up grants 1 skill point". Does the wizard generate bonus skill points (e.g., 1.2 per level), or is this placeholder for future feature? Recommend: clarify that skill points are always 1 per level in T-0006; wizard bonus is cosmetic/deferred to progression expansion.

2. **XP scaling ambiguity** - Spec says "Level 6+: 2000 XP (max level, or continue scaling)". Is this a cap, or does it continue? Recommend: define explicitly as "max level = 6; further XP collection is tracked but no new levels unlock; serves as prestige counter".

3. **Dash momentum interaction** - Spec says "Dash applies velocity.x only; collision detection handles interaction". But does dash stop when hitting a wall, or does player persist dashing through it? Recommend: clarify that dash velocity is subject to collision (wall stops dash momentum), not invincible.

4. **Double Jump mid-platform** - If player is within a platform (clipping), can they double jump to escape? Spec doesn't address. Recommend: double jump only works if player is airborne AND has not double-jumped already this air phase; clamping.

## Missing edge cases
1. **Dash + moving platform** - If player dashes while on a moving platform, does dash velocity stack with platform velocity? Recommend: clarify that dash applies absolute velocity.x (not relative), so platform motion is overridden during dash.

2. **Shield Start overlap with Magnet Shield** - If Shield Start skill is active and player also picks up Shield power-up, are both active? Recommend: clarify that shields don't stack; picking up power-up shield overwrites skill shield if skill expires first.

3. **Level-up mid-level** - If player levels up during a level (not at level start), when are new skills active? Recommend: skills become active immediately on unlock (mid-level); no reload needed.

4. **Skin unlock mid-level** - Spec says "skin change only applies on next level start", but does the visual change mid-level or wait? Recommend: visual applies immediately (sprite swapped mid-frame), but officially "unlocked for next level".

5. **XP overflow on level-up** - If player gains 200 XP and needs only 50 to level up, does remaining 150 XP apply to next level threshold? (Assumed yes, but not explicit). Recommend: confirm "excess XP carries over to next level threshold".

## Scope risks
1. **Skill balance impact on level design** - Double Jump + Dash enable sequence breaking in existing levels (T-0004, T-0005). Recommend: review all levels to ensure no unintended shortcuts with both skills active. Flag for level redesign if breaking occurs.

2. **Skin visual complexity** - 5 distinct skins require different sprite assets or tinting logic. Current implementation may not have sprite system. Recommend: clarify whether skins are color-tinted variants or separate sprite sheets; estimate asset creation time.

3. **localStorage API differences** - localStorage not available in private browsing (some browsers). Spec doesn't handle graceful degradation. Recommend: add fallback to in-memory gameState if localStorage unavailable; warn user about unsaved progress.

4. **Character select screen interaction** - Spec assumes canvas-based menu (no DOM elements). Rendering menu state alongside game state may be complex. Recommend: define menu state machine (MENU, SKILL_TREE, SETTINGS) and state transition logic.

5. **XP gain during power-up+ skill interaction** - Golden skin (+5% XP) + Wizard skill (+20% skill points) may create confusing interaction. Recommend: clarify that wizard bonus is deferred; golden skin applies to all XP gains equally.

## Missing tests
1. No test for XP threshold edge case (exactly at threshold XP vs. just over).
2. No test for double jump behavior with gravity at boundary (velocity.y near zero).
3. No test for dash through walls/obstacles (collision priority).
4. No test for skill unlock during level (double jump unlocked mid-level, immediately usable).
5. No test for skin unlock and immediate visual change.
6. No test for localStorage corruption recovery (malformed data).

## Hidden assumptions
1. **Sprite sheet format** - Assumes each skin has distinct sprite or can be tinted. Color tinting approach not specified.

2. **Skill point UI** - Assumes gameState has `skillPoints` counter; not verified against existing structure. May conflict with T-0005.

3. **Jump state tracking** - Assumes gameState tracks jump count and ground state. Used for double jump; may conflict with T-0002 jump implementation.

4. **localStorage encoding** - Assumes JSON.stringify/parse; no encryption or validation. Spec doesn't address malformed data from user editing localStorage.

5. **Menu navigation** - Character select menu assumes keyboard input (arrow keys, enter) without explicit key binding definition. Maps to existing input handling?

## Recommended corrections
1. **Clarify Wizard bonus scope** - Change "Wizard: 20% skill point generation" to "Wizard: Cosmetic skin; +20% skill point generation deferred to future progression system. In T-0006, grants standard 1 skill point per level."

2. **Define max level explicitly** - Change "Level 6+: 2000 XP" to "Max level: 6. Reaching level 6 (2000 XP) locks further progression. XP beyond 2000 is tracked in gameState.totalXP for prestige/display but no new levels unlock."

3. **Specify dash invulnerability** - Add AC: "Dash velocity is subject to collision detection. If player hits wall during dash, dash ends and collision stops movement (no invulnerability period)."

4. **Define double jump air phase** - Add AC: "Double jump only works if: (1) velocity.y != 0 (airborne), and (2) jumpCount < 2. Reset jumpCount = 0 on ground contact. Second jump has same impulse as first."

5. **Clarify Shield Start stacking** - Add AC: "Shield Start skill and Shield power-up do not stack. Picking up Shield power-up overwrites skill-granted shield; both expire independently on hit or timeout."

6. **Document XP excess carry-over** - Add AC: "XP gained in excess of next level threshold carries over. E.g., if player needs 30 more XP to level and gains 100 XP, remaining 70 XP applies toward next threshold."

7. **Add localStorage fallback** - Add to Constraints: "If localStorage unavailable (private browsing, quota exceeded), degrade to in-memory gameState only. On level complete, display warning: 'Progress not saved; localStorage unavailable'."

8. **Specify menu state machine** - Add section "Menu State Machine": "States: START_MENU, CHARACTER_SELECT, SKILL_TREE, GAME_RUNNING, LEVEL_COMPLETE. Transitions: START_MENU → CHARACTER_SELECT → GAME_RUNNING → LEVEL_COMPLETE → CHARACTER_SELECT."



## Related Documents
- [[ai/specs/T-0006_spec.md|T-0006 spec]]
- [[ai/briefs/T-0006_implementation.md|T-0006 document]]
- [[ai/followups/T-0006_followups.md|T-0006 followup]]
- [[ai/pr/T-0006_pr_draft.md|T-0006 pr-draft]]
