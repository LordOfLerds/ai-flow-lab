---
type: spec
task_id: T-0053
created: 2026-04-10
tags: [ai-flow-lab, spec]
---

T-0053 Spec

Task metadata
	•	task_id: T-0053
	•	title: Fix HUD overlapping game elements on small screens
	•	lane_type: bug-lane
	•	executor: claude

Problem statement

The reported bug is that on screens narrower than 600px, the in-game HUD overlaps gameplay content. The task description specifically names score, health bar, and skill icons, and asks for a responsive fix that scales HUD font sizes and icon sizes proportionally to canvas width while preserving minimum padding between HUD elements.

From the provided context, game.html is only a redirect compatibility entry point and does not host the gameplay UI. Therefore, the bug belongs to the primary runtime surface, which must be verified in the actual product code (likely index.html or its current equivalent).

There is an important uncertainty in the provided context: the current snippet does not include the gameplay runtime file that actually defines the HUD. As a result, the executor must inspect the real runtime code and the product docs before deciding:
	•	which HUD elements are actually present now,
	•	whether “health bar” and “skill icons” are currently live HUD elements or stale terminology from earlier iterations,
	•	whether the HUD is DOM-based, canvas-based, or mixed,
	•	whether HUD overlap comes from fixed sizes, fixed gaps, insufficient wrapping behavior, missing viewport handling, or multiple causes.

Because docs are the primary truth, the executor must first confirm how the HUD, responsive behavior, and gameplay overlays are documented in the product docs. If the code is ahead of docs or the docs are stale/incomplete, that uncertainty must be stated explicitly. If there is a real doc/code conflict, it must be recorded in ai/current-state/drift-register.md.

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

Relevant evidence from the provided input:
	•	game.html is only a redirect compatibility surface and should not host HUD behavior.
	•	The bug report is specifically about screens narrower than 600px.
	•	The requested fix direction is responsive scaling:
	•	scale HUD font sizes proportionally to canvas width,
	•	scale HUD icon sizes proportionally to canvas width,
	•	add minimum padding between HUD elements.
	•	The actual gameplay runtime file containing the HUD was not provided here, so implementation details such as current HUD structure, CSS/layout ownership, and responsive behavior must be verified from the real runtime code before changes are made.

Because the current gameplay source is not shown, the executor must derive the concrete integration points from the actual runtime code rather than assuming a specific HUD implementation.

Desired behavior

If the product docs support the current HUD as an active gameplay UI feature, the bug fix should restore readable, non-overlapping HUD behavior on narrow screens with minimal scope.

Expected behavior:
	1.	Narrow-screen responsive HUD behavior

	•	On screens narrower than 600px, the HUD should adapt so that it no longer visibly overlaps gameplay content due to oversized text, icons, or insufficient spacing.
	•	The requested responsive behavior should be implemented through proportional scaling tied to runtime width/canvas width, if that matches the documented/current architecture.

	2.	Responsive font and icon scaling

	•	HUD text should scale down proportionally on narrow screens.
	•	HUD icons should scale down proportionally on narrow screens.
	•	Scaling should remain bounded so the HUD stays readable and does not collapse into unusably small UI.

	3.	Minimum spacing between HUD elements

	•	Adjacent HUD elements should preserve a minimum padding/gap even after scaling.
	•	The fix should avoid crowding where scaled-down elements still visually collide or become unreadable.

	4.	Preserve gameplay visibility

	•	The HUD should remain legible without obscuring core gameplay content more than the documented/current HUD design intends.
	•	The fix should reduce overlap problems on narrow screens without breaking desktop/default layout.

	5.	Preserve current HUD semantics

	•	The patch should preserve the existing HUD contents and meaning.
	•	If the runtime HUD does not currently include one of the elements named in the task description (for example a health bar or skill icons), the executor must not invent a new HUD system just to satisfy wording from the ticket. Instead, the executor should fix the actual current HUD elements and report the mismatch explicitly.

	6.	Runtime ownership remains singular

	•	The HUD fix belongs to the primary gameplay runtime surface only.
	•	No duplicate HUD implementation should be introduced in game.html or any secondary entry surface.

If docs do not define the requested responsive behavior clearly, the executor should not invent product rules silently. Instead, the executor should report the ambiguity and document drift if appropriate.

