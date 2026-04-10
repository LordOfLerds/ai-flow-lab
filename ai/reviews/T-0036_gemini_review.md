# T-0036 Gemini Review

## Review target
Spec for T-0036: "Restore skills/abilities system (skill selection, cooldowns, effects)" - described as a bug-lane task to restore allegedly removed skills functionality.

## Contradictions

1. **Bug vs. Feature Classification**: Spec classifies this as "bug-lane" but presents no evidence that skills removal was unintentional. The domain model clearly states skills were "Partially deleted" in "T-0027 Incident" - using "incident" language suggests unintentional removal, but this needs verification, not assumption.

2. **Magnet Classification Confusion**: Spec repeatedly mentions "magnet" as a skill requiring restoration, but the domain model clearly defines magnet as `POWERUP_MAGNET (10)` - a power-up, not a skill. The current `CONFIG.SKILLS` only includes `double_jump`, `dash`, and `shield`. This fundamental category error undermines the scope definition.

3. **"Restore" vs. "Implement"**: Spec uses "restore" throughout, implying return to a previous working state, but provides no evidence that the target state ever existed or was fully functional. The domain model describes skills as "partially deleted" with "missing gameplay integration" - this could mean the system was incomplete rather than complete and then broken.

## Missing edge cases

1. **Skills-Powerups Integration**: No consideration of how restored skills might conflict with existing power-up system, especially given the magnet confusion. If shield exists as both skill and power-up, how do they interact?

2. **Progressive Skill Dependencies**: Spec doesn't address whether skills depend on each other (e.g., does advanced dash require basic dash unlock first?) or can be unlocked independently based solely on player level.

3. **Save/Load State Conflicts**: No consideration of existing save states that might lack skill data structures, or how to handle backward compatibility if skills data format changed since alleged removal.

4. **Skill Activation Conflicts**: No analysis of potential conflicts between skill activation keys and existing controls, or whether multiple active skills can trigger simultaneously.

## Scope risks

1. **Assumption-Driven Development**: Spec proceeds from assumption that skills should be restored without confirming this aligns with current product direction. The "T-0027 Incident" could have been intentional feature removal for good reasons (performance, UX complexity, game balance).

2. **Undefined Target State**: "Restore" implies a specific previous state, but no concrete reference implementation is provided. This could lead to implementing an idealized skills system that never actually existed.

3. **Broad System Coupling**: Skills affect multiple systems (HUD, input handling, player physics, progression) but spec underestimates complexity of clean integration without introducing bugs to existing functionality.

4. **Menu System Integration Risk**: Adding skill selection UI to main menu without understanding current menu system architecture could break existing phase transitions or skin selection flow.

## Missing tests

1. **No Skill Persistence Testing**: No testing strategy for skill unlock persistence across browser sessions or integration with existing save/load system.

2. **No Performance Impact Testing**: Skills add real-time processing (cooldown tracking, effect rendering) but no performance benchmarking planned.

3. **No Integration Testing**: No testing for skills interaction with existing systems (power-ups, enemies, moving platforms, etc.).

4. **No Input Conflict Testing**: No verification that skill activation doesn't interfere with existing controls or accessibility.

## Hidden assumptions

1. **Skills Were Fully Functional**: Assumes previous skills system was complete and working, but evidence suggests it was "partially deleted" with "missing gameplay integration" - it may have never been fully implemented.

2. **Current Partial Implementation is Correct**: Assumes existing fragments (e.g., `gs.unlockedSkills`, partial `startGame()` integration) represent correct target behavior, but these could be incomplete stubs.

3. **Menu Selection is Required**: Assumes skills need menu-based selection UI, but current player progression model might automatically activate all unlocked skills without selection.

4. **Keyboard Activation Model**: Assumes skills should be keyboard-triggered without consulting documented input handling patterns or accessibility requirements.

## Recommended corrections

1. **Reclassify Task Type**: Change from "bug-lane" to "feature-lane" until evidence proves skills removal was unintentional. Investigate T-0027 to determine if removal was deliberate.

2. **Resolve Magnet Classification**: Remove magnet from skills scope until clarification whether it belongs in skills system or should remain a power-up. Consult domain model and existing power-up system.

3. **Define Concrete Target State**: Instead of "restore," specify exact functionality to implement based on current `CONFIG.SKILLS` and documented invariants. Reference specific line numbers and existing code patterns.

4. **Separate Discovery from Implementation**: Split into two phases:
   - Phase 1: Investigate current skills system state, document what exists vs. what's missing
   - Phase 2: Implement missing components based on discovery findings

5. **Add Integration Analysis**: Before implementation, analyze how restored skills will interact with existing power-up system, input handling, HUD display, and save/load functionality.

6. **Verify Product Direction**: Confirm with domain owner that skills system should be restored rather than permanently removed. The "incident" language suggests unplanned removal, but this needs verification not assumption.