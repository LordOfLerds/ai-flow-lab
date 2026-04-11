---
type: spec
task_id: T-0052
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

T-0052 Spec

Task metadata
	•	task_id: T-0052
	•	title: Add pause menu with resume/restart/quit options
	•	lane_type: feature-lane
	•	executor: claude

Problem statement

The game currently has menu, gameplay, death, and other UI surfaces, but this task requests an in-run pause capability that is triggered from the PLAYING state. The requested behavior is:
	•	pressing Escape during PLAYING opens a pause overlay
	•	the overlay offers Resume, Restart Level, and Quit to Menu
	•	pausing freezes the active game loop timer

From the provided context, game.html is only a compatibility redirect page and does not host runtime gameplay UI, so this feature belongs to the main runtime surface (index.html or whatever the current primary game entry page is per product docs).

There is also a likely interaction risk with existing menu/phase logic:
	•	the game already has multiple phases and overlays
	•	Escape may already be used in some menu/navigation flows in current code
	•	“freeze the game loop timer” can mean either fully stop world updates, stop elapsed level-time counters, or both

Because docs are the primary truth, the executor must first confirm how pause behavior, runtime phases, and overlay ownership are documented in the product docs. If current code is ahead of docs or docs are stale/incomplete, that uncertainty must be stated explicitly. If there is a real doc/code conflict, it must be recorded in ai/current-state/drift-register.md.

Source of truth

Primary product source-of-truth order per AGENTS.md and CLAUDE.md:
	1.	docs/DOMAIN_MODEL.md
	2.	docs/INVARIANTS.md
	3.	docs/ARCHITECTURE.md
	4.	docs/ADR/

Per CLAUDE.md, when working on the product being built, Claude must read:
	•	docs/ARCHITECTURE.md
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md

Relevant code/context evidence from the provided input:
	•	game.html is a redirect compatibility entry point and not the gameplay runtime surface
	•	pause behavior is requested for the PLAYING state specifically
	•	the task explicitly requires three actions in the pause overlay:
	•	Resume
	•	Restart Level
	•	Quit to Menu
	•	the task explicitly requires the game loop timer to freeze while paused

Because no current gameplay source file was provided here beyond game.html, implementation details such as current phase names, overlay structure, timer ownership, and Escape-key bindings must be verified from the actual product code before changes are made.

Desired behavior

If the product docs support pause as an active gameplay feature, restore or add it with minimal scope.

Expected behavior:
	1.	Pause entry from active gameplay
	•	While the game is in the PLAYING state, pressing Escape opens a pause overlay.
	•	Pause should not be triggered from unrelated non-gameplay states unless docs already define that behavior.
	2.	Pause overlay contents
	•	The pause overlay shows exactly the three requested user actions:
	•	Resume
	•	Restart Level
	•	Quit to Menu
	•	The overlay belongs to the primary runtime surface and must not create a second competing menu system.
	3.	Paused runtime behavior
	•	While paused, gameplay progression is frozen.
	•	At minimum, no world/gameplay updates should continue during pause.
	•	The timer behavior must match docs/current invariants; if “timer” refers to level/session elapsed time, that timer must stop advancing while paused.
	4.	Resume behavior
	•	Resume closes the pause overlay and returns to the same gameplay run without resetting the current level state.
	5.	Restart behavior
	•	Restart Level resets the current level/run using the project’s existing restart/start-level path rather than inventing a new reset model.
	•	Restart should not silently alter unrelated persistent progression unless current game rules already do so.
	6.	Quit behavior
	•	Quit to Menu exits the current run and returns to the existing main menu flow.
	•	It should reuse the current menu-entry path rather than introducing a parallel menu state machine.
	7.	Input and UI coherence
	•	Escape-based pausing must coexist safely with any existing Escape behavior in submenus or overlays.
	•	If the docs or current code already use a paused phase/state, that mechanism should be reused instead of creating a duplicate.

If docs do not support part of this requested behavior, the executor should not invent missing product rules. Instead, the executor should report the mismatch clearly and document drift if appropriate.

