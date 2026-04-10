T-0023 Follow-ups

Task outcome summary

T-0023 completed its intended narrow scope successfully: docs/ARCHITECTURE.md now states that index.html is the primary browser entry point and game.html is only a compatibility redirect surface. No drift was found that required a registry entry, and no code changes were made.

The main remaining issue is not with the redirect clarification itself, but with the overall completeness of docs/ARCHITECTURE.md: the file is still very thin and currently ends at a Single-File Structure heading without substantive content. That leaves architectural source-of-truth coverage incomplete for future tasks and reviews.

Remaining risks
	•	docs/ARCHITECTURE.md is still under-specified relative to the repo’s architecture-doc role in AGENTS.md.
	•	The dangling Single-File Structure heading can mislead future implementers into assuming documentation exists where it does not.
	•	Future feature and review tasks may continue to infer runtime structure from code instead of docs if the architecture file remains skeletal.
	•	Entry-point behavior is now documented, but related runtime concerns (game loop, state model, rendering pipeline, persistence boundaries) may still lack a stable written reference.

Candidate follow-up tasks

F-1
	•	title: Complete the Single-File Structure section in docs/ARCHITECTURE.md
	•	lane_type: docs-lane
	•	executor: claude
	•	rationale: The executor report identifies an incomplete architecture section ending abruptly at Single-File Structure. Finishing that section is the smallest safe docs follow-up and directly addresses a concrete gap without broadening into a full architecture rewrite.
	•	smallest_safe_scope: Add only the missing content needed to explain the actual organization and responsibility split inside the single-file app, keeping the rest of docs/ARCHITECTURE.md unchanged unless required for coherence.
	•	depends_on: T-0023
	•	priority: high
	•	should_spawn_now: yes

F-2
	•	title: Add minimal runtime architecture coverage for game loop, state, and rendering in docs/ARCHITECTURE.md
	•	lane_type: docs-lane
	•	executor: claude
	•	rationale: The executor report notes that architecture coverage is still very limited. After the incomplete section is fixed, the next smallest useful follow-up is a concise description of core runtime concerns that future feature/test tasks will rely on.
	•	smallest_safe_scope: Add short sections describing the runtime loop, browser state ownership, rendering responsibilities, and persistence boundaries, without rewriting unrelated documentation.
	•	depends_on: F-1
	•	priority: medium
	•	should_spawn_now: no

F-3
	•	title: Add entry-point cross-reference to user-facing docs if such docs already exist
	•	lane_type: docs-lane
	•	executor: claude
	•	rationale: The executor suggested consistency follow-up work, but this should only happen if there is already a README or deployment-facing doc that mentions launch URLs or entry points. Otherwise it risks expanding scope without clear value.
	•	smallest_safe_scope: Search for existing user-facing docs that mention app startup or entry URLs, and add one short consistency note only where directly relevant.
	•	depends_on: T-0023
	•	priority: low
	•	should_spawn_now: no

Recommended next task

F-1: Complete the Single-File Structure section in docs/ARCHITECTURE.md.

Why this next:
	•	it is directly supported by the executor report
	•	it is the smallest safe follow-up
	•	it fixes a concrete incomplete architecture artifact
	•	it avoids speculative broadening while improving source-of-truth quality for later tasks

Notes for planner
	•	No owner decision blocker is apparent from this task outcome.
	•	Do not spawn a broad “rewrite architecture docs” task yet; the safer sequence is to close the clearly incomplete section first, then reassess whether additional runtime architecture coverage is still needed.
	•	F-2 should remain a separate follow-up rather than being bundled into F-1, to keep review scope tight.
	•	F-3 is optional and should only be created if repo docs actually contain another entry-point mention surface; otherwise skip it.