---
type: brief
task_id: T-0014
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0014 Implementation Brief

## Goal

Bring the jump-and-run documentation up to date in the repository’s expected docs structure, using existing repo docs as primary truth if they exist and otherwise documenting current behavior inferred from `index.html`.

Resolve the source-of-truth gap explicitly:
- If `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, or `docs/ADR/` already exist, update them conservatively.
- If they do not exist, create only the missing core docs needed to satisfy the structure named in `AGENTS.md`.
- Do not present code-inferred statements as confirmed design intent; label them as inferred where necessary.

Resolve the executor contradiction explicitly:
- Treat `executor: codex` in task metadata as routing only.
- Follow `CLAUDE.md` / `AGENTS.md` for repository role expectations, but keep this brief scoped to deliverables, not role enforcement.

## Scope

In scope:
- Read current repository state before editing.
- Inspect `index.html` as the implementation reference for the game.
- Create or update:
  - domain documentation for game entities/state
  - architecture documentation for runtime structure and browser setup
  - invariants/rules documentation for stable implemented behavior
- Document only behavior that is evidenced by code or existing docs.
- Note inferred-from-code statements where no prior docs exist.
- If existing docs conflict with code, record the conflict in `ai/current-state/drift-register.md` rather than silently reconciling it.
- Include relevant operational details if present in code:
  - controls/input modes
  - rendering approach
  - persistence mechanism such as `localStorage`
  - asset sourcing pattern
  - HUD/menus/overlays
  - progression, unlocks, power-ups, enemies, level flow

Conditionally in scope:
- Update ADR content only if ADR files/folder already exist and there is an evidenced documentation gap tied to an existing ADR convention.
- Create `ai/current-state/drift-register.md` only if a real docs-vs-code conflict is found and the file is absent.

## Constraints

- No gameplay, UI, balancing, or code changes.
- No refactors.
- No invented mechanics, rationale, or retrospective “decision history.”
- Keep documentation aligned to the actual implementation shape, even if it is a single-file monolith.
- Do not imply modular architecture if the code is not modular.
- Treat existing repository docs as higher priority than code for intent, but treat mismatches as drift to document, not silently fix.
- If docs are absent, use `index.html` as the fallback behavior source only for inferred documentation.
- Mark uncertain statements as unknown or inferred-from-code.
- Keep edits limited to documentation-related files for this task.
- Write documentation in English to match existing repo-level docs and avoid mixed-language source-of-truth files.

## File targets

Primary targets:
- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`

Conditional targets:
- `docs/ADR/` existing relevant files only, if present and clearly part of current repo convention
- `ai/current-state/drift-register.md` only when an actual discrepancy between existing docs and `index.html` is identified

Content expectations by file:
- `docs/DOMAIN_MODEL.md`
  - document core entities and relationships actually present in code
  - include at minimum where evidenced: `gs`, player, level, tiles, enemies, moving platforms, particles, floating texts, skins, skills, power-ups
  - include persistence-related state if present
- `docs/INVARIANTS.md`
  - document stable rules and state transitions actually enforced in code
  - include at minimum where evidenced: game phases, XP/leveling, unlock rules, solidity/collision rules, death/retry/level transition flow, timed effects/durations
- `docs/ARCHITECTURE.md`
  - describe the app as implemented: browser-based single-page game in `index.html`
  - cover runtime subsystems actually present: input handling, update loop, rendering, collisions, level generation, UI/HUD, persistence, asset loading/source strategy, environment/runtime assumptions

## Tests required

Required verification before completion:
- Confirm each documented entity/rule/system is traceable to code in `index.html` or to pre-existing repo docs.
- If docs already existed, compare them against `index.html` and log any meaningful mismatch in `ai/current-state/drift-register.md`.
- Check that no non-documentation files were changed.
- Check markdown files for:
  - valid headings
  - working relative links between created/updated docs, if links are added
  - no references to files/ADRs that do not exist
- Cross-reference check:
  - entities named in `docs/DOMAIN_MODEL.md` should exist in code terminology or be clearly labeled as documentation grouping
- Consistency check:
  - terminology across `DOMAIN_MODEL`, `INVARIANTS`, and `ARCHITECTURE` should match
- If persistence, touch input, assets, or runtime requirements exist in code, verify they are documented in the relevant file

## Chosen minimal policy

Minimal safe path:
1. Inspect whether the expected docs already exist.
2. Prefer updating existing source-of-truth docs over adding new parallel docs.
3. If missing, create only:
   - `docs/DOMAIN_MODEL.md`
   - `docs/INVARIANTS.md`
   - `docs/ARCHITECTURE.md`
4. Do not create new ADRs unless ADR structure already exists and there is a clear, evidenced need to update an existing ADR set.
5. Add drift-register entry only for concrete docs-vs-code conflicts, not merely because documentation is being inferred from code.
6. Keep language neutral, factual, and implementation-descriptive.

## Risks

- Existing repo docs may exist outside the provided truth set and may conflict with `index.html`.
- The single-file implementation may hide implicit coupling that is easy to misdescribe.
- Code-inferred docs may capture implementation quirks rather than intended long-term design.
- “Alle Docs” could invite scope creep; this brief limits work to the documented source-of-truth structure and necessary drift logging.
- Retroactive ADR creation could invent rationale; avoid unless clearly required by existing repo conventions.
- If the game supports multiple input modes, persistence, or external assets, those details may be easy to miss without careful code review.

## Explicit non-goals

- No code implementation or bug fixes.
- No gameplay redesign or balancing updates.
- No new README/user guide expansion unless it is already part of the targeted docs structure.
- No creation of speculative ADRs to explain historical choices.
- No silent reconciliation of docs/code conflicts.
- No broad repository documentation cleanup beyond the jump-and-run and its source-of-truth docs.

## Related Documents
- [[ai/specs/T-0014_spec.md|T-0014 spec]]
- [[ai/reviews/T-0014_gemini_review.md|T-0014 review]]
- [[ai/results/T-0014_executor_report.md|T-0014 result]]
- [[ai/results/T-0014_result.md|T-0014 result]]
- [[ai/followups/T-0014_followups.md|T-0014 followup]]
- [[ai/pr/T-0014_pr_draft.md|T-0014 pr-draft]]
