---
type: review
task_id: T-0034
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0034 Gemini Review

## Review target

T-0034 spec for fixing the bug where player score, coins, and gems persist across game restarts instead of resetting to zero.

## Contradictions

1. **Scope mismatch**: The title mentions "score does not reset" but the solution includes health reset (`gs.health = CONFIG.PLAYER_MAX_HEALTH || 3`), which is outside the stated problem scope.

2. **Restart ambiguity**: The overview talks about "game restarts" but acceptance criteria specifically mentions "after dying and restarting" - unclear if this covers all restart mechanisms or just death-restart.

3. **Change count inconsistency**: Claims "4-line addition" but only 3 lines relate to the actual bug (score, coins, gems). The health line appears to be scope creep.

## Missing edge cases

1. **Multiple restart paths**: No consideration of manual restart, level restart, or other restart mechanisms beyond death-restart
2. **CONFIG validation**: No handling of undefined or invalid `CONFIG.PLAYER_MAX_HEALTH` values
3. **Additional score state**: Potential for other score-related properties (multipliers, combo bonuses, power-up effects) that might also persist
4. **Rapid restart scenarios**: What happens if player triggers multiple restarts quickly
5. **Mid-game restart**: Behavior when restarting during different game phases

## Scope risks

1. **Health reset inclusion**: Adding health reset when the bug is specifically about score creates unnecessary scope expansion
2. **Stale line references**: "Around line 1194" may be outdated, leading to incorrect placement
3. **Insufficient verification**: No proof that the root cause analysis is correct or that `startGame()` is the only reset point
4. **State object assumptions**: Assumes `gs` object structure without verification

## Missing tests

1. **Bug reproduction**: No steps to verify the bug exists before fixing
2. **Fix verification**: No concrete test steps to confirm the solution works
3. **Regression testing**: No mention of testing other game mechanics remain unaffected
4. **Edge case testing**: No tests for CONFIG edge cases or multiple restart scenarios
5. **Integration testing**: No verification that HUD updates correctly reflect the reset state

## Hidden assumptions

1. **Single reset path**: Assumes `startGame()` is the only function responsible for game resets
2. **Object structure**: Assumes `gs` contains exactly these properties and no others need resetting
3. **CONFIG availability**: Assumes `CONFIG.PLAYER_MAX_HEALTH` exists and is properly initialized
4. **HUD behavior**: Assumes `initHUD()` and `updateHUD()` work as described without verification
5. **No dependencies**: Assumes no other code relies on score persistence behavior

## Recommended corrections

1. **Remove health reset** - Focus only on score-related properties (score, coins, gems) as stated in the bug description
2. **Verify current code** - Read `index.html` to confirm line numbers, object structure, and root cause analysis
3. **Clarify restart scope** - Specify exactly which restart scenarios are covered (death, manual, level complete, etc.)
4. **Add test methodology** - Include steps to reproduce bug, verify fix, and test edge cases
5. **Validate assumptions** - Confirm `gs` object properties and that `startGame()` is the correct intervention point
6. **Check for completeness** - Verify no other score-related state needs resetting

## Related Documents
- [[ai/specs/T-0034_spec.md|T-0034 spec]]
- [[ai/briefs/T-0034_implementation.md|T-0034 document]]
- [[ai/results/T-0034_executor_report.md|T-0034 result]]
