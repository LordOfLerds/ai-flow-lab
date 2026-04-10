# T-0044 Gemini Review: Battle Pass and Progression System

## Review target
Spec for implementing a seasonal battle pass with 50 tiers, XP-based progression, challenge-driven rewards, and monthly seasonal reset. Includes tier unlock UI, challenge tracking, and reward preview panel.

## Contradictions
- XP calculation spec says "all level completions grant XP," but doesn't clarify if XP stacking is linear or if later levels award bonus XP. Does level 50 grant same XP as level 5?
- Seasonal reset says "monthly reset with new challenges," but doesn't specify: are old challenge results archived or deleted? If deleted, player loses progression history and can't review past achievements.
- Challenge tracking says "update in real-time," but XP system updates on level complete (discrete), not per-frame. Spec inconsistency on when XP registers.
- Tier auto-unlock at 0XP: spec implies tier 1 is always unlocked. Does first tier require 0 XP or does it have a threshold? Clarify initial state.

## Missing edge cases
- XP overflow: if player completes 5 levels in one session, does XP accumulate correctly? Spec doesn't handle bulk XP updates or multi-tier unlock (e.g., +500 XP might unlock tiers 2, 3, and 4 at once).
- Challenge overlap with existing systems: some challenges may conflict with level objectives (e.g., "complete level 10 without power-ups" vs. designed difficulty). What happens if challenge is impossible on current level balance?
- Seasonal boundary: if player is tier 45 when season ends, reset to tier 1? Do completed challenges carry over? Spec says "new challenges" but doesn't say if old ones vanish.
- Reward type mismatch: spec lists "coins, cosmetics, XP" as rewards. What if a challenge completes but player inventory is full (cosmetics) or save fails? Does reward queue/retry or is it lost?

## Scope risks
- XP balance: 50 tiers with unknown XP-per-tier formula. Risk of tier progression being too fast (players finish in 1 day) or too slow (unachievable without grinding). Recommend playtesting with 50-tier ramp before shipping.
- Challenge data storage: spec doesn't clarify if challenges are stored per-player (tracking progress) or global (reset each season). If per-player, old season data bloats saves. Need archive/cleanup strategy.
- Challenge feedback loop: spec assumes challenges are achievable on all levels, but doesn't validate. "Defeat 100 enemies in level 2" might be impossible if level 2 has only 50 enemies. Need challenge-level validation at data entry time.
- UI performance: 50 tiers with preview cards (showing reward icons, descriptions) could cause lag on slower devices. Spec doesn't mention pagination or lazy-loading tiers.

## Missing tests
- XP progression test: complete 3 levels (100 XP each) → total 300 XP → auto-unlock tiers corresponding to 300 XP threshold.
- Multi-tier unlock test: if completing one level grants 250 XP and tiers cost 100 XP each, completing level should unlock tiers 1, 2, and possibly 3 if XP exceeds tier 3 threshold.
- Seasonal reset test: at month boundary, old challenges archived, new challenges appear, player tier resets to 1, owned cosmetics retained.
- Challenge completion test: complete challenge requirement (e.g., "120 coins collected") → challenge marked done, reward claimed, can't double-claim.
- Impossible challenge test: challenge requires 500 coins but level grants only 200 → challenge marked "incomplete" and not auto-claimed; player sees warning.

## Hidden assumptions
- Assumes XP formula is linear (tier N costs N*100 XP). If non-linear (e.g., quadratic), entire balance shifts. Confirm XP-per-tier cost assumptions.
- Assumes one active battle pass per season. If future content allows parallel passes (e.g., "Daily Pass" + "Seasonal Pass"), architecture must support multiple passes.
- Assumes all challenges are completable in order (no dependencies). If future challenges depend on prior tier unlocks, challenge order matters.
- Assumes rewards are independent (no "redeem all" or bundle mechanics). If players expect batch-claim, UI must evolve.

## Recommended corrections
1. Define XP-per-tier formula explicitly: clarify total XP needed to reach each of 50 tiers. Include table or formula (e.g., tier N requires N*100 cumulative XP).
2. Specify XP bonus per level: do later levels grant bonus XP? If so, define scaling (linear, exponential, or flat bonus?).
3. Clarify seasonal reset scope: confirm whether old challenges are archived (for history/stat tracking) or deleted. Define how long archives persist (forever, last 3 seasons, etc.).
4. Add challenge validation rule: at challenge creation, validate requirement is achievable on stated level(s). Include example validation logic.
5. Specify tier 1 initial state: does tier 1 cost 0 XP (auto-unlock) or some minimum? If auto-unlock, clearly state in UX (don't count towards "50 tiers earned").

## Overall assessment
**Solid spec with progression-balance gaps.** Recommend proceeding after defining XP-per-tier formula, confirming challenge validation strategy, and clarifying seasonal archive behavior. Playtest tier progression pacing before launch.
