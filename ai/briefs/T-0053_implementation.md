---
type: brief
task_id: T-0053
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

T-0053 Implementation Brief

Goal

Fix the small-screen HUD overlap bug in the primary gameplay runtime so that on screens narrower than 600px the active HUD remains readable and no longer collides visually due to oversized text, icons, or insufficient spacing.

Resolve the main contradiction explicitly:
	•	The ticket asks for scaling “proportionally to canvas width,” but the spec correctly identifies that the actual scaling reference must be verified from the live runtime.
	•	Therefore, do not assume canvas width blindly.
	•	First identify the real HUD ownership and layout driver in the current runtime, then apply the smallest responsive fix that matches that implementation.
	•	game.html remains only a redirect compatibility surface and is not a HUD implementation target.

Functional target:
	•	narrow-screen HUD text scales down appropriately,
	•	narrow-screen HUD icons scale down appropriately,
	•	minimum spacing between HUD items is preserved,
	•	desktop/default layout is not regressed.

Scope

In scope:
	•	inspect the current gameplay runtime and identify:
	•	where the active gameplay HUD is implemented,
	•	which HUD elements are actually present now,
	•	whether the HUD is DOM-based, canvas-based, or mixed,
	•	what width/input currently governs layout sizing,
	•	the actual cause of overlap on sub-600px screens.
	•	implement the smallest safe responsive fix for the live HUD elements only.
	•	add narrow-screen responsive behavior limited to:
	•	HUD font-size scaling,
	•	HUD icon-size scaling,
	•	minimum spacing/padding/gap preservation,
	•	any tightly related layout adjustment required to stop the overlap.
	•	use the actual runtime width reference that fits the existing implementation, even if that turns out not to be literal canvas width.
	•	preserve existing HUD semantics and contents.
	•	report explicitly if the current runtime HUD does not match the task wording (for example, missing health bar or skill icons).

Out of scope:
	•	any changes to game.html
	•	adding new HUD elements that do not currently exist
	•	changing health, skills, scoring, or other gameplay mechanics
	•	broad HUD redesign
	•	broad mobile-layout overhaul
	•	adding touch-control systems
	•	broad responsive work outside the overlapping HUD bug
	•	changes to authentication, menus, pause, shop, battle pass, skins, or level-complete/death logic unless directly required to stop HUD overlap

Constraints
	•	Use the spec and review as authoritative sources; do not re-request project truth files.
	•	Keep the patch tightly scoped to the small-screen HUD overlap bug.
	•	Do not invent business rules for:
	•	which HUD elements should exist,
	•	exact breakpoint behavior beyond the reported <600px problem,
	•	new mobile UX patterns,
	•	new layout modes not required by the current runtime.
	•	Resolve the scaling-reference contradiction by investigation first:
	•	do not hardcode a canvas-width-driven solution unless the runtime actually uses canvas width as the correct sizing reference.
	•	Prefer the simplest fix that solves the overlap:
	•	CSS/media-query adjustment if the HUD is DOM-based,
	•	bounded runtime scaling if the HUD is canvas- or mixed-driven,
	•	minimal spacing/layout correction if scaling alone is insufficient.
	•	Preserve existing non-small-screen behavior.
	•	If docs and tested code materially disagree about HUD behavior, state uncertainty explicitly and document drift in ai/current-state/drift-register.md.

File targets

Primary likely target:
	•	index.html

Conditional target only if the executor finds a separate active gameplay HUD source in the real runtime:
	•	the actual primary runtime file that owns HUD rendering/layout

Conditional documentation target only if a real doc/code conflict is found:
	•	ai/current-state/drift-register.md

Do not edit unless truly required by discovered conflict:
	•	game.html
	•	product docs

Tests required
	•	identify and document the actual HUD implementation surface and affected HUD elements.
	•	reproduce the bug on a screen width below 600px.
	•	verify after the fix on at least:
	•	one narrow viewport below 600px,
	•	one default/non-narrow viewport at or above 600px.
	•	confirm that on narrow screens:
	•	HUD text is scaled down appropriately,
	•	HUD icons are scaled down appropriately,
	•	minimum spacing/gap/padding between items is preserved,
	•	overlap with gameplay elements caused by current HUD sizing/layout is no longer present.
	•	confirm the default/non-narrow HUD layout is not regressed.
	•	confirm the main gameplay entry still works correctly, including redirect entry via game.html to the primary runtime.
	•	if the runtime HUD differs from the ticket wording, report that explicitly in the execution report.
	•	if a doc/code mismatch is found, document it in the drift register.

Chosen minimal policy

Use the narrowest safe bug-fix policy:
	•	treat this as a runtime HUD responsiveness bug, not a redesign task.
	•	first diagnose the real source of overlap:
	•	text/icon size,
	•	spacing,
	•	wrapping,
	•	positioning,
	•	mixed DOM/canvas layering.
	•	then implement the least invasive fix that solves the bug in the existing HUD architecture.
	•	prefer bounded scaling plus minimum spacing preservation.
	•	do not force a universal proportional-scaling system if a simpler small-screen adjustment resolves the bug.
	•	do not add or redefine HUD content based on stale ticket terminology.

Risks
	•	The provided context does not show the actual runtime HUD source, so the implementation surface must be confirmed first.
	•	The task wording may reference HUD elements that no longer exist exactly as named.
	•	Pure proportional scaling may not fully solve the issue if the root cause is layout flow or positioning.
	•	Over-aggressive scaling could make the HUD unreadable on very narrow screens.
	•	If the HUD is mixed DOM/canvas, the fix may require careful coordination across both layers.
	•	Existing top-layer UI systems may share screen space with the HUD and could expose interaction bugs when spacing/sizing changes.

Explicit non-goals
	•	Do not add new HUD sections or indicators.
	•	Do not invent a health bar or skill icons if they are not present in the current runtime.
	•	Do not redesign the entire HUD.
	•	Do not implement a full responsive/mobile framework for the whole game.
	•	Do not change gameplay mechanics, controls, pause behavior, menus, shop, skins, or skills.
	•	Do not modify game.html beyond its existing redirect role.
	•	Do not introduce a second HUD system or parallel rendering path.

## Related Documents
- [[ai/specs/T-0053_spec.md|T-0053 spec]]
- [[ai/reviews/T-0053_gemini_review.md|T-0053 review]]
- [[ai/results/T-0053_executor_report.md|T-0053 result]]
- [[ai/followups/T-0053_followups.md|T-0053 followup]]
