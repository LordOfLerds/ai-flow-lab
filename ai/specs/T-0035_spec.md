---
type: spec
task_id: T-0035
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

T-0035 Spec

Task metadata
	•	task_id: T-0035
	•	title: Restore skin system (showMainMenu, drawPlayer skin variants)
	•	lane_type: bug-lane
	•	executor: claude

Problem statement

The current index.html contains a SKINS definition with multiple skin entries and skin-specific bonuses, but the visible skin system has been partially removed from runtime behavior:
	•	the main menu no longer exposes a skin selection UI
	•	the current menu initialization is reduced to a single Start Game button in menuContent
	•	player rendering no longer appears to include the previously richer skin-variant drawing path described in the task description
	•	the task description states that T-0027 rewrote render() and removed showMainMenu() plus skin-related drawing code

This creates a mismatch between configured gameplay/UI concepts and currently reachable behavior. The game still carries skin data (SKINS, gs.selectedSkin, player skin, skin bonuses), but the user-facing selection flow and at least part of the visual differentiation logic were removed.

Because docs are the primary truth, the executor must first verify whether the product docs define skins as a supported product feature, and whether the current code is behind those docs or the docs are stale. If code and docs disagree, that uncertainty must be stated explicitly and any actual conflict must be recorded in ai/current-state/drift-register.md.

Source of truth

Primary product source-of-truth order per AGENTS.md and CLAUDE.md:
	1.	docs/DOMAIN_MODEL.md
	2.	docs/INVARIANTS.md
	3.	docs/ARCHITECTURE.md
	4.	docs/ADR/

Because this is work on the product being built, the executor should consult the product docs first. CLAUDE.md also says that when working on the product, Claude must read:
	•	docs/ARCHITECTURE.md
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md

Relevant code evidence from the provided context:
	•	SKINS exists and contains:
	•	id
	•	name
	•	colors
	•	level
	•	bonus
	•	bonusDesc
	•	gs.selectedSkin exists in game state
	•	createPlayer() assigns skin: skin
	•	gameplay code still uses skin bonuses, e.g.:
	•	speed
	•	jump
	•	shield_dur
	•	menu initialization is currently minimal:
	•	menuContent.innerHTML = '<div class="btn" onclick="startGame()">Start Game</div>';
	•	render() in MENU phase currently draws menu text directly to canvas instead of driving a richer menu flow through a dedicated menu builder
	•	the CSS still contains skin-specific UI classes:
	•	.skin-grid
	•	.skin-card
	•	.skin-card.selected
	•	.skin-card.locked

This strongly suggests the skin UI feature existed conceptually and still has styling and data scaffolding, but the executor must confirm against docs before treating it as required behavior rather than dead/stale code.

Desired behavior

If the product docs define skins as an active user-facing feature, the bug fix should restore that feature with minimal scope.

Expected behavior:
	1.	Main menu skin selection is available again
	•	The main menu should provide a way to view/select skins.
	•	A dedicated menu builder such as showMainMenu() may be restored or recreated if that is the minimal way to recover the feature.
	•	The user should be able to see available skins and select one valid skin for the current session.
	2.	Skin UI respects configured skin metadata
	•	The UI should derive from the existing skin configuration rather than inventing new skin rules.
	•	Skin labels, lock state, and any displayed bonus text should come from the configured fields that already exist, if those fields are part of the documented feature.
	•	Locked/unlocked handling must follow product docs and current invariants, not newly invented rules.
	3.	Selected skin affects player rendering again
	•	Player rendering should visibly vary by selected skin.
	•	drawPlayer() or the current equivalent rendering path should reflect the chosen skin variant.
	•	Skin-specific visuals should be applied consistently in normal gameplay rendering.
	4.	Existing skin-dependent gameplay behavior remains intact
	•	Existing bonus logic tied to selected skins must continue to function.
	•	The fix should not regress current runtime behavior that already depends on gs.selectedSkin and player.skin.
	5.	Main menu and skin selection remain part of one runtime surface
	•	index.html remains the primary runtime/UI surface.
	•	No new parallel runtime or duplicated skin logic should be introduced elsewhere.

If docs do not define skins as an active feature, the executor should stop short of inventing behavior and instead report the mismatch clearly, recording drift if appropriate.

Constraints
	•	Read the product truth docs first before making changes.
	•	Keep the patch tightly scoped to restoring the skin system behavior described in the task:
	•	main menu skin selection UI
	•	player skin variant rendering
	•	Do not perform a broad rewrite of the full menu system or render pipeline unless strictly necessary to restore the removed behavior.
	•	Do not invent new business rules for:
	•	unlock progression
	•	bonus values
	•	persistence semantics
	•	menu flow
	•	Reuse the existing SKINS config, state fields, and CSS hooks where possible.
	•	Avoid duplicating skin data or maintaining separate competing menu/render paths.
	•	Preserve current gameplay systems outside this bug scope:
	•	HUD
	•	enemies
	•	level generation
	•	auth integration
	•	unrelated menu behavior
	•	If docs and tested code disagree, do not silently choose one; record the conflict in ai/current-state/drift-register.md.

Acceptance criteria
	•	The executor reviewed the relevant product docs before implementing:
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ARCHITECTURE.md
	•	relevant docs/ADR/ entries if present
	•	The root cause is described in the execution report as removal/regression of the skin UI and/or skin rendering behavior, rather than a generic menu bug.
	•	The main menu once again exposes skin selection UI, if that feature is defined by the docs.
	•	The skin UI is driven from the existing skin configuration rather than hard-coded duplicated values.
	•	Selecting a skin changes the player’s rendered appearance in gameplay.
	•	Existing skin-related bonus logic continues to function after the fix.
	•	The main menu still allows starting the game normally.
	•	No second runtime surface or duplicated skin system is introduced.
	•	If the executor finds that docs do not support the feature currently present in config/code, that mismatch is explicitly reported and drift is documented if needed.

Risks
	•	The docs may be stale or incomplete relative to the current code, so it is possible the SKINS array is ahead of documented behavior.
	•	Restoring showMainMenu() too literally may unintentionally overwrite newer menu fixes if it reintroduces removed assumptions.
	•	Skin selection may have implicit dependencies on unlock progression, XP, or level state; careless restoration could invent or break rules around locked skins.
	•	Player rendering currently goes through renderPlayer() and makePlayerSprite(...); the task description mentions drawPlayer(), which may reflect older naming. The executor should verify the actual current rendering entry point rather than assume the old function name still exists.
	•	There may be persistence expectations for selected skin not visible in the provided snippet; those should not be invented if docs do not define them.

Open questions
	•	Do the product docs explicitly define skins as an active user-facing feature, or is the current skin config partially stale?
	•	Is showMainMenu() expected by docs, or is it merely one previous implementation detail that can be restored only if it is the smallest safe fix?
	•	What are the documented unlock rules for skins, if any, and are they still supposed to be enforced in the menu UI?
	•	Should selected skin persist across sessions, or only across a single runtime session, according to docs?
	•	Does “drawPlayer() skin variant rendering” correspond to the current renderPlayer() / makePlayerSprite() path, or is there another intended rendering function still present elsewhere in the repo?

## Related Documents
- [[ai/reviews/T-0035_gemini_review.md|T-0035 review]]
- [[ai/briefs/T-0035_implementation.md|T-0035 document]]
- [[ai/results/T-0035_executor_report.md|T-0035 result]]
