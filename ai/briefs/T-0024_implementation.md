---
type: brief
task_id: T-0024
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

T-0024 Implementation Brief

Goal

Make a minimal, source-of-truth-first update to docs/ARCHITECTURE.md so it reflects the current browser entry-point model and the narrow T-0018 behavior relevant to entry surfaces:
	•	index.html is the primary runtime page.
	•	game.html is a compatibility redirect page that forwards to index.html.
	•	game.html is not a separate runtime/application surface.

Resolve the main contradiction explicitly:
	•	The task title mentions “actual entry points and T-0018 behavior,” but the only safely evidenced entry-point behavior in the supplied code is game.html forwarding to index.html.
	•	Do not generalize that into broader guarantees about /game, legacy support duration, query-string handling, deep linking, SEO intent, or a separate “dashboard” architecture unless those are already established in the source-of-truth docs.
	•	Do not expand this task into unrelated architecture cleanup for automation-pipeline/App Mode/Gemini routing inconsistencies unless those are already present in docs/ARCHITECTURE.md and must be touched for coherence.

Scope

In scope:
	•	Read the required truth docs first:
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ARCHITECTURE.md
	•	relevant docs/ADR/ entries, especially any that mention entry points or T-0018-adjacent behavior
	•	Make the smallest targeted update to docs/ARCHITECTURE.md needed to describe:
	•	primary entry page = index.html
	•	compatibility redirect page = game.html
	•	game.html forwards to index.html
	•	game.html is not an independent runtime surface
	•	If existing docs materially conflict with tested code, record that conflict in ai/current-state/drift-register.md.

Out of scope:
	•	Any code changes.
	•	Any hosting/routing/deployment changes.
	•	Any broad rewrite of the architecture docs.
	•	Any attempt to formalize /game as a supported route unless verified in truth docs or repo-level routing docs.
	•	Any unrelated cleanup of automation-pipeline documentation, App Mode behavior, prompt queue architecture, or Gemini/OpenAI routing contradictions unless the executor finds those topics already inside docs/ARCHITECTURE.md and directly entangled with this exact entry-point section.

Constraints
	•	Docs-only task.
	•	Read first, edit second.
	•	Prefer one small, reviewable patch.
	•	Treat docs as primary truth; if code appears ahead of docs, state uncertainty explicitly.
	•	Do not silently reconcile code/doc drift; use ai/current-state/drift-register.md if there is a true conflict.
	•	Keep wording descriptive, not normative, unless the source-of-truth docs already make a stronger claim.
	•	Do not invent product/business rationale such as “legacy,” “deprecated,” “permanent alias,” or “dashboard unification” unless already documented.
	•	Resolve review ambiguity explicitly:
	•	The Gemini/App Mode routing contradiction in the supplied materials is not part of this task unless it is already documented in docs/ARCHITECTURE.md and blocks a coherent entry-point note.
	•	The safe implementation target for T-0024 is the browser page entry-point architecture only.

File targets

Primary target:
	•	docs/ARCHITECTURE.md

Conditional target only if needed:
	•	ai/current-state/drift-register.md — only if a real doc/code conflict is found after reviewing truth docs

Do not edit unless directly required by existing source-of-truth structure:
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ADR/*

Tests required
	•	Verify that the source-of-truth docs were reviewed before editing.
	•	Diff review confirming only documentation files changed.
	•	Consistency check that the final architecture wording:
	•	identifies index.html as the main runtime page,
	•	identifies game.html as a compatibility redirect page,
	•	states that game.html forwards to index.html,
	•	does not present game.html as a separate application surface.
	•	Verify that the final wording does not overclaim /game support unless such support is already established in reviewed docs or repo configuration.
	•	If any internal doc links or cross-references are added, verify they resolve.
	•	If a conflict is found, verify it is recorded in ai/current-state/drift-register.md instead of being silently edited around.

Chosen minimal policy

Use the narrowest safe documentation statement:

index.html is the primary browser entry page. game.html exists as a compatibility redirect page that forwards to index.html and should not be treated as a separate application surface.

Additional policy decisions:
	•	Treat game.html file behavior as the only safely documented compatibility surface from the supplied code.
	•	Do not document /game as supported unless existing truth docs or repo routing docs confirm it.
	•	Interpret “T-0018 behavior” narrowly here: the Start UI/runtime should not be described as existing separately on game.html; users reaching game.html are forwarded into the index.html surface.
	•	Ignore unrelated architecture contradictions outside this section unless they are already inside the exact section being updated and prevent a coherent minimal patch.

Risks
	•	Existing truth docs may already describe entry points differently.
	•	The game.html script checks for /game, but that alone is not enough to document /game as a supported route.
	•	T-0018 may have additional behavioral implications in tests or prior notes that are not safe to restate unless found in source-of-truth docs.
	•	docs/ARCHITECTURE.md may be broadly incomplete, which could tempt overscoped cleanup.
	•	If code is ahead of docs, the executor may need to record drift rather than fully “fix” documentation in one pass.

Explicit non-goals
	•	No code edits to index.html, game.html, or any script.
	•	No redirect implementation changes.
	•	No hosting/server-route/deployment validation or redesign.
	•	No guarantees about /game, query preservation, deep-link behavior, SEO, caching, or redirect permanence.
	•	No attempt to classify game.html as deprecated, legacy, permanent, or distributor-specific unless already stated in truth docs.
	•	No broad rewrite of docs/ARCHITECTURE.md.
	•	No cleanup of unrelated automation architecture topics such as prompt queue internals, App Mode state persistence, multi-task queue collisions, or Gemini routing behavior unless a true blocking conflict in the touched architecture section forces a minimal note.

## Related Documents
- [[ai/specs/T-0024_spec.md|T-0024 spec]]
- [[ai/reviews/T-0024_gemini_review.md|T-0024 review]]
- [[ai/results/T-0024_executor_report.md|T-0024 result]]
- [[ai/followups/T-0024_followups.md|T-0024 followup]]
- [[ai/pr/T-0024_pr_draft.md|T-0024 pr-draft]]
