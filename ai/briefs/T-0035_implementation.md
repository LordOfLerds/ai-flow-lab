---
type: brief
task_id: T-0035
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

T-0035 Implementation Brief

Goal

Restore the skin system as a user-facing product feature with the smallest safe patch.

This task exists because the current game still contains skin configuration, selected-skin state, CSS hooks, and skin-bonus usage, but the visible skin-selection UI and part of the skin-specific rendering path were removed. The goal is to restore:
	•	skin selection from the main menu
	•	visibly distinct player rendering for the selected skin
	•	continued use of the existing skin bonus behavior already present in gameplay code

Resolve the main contradictions explicitly:
	•	Do not treat skins as optional unless the product docs clearly say otherwise. The provided review says DOMAIN_MODEL.md documents skins as a core feature, so this task should restore them rather than treat them as speculative.
	•	Do not assume the old function name drawPlayer() still exists. Use the current rendering entry point in the codebase (renderPlayer() / makePlayerSprite() or equivalent) and restore skin-variant rendering there.
	•	Do not broaden this into a full menu-system rewrite; restore only the menu behavior needed for skin selection and normal game start.

Scope

In scope:
	•	Read the product docs first:
	•	docs/ARCHITECTURE.md
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	relevant docs/ADR/ entries if any mention skins, menu phases, or player rendering
	•	Confirm the documented skin feature requirements from product docs and align implementation to them
	•	Restore a main-menu path that allows:
	•	viewing available skins
	•	selecting a valid skin
	•	returning to normal start flow
	•	Reuse the existing SKINS configuration and existing skin-related CSS classes where possible
	•	Restore visibly distinct player rendering based on the selected skin using the current active render path
	•	Preserve and keep compatible the existing skin-bonus usage already present in gameplay logic
	•	Add minimal state validation for skin selection integrity:
	•	invalid selected index falls back safely to default skin
	•	missing/invalid skin object does not crash rendering or menu flow
	•	If docs and code materially disagree, record that conflict in ai/current-state/drift-register.md

Out of scope:
	•	Full redesign of the menu system
	•	Broad render-pipeline rewrites
	•	New skin content, new bonuses, or new unlock rules
	•	New persistence behavior unless already defined by docs and already partially implemented
	•	Broad progression, XP, skill, HUD, or auth changes
	•	Cleanup of unrelated regressions introduced by earlier tasks

Constraints
	•	Read first, edit second.
	•	Keep the patch tightly scoped to restoring the removed skin feature.
	•	Treat docs as primary truth.
	•	Since the product docs reportedly define skins as a core feature, restore them directly; do not block on unnecessary “maybe-docs-don’t-support-it” conditionality.
	•	Do not invent new business rules for:
	•	unlock thresholds
	•	persistence across sessions
	•	menu hierarchy
	•	bonus semantics
	•	Use the current code structure where possible:
	•	current menu/content flow
	•	current game state object
	•	current rendering function names
	•	Do not rely on the obsolete function name drawPlayer() if the current runtime uses another rendering path.
	•	If restoring the old showMainMenu() literally would require broad menu rollback, recreate only the minimum equivalent behavior needed in the current structure.
	•	Validate gs.selectedSkin and fall back safely to a default valid skin when needed.
	•	If code and docs disagree, do not silently choose one; record drift explicitly.

File targets

Primary expected target:
	•	index.html

Conditional target only if a real doc/code conflict is found:
	•	ai/current-state/drift-register.md

Do not edit unless a discovered contradiction truly requires it:
	•	docs/ARCHITECTURE.md
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ADR/*

Tests required
	•	Verify product docs were reviewed before editing.
	•	Reproduce the current regression:
	•	skin selection UI missing from main menu
	•	selected skin not fully reflected in player visuals
	•	Verify after the fix:
	•	main menu exposes skin selection UI
	•	available skins are rendered from existing skin config
	•	selecting a skin updates selected state correctly
	•	invalid skin selection state falls back safely to default skin
	•	player appearance visibly changes for different skins during gameplay
	•	existing skin bonuses still apply as currently implemented
	•	normal “Start Game” flow still works
	•	Verify no crash or broken menu flow when:
	•	gs.selectedSkin is out of bounds
	•	a skin entry is malformed or unavailable
	•	If docs define lock/unlock behavior, verify locked skins are displayed/enforced accordingly.
	•	Perform a regression check that current gameplay still launches and runs after the menu/skin restoration.

Chosen minimal policy

Use the narrowest safe restoration policy:
	•	Treat skins as an already-supported product feature that was regressed.
	•	Restore only the missing user-facing skin selection and current render-path skin variation.
	•	Use the existing SKINS data, selected-skin state, and CSS hooks instead of inventing replacements.
	•	Restore showMainMenu() only if that is the smallest way to recover the menu behavior; otherwise implement an equivalent minimal menu builder in the current structure.
	•	Use the current active player render path, not necessarily the old drawPlayer() name.
	•	Add small defensive validation for invalid skin selection state, defaulting to the base skin when necessary.

Risks
	•	The current menu system may have diverged enough that literally restoring old showMainMenu() behavior could overwrite newer fixes.
	•	Skin UI may depend on documented phase/state behavior such as SKIN_SELECT; if that phase is only partially present, the executor may need a minimal compatibility solution rather than a full phase restoration.
	•	Existing bonus logic may assume valid skin state; restoring UI without validating selected skin could produce runtime errors.
	•	The current render path may only partially support skin distinction, so visual differentiation may require modest but careful changes to renderPlayer() / makePlayerSprite().
	•	If docs and code disagree about unlock behavior or persistence, the executor must stop short of inventing missing rules.

Explicit non-goals
	•	Do not redesign the entire main menu.
	•	Do not rebuild the full historical skin system beyond what is necessary to restore documented behavior.
	•	Do not invent new skin unlock criteria, persistence rules, or bonus types.
	•	Do not migrate skin logic into new files or a new architecture unless absolutely necessary.
	•	Do not modify unrelated gameplay systems except where needed to preserve already-existing skin bonuses.
	•	Do not perform a broad cleanup of render or menu code outside the skin restoration path.

## Related Documents
- [[ai/specs/T-0035_spec.md|T-0035 spec]]
- [[ai/reviews/T-0035_gemini_review.md|T-0035 review]]
- [[ai/results/T-0035_executor_report.md|T-0035 result]]