Constraints
	•	Read the product truth docs first before changing code.
	•	Keep the patch tightly scoped to the HUD overlap bug on narrow screens.
	•	Focus only on responsive HUD layout/scaling behavior:
	•	narrow-screen scaling of HUD text,
	•	narrow-screen scaling of HUD icons,
	•	minimum spacing/padding between HUD items,
	•	prevention of overlap caused by the current HUD sizing/layout.
	•	Do not perform a broad rewrite of the overall HUD system, gameplay rendering architecture, or full responsive layout unless strictly necessary to fix this bug safely.
	•	Do not invent new business rules for:
	•	which HUD elements exist,
	•	health/skill mechanics,
	•	breakpoint strategy beyond what current code/docs support,
	•	mobile control schemes,
	•	new HUD sections not already present in the runtime.
	•	Reuse the existing HUD ownership and layout mechanism where possible, whether CSS-based, canvas-based, or mixed.
	•	Preserve unrelated systems outside this bug scope:
	•	authentication,
	•	skins,
	•	skills,
	•	pause/menu systems,
	•	shop/battle-pass systems,
	•	gameplay rules,
	•	death/level-complete flows.
	•	game.html remains a redirect compatibility surface unless docs explicitly say otherwise.
	•	If docs and tested code disagree, do not silently choose one; record the conflict in ai/current-state/drift-register.md.

Acceptance criteria
	•	The executor reviewed the relevant product docs before implementation:
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ARCHITECTURE.md
	•	relevant docs/ADR/ entries if present
	•	The execution report identifies the actual runtime integration points for:
	•	HUD ownership,
	•	responsive sizing/layout behavior,
	•	width/canvas-based scaling inputs,
	•	any currently active HUD elements affected by the bug.
	•	On screens narrower than 600px, the HUD no longer exhibits the reported overlap problem caused by oversized text/icons or insufficient spacing.
	•	HUD font sizes scale responsively on narrow screens.
	•	HUD icon sizes scale responsively on narrow screens.
	•	A minimum spacing/padding between HUD elements is preserved on narrow screens.
	•	The default/non-narrow layout remains functional and is not regressed.
	•	The fix is applied in the primary gameplay runtime surface and does not introduce a duplicate HUD implementation elsewhere.
	•	If the executor finds that the current runtime HUD differs from the task wording (for example, missing health bar or skill icons), that mismatch is explicitly reported and drift is documented if needed.
	•	Existing gameplay entry via the main runtime surface, and redirect entry via game.html, continue to function correctly after the fix.

Risks
	•	The actual HUD implementation is not shown in the provided context, so the bug may stem from DOM layout, canvas rendering, mixed layering, or multiple combined causes.
	•	The task wording names specific HUD elements that may no longer exist exactly as described in the current runtime, which creates a risk of implementing against stale terminology instead of the live UI.
	•	Scaling text and icons alone may not fully solve overlap if the underlying issue is container layout, wrapping, fixed positioning, or canvas-to-DOM mismatch.
	•	A purely proportional scaling rule can make the HUD too small to read on very narrow screens unless bounded carefully.
	•	If the HUD is partly canvas-rendered and partly DOM-rendered, responsive behavior may need to be coordinated across both systems, increasing integration risk.
	•	Existing overlays, pause/menu systems, or top-of-screen UI layers may already share space with the HUD and could interact with the responsive fix.

Open questions
	•	In the current runtime, which HUD elements are actually present and active on gameplay screens: score, health bar, skill icons, or a different set?
	•	Is the HUD currently implemented in DOM, canvas, or a mixed system?
	•	What runtime width should drive the requested proportional scaling: CSS viewport width, canvas width, container width, or another documented/current source?
	•	Is the overlap caused primarily by fixed font/icon sizes, insufficient inter-item spacing, no wrapping behavior, or an interaction between multiple top-layer UI systems?
	•	Do the product docs already define responsive HUD behavior or small-screen layout rules, or is the current runtime ahead of documentation on this point?

## Related Documents
- [[ai/reviews/T-0053_gemini_review.md|T-0053 review]]
- [[ai/briefs/T-0053_implementation.md|T-0053 document]]
- [[ai/results/T-0053_executor_report.md|T-0053 result]]
- [[ai/followups/T-0053_followups.md|T-0053 followup]]