Constraints
	•	Read the product truth docs first before changing code.
	•	Keep the patch tightly scoped to pause behavior:
	•	entering pause from PLAYING
	•	pause overlay UI
	•	Resume / Restart Level / Quit to Menu actions
	•	freezing in-run timer/world updates while paused
	•	Do not perform a broad rewrite of the game loop, menu architecture, or overlay system unless strictly necessary to support pause safely.
	•	Do not invent new business rules for:
	•	autosave-on-pause
	•	reward handling while quitting from pause
	•	checkpoint semantics
	•	timer semantics beyond what docs/current invariants support
	•	additional pause options beyond the three requested
	•	Reuse current phase/state, overlay, restart, and menu-return mechanisms where possible.
	•	Avoid introducing duplicate pause logic in multiple entry surfaces; game.html remains a redirect compatibility surface unless docs say otherwise.
	•	Preserve unrelated gameplay systems outside this feature scope:
	•	authentication
	•	skins
	•	skills
	•	shop/battle-pass systems
	•	death screen behavior
	•	unrelated transitions/polish
	•	If docs and tested code disagree, do not silently choose one; record the conflict in ai/current-state/drift-register.md.

Acceptance criteria
	•	The executor reviewed the relevant product docs before implementation:
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ARCHITECTURE.md
	•	relevant docs/ADR/ entries if present
	•	The execution report identifies the actual runtime integration points for:
	•	PLAYING state
	•	overlay/pause UI
	•	timer ownership
	•	restart/menu return paths
	•	Pressing Escape during PLAYING opens a visible pause overlay.
	•	The pause overlay exposes exactly these user actions:
	•	Resume
	•	Restart Level
	•	Quit to Menu
	•	While paused, gameplay progression is frozen and the in-run timer does not continue advancing, if that timer exists in the documented/current runtime.
	•	Resume returns to the same run without resetting the level.
	•	Restart Level resets the current level/run correctly.
	•	Quit to Menu returns to the existing main menu flow correctly.
	•	The feature does not break direct gameplay entry via the main runtime surface or the redirect entry via game.html.
	•	Existing non-pause overlays/states continue to behave correctly, or the executor reports any unavoidable interaction explicitly.
	•	If the executor finds that current docs do not define pause semantics clearly enough, that uncertainty is stated explicitly and drift is documented if needed.

Risks
	•	The current runtime may already use Escape for other overlay/navigation behavior, which could create input conflicts.
	•	“Freeze the game loop timer” may be ambiguous if the code separates world updates, animation timing, elapsed level time, and UI timers.
	•	Restart Level and Quit to Menu may touch persistence or progression systems indirectly; careless implementation could invent reset/save behavior not defined by docs.
	•	If pause is added by branching around updates in the loop, some visual or UI timers may still continue unless they are explicitly governed by the same paused state.
	•	Existing transition/polish systems may interfere with pause overlay ownership if they already manage overlay visibility centrally.

Open questions
	•	Do the product docs already define a dedicated paused phase/state, or must pause be integrated into the existing phase model?
	•	In current code, what exactly counts as the “game loop timer”: elapsed level time, frame-based progression, animation counters, or multiple timers?
	•	Is Escape already assigned to submenu/back-navigation behavior during gameplay-adjacent overlays?
	•	Should Restart Level from pause reuse the same restart path as death/retry, or is there a separate documented current-level reset path?
	•	When quitting from a paused run, do docs define any required persistence/update behavior before returning to menu, or should the executor preserve existing quit/menu semantics only?

## Related Documents
- [[ai/reviews/T-0052_gemini_review.md|T-0052 review]]
- [[ai/briefs/T-0052_implementation.md|T-0052 document]]
- [[ai/results/T-0052_executor_report.md|T-0052 result]]
- [[ai/followups/T-0052_followups.md|T-0052 followup]]
- [[ai/pr/T-0052_pr_draft.md|T-0052 pr-draft]]
