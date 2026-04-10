T-0052 Implementation Brief

Goal

Add a pause feature to the primary gameplay runtime so that pressing Escape during the PLAYING state opens a pause overlay with exactly three actions:
	•	Resume
	•	Restart Level
	•	Quit to Menu

Resolve the main contradiction explicitly:
	•	game.html is only a redirect compatibility entry point and must not host pause UI.
	•	The pause feature belongs in the primary runtime surface and should integrate into the existing phase/overlay system rather than creating a second menu stack.

Functional target:
	•	pausing must freeze gameplay progression
	•	pausing must stop the relevant in-run timer(s)
	•	resume/restart/quit must reuse existing runtime flows where possible

Scope

In scope:
	•	inspect the current gameplay runtime and identify:
	•	the active PLAYING phase/state
	•	current Escape handling
	•	current overlay/menu ownership
	•	the timer(s) that govern elapsed run/level progression
	•	the existing restart-level path
	•	the existing return-to-menu path
	•	add a paused state or equivalent pause flag only if needed for minimal safe integration
	•	add a visible pause overlay with exactly:
	•	Resume
	•	Restart Level
	•	Quit to Menu
	•	ensure Escape during PLAYING opens pause
	•	ensure Escape while pause overlay is already open acts as Resume, unless the current documented phase model requires a different existing mechanism
	•	ensure gameplay/world updates stop while paused
	•	ensure relevant in-run timer(s) stop advancing while paused
	•	ensure Resume returns to the same run
	•	ensure Restart Level reuses the current level reset path
	•	ensure Quit to Menu reuses the current main-menu return path

Out of scope:
	•	any changes to game.html
	•	broad refactors of the game loop, state model, or overlay architecture
	•	new pause options beyond the three requested
	•	new save/autosave behavior on pause
	•	checkpoint systems
	•	reward/progression redesign on restart or quit
	•	pause support for non-PLAYING states unless already documented and trivially required by current code

Constraints
	•	Use the spec and review as authoritative input; do not reopen scope based on unrelated architecture cleanup.
	•	Keep the patch minimal and feature-focused.
	•	Treat pause as a runtime overlay/state integration task, not a redesign of menu navigation.
	•	Reuse current restart and quit-to-menu flows; do not invent parallel reset/menu logic.
	•	If current code separates multiple timers, freeze the progression-impacting ones needed to satisfy the requested pause behavior; do not freeze unrelated systems unless necessary.
	•	Respect existing Escape behavior:
	•	pause should only open from PLAYING
	•	if another active non-pause overlay already has Escape semantics, resolve that conflict conservatively and document the actual rule used
	•	If product docs and code materially disagree on pause/state semantics, record the conflict in ai/current-state/drift-register.md rather than silently choosing one.
	•	Do not modify unrelated systems such as auth, skins, skills, shop, battle pass, or death flow except where strictly required to avoid pause regressions.

File targets

Primary likely target:
	•	index.html

Conditional documentation target only if a real doc/code conflict is found:
	•	ai/current-state/drift-register.md

Do not edit unless investigation proves it is strictly required:
	•	docs/ARCHITECTURE.md
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ADR/*
	•	game.html

Tests required
	•	Reproduce and document the current Escape/input behavior before making changes.
	•	Identify and document:
	•	the PLAYING integration point
	•	the pause overlay integration point
	•	the timer/update systems that must freeze
	•	the current restart-level path
	•	the current quit-to-menu path
	•	Verify after the fix:
	•	pressing Escape during PLAYING opens the pause overlay
	•	the pause overlay shows exactly Resume, Restart Level, and Quit to Menu
	•	gameplay/world updates do not continue while paused
	•	the relevant in-run timer(s) do not advance while paused
	•	Resume closes pause and continues the same run
	•	Restart Level resets the current run/level correctly
	•	Quit to Menu returns to the existing main menu correctly
	•	Verify negative behavior:
	•	pressing Escape does not open pause from non-PLAYING states unless current documented behavior explicitly says otherwise
	•	pressing Escape while already paused resumes play, if this does not conflict with existing documented phase behavior
	•	Verify no regression in direct runtime entry and entry via game.html redirect into the runtime.
	•	Verify existing non-pause overlays/states still behave correctly, especially any current Escape-driven navigation.
	•	If no automated coverage exists for pause, provide explicit manual verification steps and results in the execution report.

Chosen minimal policy

Use the narrowest safe integration policy:
	•	Treat pause as a PLAYING-only runtime feature.
	•	Add or reuse one paused phase/state/flag in the existing runtime rather than building a separate menu system.
	•	Reuse the existing overlay container/mechanism if available.
	•	Freeze gameplay by preventing progression-impacting update paths and timer advancement while paused.
	•	Do not freeze unrelated behavior unless that is necessary to guarantee correct paused gameplay semantics.
	•	Reuse existing restart and menu-return flows instead of inventing new ones.
	•	If another non-pause overlay already owns Escape during gameplay, preserve input priority conservatively and document the exact resulting behavior.
	•	game.html remains a redirect compatibility page only.

Risks
	•	Escape may already be bound to submenu or overlay behavior, causing input-priority conflicts.
	•	“Freeze the game loop timer” may map to several runtime counters rather than one timer.
	•	Restart Level and Quit to Menu may have hidden persistence/progression side effects if current flows are reused without careful inspection.
	•	If the current runtime lacks a clear paused phase, even a minimal pause feature may require touching several state-transition points.
	•	Overlay ownership may already be fragmented, which could cause visual/input conflicts if pause is added in the wrong layer.

Explicit non-goals
	•	Do not add settings, controls help, save/load, or audio options to the pause menu.
	•	Do not redesign the existing menu system.
	•	Do not create pause UI in game.html.
	•	Do not add new persistence semantics for pause, restart, or quit.
	•	Do not add support for pausing from menu, death, login, shop, battle pass, or other non-PLAYING states unless already required by current documented behavior.
	•	Do not perform broad cleanup of unrelated input, transition, or overlay systems unless a narrowly scoped safety fix is required for pause to work correctly.