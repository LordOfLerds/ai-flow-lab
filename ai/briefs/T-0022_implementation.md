---
type: brief
task_id: T-0022
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0022 Implementation Brief

## Goal

Produce a documentation-only artifact that explains how the headless Start UI smoke test discovers and uses a browser binary, using verified repository evidence only.

Resolve the core contradiction explicitly:

- The task title assumes such a smoke test exists.
- The spec states that current visible truth may not confirm the test framework, invocation path, or discovery mechanism.

Chosen resolution:

- First document confirmed repository facts and any confirmed test/tooling facts found during repo inspection.
- If the smoke test, framework, or browser discovery mechanism is not confirmed, document that absence explicitly as an unresolved gap rather than inventing behavior.
- Do not define a new browser discovery standard in this task.

## Scope

Tight scope for this docs-lane task:

- Inspect repository sources named by project policy and any directly relevant testing/config files needed to verify the smoke test and browser setup path.
- Create or update one documentation artifact covering:
  - what Start UI page is under test;
  - whether a headless smoke test exists and how it is invoked, if confirmed;
  - which browser automation tool is used, if confirmed;
  - how the browser binary is discovered or configured, if confirmed;
  - what setup prerequisites are documented for local and CI-like headless environments, if confirmed;
  - what failure modes/operators should check when browser setup is missing or broken;
  - what remains unknown or undocumented.
- Reference confirmed UI entry facts:
  - `index.html` is the primary browser UI entry.
  - `game.html` redirects to `index.html`, if that remains true in repo inspection.
- Record any docs-vs-code mismatch in `ai/current-state/drift-register.md` if discovered.

## Constraints

- Documentation only; no code, scripts, config, or CI changes.
- Prefer minimal safe changes.
- Use repository docs and code as truth; do not guess framework behavior.
- Do not claim support for specific browser binaries, env vars, flags, install commands, or system libraries unless verified in repo sources.
- Do not expand into framework selection or test implementation design.
- If no smoke test exists, document that the mechanism is unconfirmed; do not convert this task into a proposal unless an existing docs pattern explicitly requires noting future work.
- Because `AGENTS.md` names `docs/DOMAIN_MODEL.md`, `docs/INVARIANTS.md`, `docs/ARCHITECTURE.md`, and `docs/ADR/` as primary sources, inspect them if present before finalizing the doc.
- Also inspect likely evidence files to resolve ambiguity with minimal search:
  - `package.json`
  - test runner configs
  - browser automation configs
  - relevant CI/workflow files
  - any existing testing docs

## File targets

Primary documentation target:

- One relevant docs artifact, likely under `docs/` or existing testing documentation location, whichever matches repo conventions.

Mandatory inspection targets before writing:

- `docs/DOMAIN_MODEL.md`
- `docs/INVARIANTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR/` relevant entries
- `package.json`
- `index.html`
- `game.html`
- relevant test/config files if present, such as:
  - Playwright/Puppeteer/Jest/Vitest/Cypress configs
  - smoke/e2e test directories
  - CI workflow files
  - existing contributor or testing docs

Conditional target:

- `ai/current-state/drift-register.md` only if inspection finds a docs/code conflict or undocumented implemented behavior that materially affects this task.

## Tests required

For this docs-lane task, verification should be lightweight and evidence-based:

- Confirm all factual statements in the new/updated doc map to inspected repository files.
- Verify the doc explicitly separates:
  - confirmed behavior,
  - inferred-but-unconfirmed items,
  - unresolved gaps.
- If a smoke test command/framework exists, verify the documentation names the same invocation/configuration found in repo files.
- If no framework or smoke test is confirmed, verify the doc clearly says so.
- If a drift entry is required, verify it names the exact conflicting files and issue.

No implementation or browser execution is required unless existing repo instructions make a documentation dry-run trivial; otherwise avoid expanding scope.

## Chosen minimal policy

- Document only what is confirmed by repository inspection.
- Treat unknowns as unknowns.
- Prefer a single concise documentation update over broad doc restructuring.
- Do not introduce a fallback browser discovery policy.
- Include operator guidance for missing browser situations only at the level repo evidence supports, e.g.:
  - binary not found,
  - path/config not set,
  - binary not executable,
  - environment prerequisites undocumented.
- If Gemini review suggestions exceed verified repo truth (for example, specific Linux libraries, `--no-sandbox`, multi-browser precedence), include them only if confirmed in this repository.

## Risks

- The repository may not contain a headless Start UI smoke test at all, leaving the final doc mostly about confirmed gaps.
- Primary docs may exist and contradict visible code or spec assumptions.
- Browser setup may be split across scripts, config, and CI, making it easy to overstate certainty.
- The term “Start UI smoke test” may not appear verbatim, requiring careful evidence-based mapping to the actual test target.
- Over-documenting environment specifics would violate the no-invention constraint.

## Explicit non-goals

- Implementing or modifying any smoke test.
- Selecting a browser automation framework.
- Adding browser installation steps not already documented in repo sources.
- Defining new environment variables, CLI flags, or config keys.
- Adding CI setup, Docker dependencies, or sandbox flags unless already present and merely being documented.
- Expanding into general UI, gameplay, auth, or unrelated testing documentation.
- Normalizing undocumented code behavior without noting uncertainty or drift.

## Related Documents
- [[ai/specs/T-0022_spec.md|T-0022 spec]]
- [[ai/reviews/T-0022_gemini_review.md|T-0022 review]]
- [[ai/results/T-0022_executor_report.md|T-0022 result]]
- [[ai/followups/T-0022_followups.md|T-0022 followup]]
- [[ai/pr/T-0022_pr_draft.md|T-0022 pr-draft]]
