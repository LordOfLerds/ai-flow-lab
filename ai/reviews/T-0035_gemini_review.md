# T-0035 Gemini Review

## Review target

The spec targets restoration of a skin system that was partially deleted in the T-0027 incident. According to DOMAIN_MODEL.md, the SKINS configuration remains but UI rendering, color palette substitution, and bonus application code was removed. The task aims to restore main menu skin selection and player rendering with skin variants.

## Contradictions

**Documentation vs. Implementation Gap**: The spec creates a potential deadlock by requiring docs validation before implementation, but then conditionally implementing "if that feature is defined by the docs." Since DOMAIN_MODEL.md explicitly documents skins as a core feature with detailed invariants, this conditional logic is unnecessary and could confuse the executor.

**Function Name Ambiguity**: The spec mentions both `drawPlayer()` (from task description) and `renderPlayer()/makePlayerSprite()` (from current code) without resolving which is the actual current implementation. This creates uncertainty about the restoration target.

**Minimal Scope vs. Comprehensive Requirements**: The spec claims "minimal scope" but then lists 5 detailed behavioral requirements plus acceptance criteria. The scope is actually quite comprehensive, not minimal.

## Missing edge cases

**Data Integrity**: No handling for corrupted skin selection state (e.g., `gs.selectedSkin` pointing to non-existent skin index, or skin objects with missing required fields).

**Performance**: No consideration of rendering performance impact when switching between different skin color palettes during gameplay.

**State Transitions**: The spec doesn't address what happens if skin selection is accessed during inappropriate game phases or how to handle interrupted skin selection flows.

**Unlock Logic**: While mentioning that unlock rules shouldn't be "invented," the spec doesn't address what happens when skin unlock state is inconsistent (e.g., selected skin is locked according to current level).

**Browser Compatibility**: No consideration of whether the CSS skin classes (`.skin-grid`, `.skin-card`, etc.) work with current DOM structure.

## Scope risks

**Menu System Expansion**: "Restoring showMainMenu()" could easily expand into broad menu system rewrites if the current menu infrastructure has changed significantly since T-0027.

**Skin System Dependencies**: The skin bonus system may have dependencies on other partially deleted systems (skills, progression) that aren't in scope, potentially requiring more restoration than intended.

**CSS Integration Risk**: The existing skin CSS classes may not integrate properly with current HTML structure, potentially requiring DOM restructuring beyond skin-specific changes.

**Rendering Pipeline Changes**: If the render pipeline has changed significantly since T-0027, skin rendering integration may require broader rendering modifications.

## Missing tests

**Visual Verification**: No testing strategy for verifying that different skins actually produce visually distinct player appearances.

**Skin Selection UI**: No testing of skin selection interaction flow, including edge cases like rapid clicking or selecting locked skins.

**Bonus Integration**: No testing that skin bonuses correctly affect gameplay mechanics (speed, jump, etc.).

**State Persistence**: No testing of skin selection persistence within a game session or across menu transitions.

**Cross-Phase Integration**: No testing that skin selection works correctly when transitioning between MENU, SKIN_SELECT, and PLAYING phases.

## Hidden assumptions

**Skin Data Stability**: Assumes the current SKINS array format and structure is correct and complete, without verification.

**CSS-HTML Integration**: Assumes the existing `.skin-grid`, `.skin-card` CSS classes will work with whatever HTML structure needs to be restored.

**Bonus System Integrity**: Assumes the existing bonus application logic is working correctly and only needs skin selection restoration, not bonus system fixes.

**Phase Management**: Assumes the `SKIN_SELECT` phase mentioned in INVARIANTS.md is properly integrated into the current phase management system.

**Rendering Context**: Assumes the current rendering system can accommodate skin color palette substitution without significant architectural changes.

## Recommended corrections

1. **Remove Conditional Logic**: Since DOMAIN_MODEL.md explicitly documents skins as a core feature, remove the "if docs define skins" conditional and proceed with restoration directly.

2. **Clarify Function Names**: Specify that the executor should identify the current player rendering function rather than assuming `drawPlayer()` still exists. Reference the actual current implementation.

3. **Add Data Validation Requirements**: Require validation of skin selection state integrity before restoration, including bounds checking and fallback to default skin if selection is invalid.

4. **Scope the Menu Changes**: Specify that if `showMainMenu()` restoration requires significant menu system changes, the executor should document the scope expansion and consider a phased approach.

5. **Add Testing Requirements**: Include specific requirements for visual verification testing and skin selection flow testing in the acceptance criteria.

6. **Clarify Phase Integration**: Verify that the `SKIN_SELECT` phase mentioned in INVARIANTS.md is properly implemented in the current phase management system before relying on it.

7. **Add Rollback Plan**: Include explicit rollback criteria if the restoration scope expands beyond skin-specific changes into broader menu or rendering system modifications.