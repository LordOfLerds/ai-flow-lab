T-0025 Implementation Brief

Goal

Fix the bug where calling the game via the supported game entry path shows the title but no visible start/menu buttons.

Resolve the core contradiction explicitly:
	•	game.html is architecturally a compatibility redirect surface, not a second runtime UI.
	•	Therefore, the safe bug target is not “build buttons into game.html”.
	•	The fix should instead ensure that users entering through the supported game path end up with the same fully usable start UI that index.html is supposed to render.

Working hypothesis for execution:
	•	Treat this primarily as a start-menu initialization/rendering bug after entry/redirect, unless investigation proves the redirect itself is failing.

Scope

In scope:
	•	Read the truth docs first:
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ARCHITECTURE.md
	•	relevant docs/ADR/
	•	Reproduce the issue concretely for the affected entry path:
	•	game.html
	•	and /game only if truth docs or repo behavior clearly establish it as supported
	•	Determine which of these is actually failing:
	1.	redirect/entry routing into index.html
	2.	menu initialization on index.html
	3.	auth/session-dependent gating that suppresses menu buttons
	4.	timing/order-of-execution bug that leaves #menu-content empty
	•	Apply the smallest safe fix so the supported game entry path yields the same visible, interactive start UI as the normal main entry path.
	•	If docs and tested code materially disagree about supported entry paths or expected start-state behavior, record the conflict in ai/current-state/drift-register.md.

Out of scope:
	•	Building a second standalone start UI in game.html
	•	Broad refactors of overlay, auth, HUD, skills, XP, or gameplay systems
	•	Broad routing/deployment redesign
	•	Inventing new requirements for /game if not already supported in docs or repo behavior
	•	UI redesign or menu feature expansion beyond restoring missing start/menu buttons

Constraints
	•	Read first, edit second.
	•	Keep the patch minimal and bug-focused.
	•	Treat docs as primary truth; if code appears ahead of docs, state uncertainty explicitly.
	•	Do not silently reconcile doc/code drift; use ai/current-state/drift-register.md if needed.
	•	game.html must remain a compatibility redirect surface if that is what the docs define.
	•	Do not duplicate menu/UI logic across both index.html and game.html.
	•	Prefer fixing the actual initialization path that populates #menu-content over adding fallback UI in the wrong layer.
	•	Consider auth/session initialization only as far as needed to explain missing start buttons.
	•	Preserve existing direct-entry behavior for index.html.

File targets

Primary likely targets:
	•	index.html

Conditional target only if investigation proves it is the minimal correct fix:
	•	game.html

Conditional documentation target only if a real conflict is found:
	•	ai/current-state/drift-register.md

Do not edit unless truly required by a discovered contradiction:
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ARCHITECTURE.md
	•	docs/ADR/*

Tests required
	•	Reproduce the reported bug on the affected supported entry path and document exact observations.
	•	Verify which path is actually supported per truth docs: game.html, /game, or only redirect into index.html.
	•	Verify after the fix:
	•	the title is visible
	•	start/menu buttons are visible
	•	buttons are interactive/usable
	•	#menu-content is not left empty in the affected start state
	•	Verify direct access to index.html still behaves correctly.
	•	Run relevant existing smoke/headless checks for entry-point Start UI behavior if available.
	•	If no existing automated test fully covers the bug, perform and report a manual verification for both:
	•	direct main entry
	•	affected game entry path

Chosen minimal policy

Use the narrowest safe bug-fix policy:
	•	Assume game.html is a redirect compatibility entry point, not a second app surface.
	•	First verify whether the redirect lands correctly in index.html.
	•	If it does, focus on why the index.html start menu fails to populate or render when entered via that path.
	•	Only touch game.html if investigation shows the redirect behavior itself prevents correct initialization.
	•	Do not treat /game as guaranteed unless the truth docs or repo behavior clearly establish it.

Risks
	•	The bug may look like a redirect issue but actually be caused by index.html initialization timing or auth-dependent menu population.
	•	auth-state.js suggests start UI visibility may be influenced by session state; a superficial fix could hide the real cause.
	•	The redirect code references /game, but that may not mean the route is officially supported in all environments.
	•	A quick fix in game.html could violate the documented architecture by creating a second UI surface.
	•	Existing tests may assert only partial visibility and miss the empty #menu-content case.

Explicit non-goals
	•	Do not create or maintain a separate start/menu UI in game.html.
	•	Do not redesign the start screen.
	•	Do not broaden the task into auth feature work unless directly necessary to restore button visibility.
	•	Do not add unrelated HUD, gameplay, or overlay enhancements.
	•	Do not add new product rules about login requirements, /game support, or redirect permanence.
	•	Do not perform a broad cleanup of entry-point architecture or documentation unless a real blocking inconsistency is found.