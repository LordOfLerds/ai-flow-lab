---
type: review
task_id: T-0022
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0022 Gemini Review

## Review target
- **Task ID:** T-0022
- **Title:** Document browser binary discovery and setup for the headless Start UI smoke test
- **Spec File:** `ai/specs/T-0022_spec.md`

## Contradictions
- **Abstract vs. Concrete:** The task title implies a specific need ("Document browser binary discovery"), but the "Problem statement" and "Source of truth" sections admit that no such test or framework is currently visible in the repo context. This creates a contradiction where the Executor is asked to document a mechanism that they may simultaneously have to discover or define, potentially violating the "Do not invent business rules" constraint.

## Missing edge cases
- **Multi-Browser environments:** The spec doesn't explicitly ask to document the priority order if multiple compatible browsers (e.g., Chrome, Chromium, Firefox) are discovered.
- **CI/Docker Dependencies:** Headless browser execution in Linux environments (common for CI) often requires specific system-level libraries (e.g., `libgbm`, `libnss3`). The documentation should address these system dependencies, not just the browser binary path.
- **Architecture Mismatch:** Edge case where a browser binary is found but is for the wrong architecture (e.g., x64 binary on ARM64 CI runner), which frequently happens in automated discovery.
- **Sandbox Restrictions:** Documenting whether `--no-sandbox` is required for the headless smoke test in restricted environments (like Docker).

## Scope risks
- **Discovery vs. Definition:** There is a risk that the Executor will spend the entire task searching for a non-existent test suite. The spec should clarify if the Executor is authorized to *propose* a discovery standard (e.g., "The test will look for `BROWSER_PATH` environment variable") if none is found.
- **Framework Creep:** The spec mentions avoiding framework invention, but documenting "setup" without a framework (Playwright, Puppeteer, etc.) is nearly impossible. The scope may accidentally expand into a "Framework Selection" task.

## Missing tests
- **Verification of Documentation:** The spec does not define how to verify the documentation is correct. A "dry run" or manual verification step should be included in the documentation requirements (e.g., "The documentation must be verified by successfully running the smoke test following only the written steps").

## Hidden assumptions
- **Existence of "Headless" mode:** Assumes the current Start UI (`index.html`) is compatible with headless rendering without modification (e.g., no hardware acceleration dependencies that break in CI).
- **Environment Variable Standard:** Assumes that an environment variable or config file is the preferred method for path overriding, rather than auto-detection or a global install.

## Recommended corrections
- **Add File Inspection Step:** Explicitly list `package.json`, `playwright.config.ts`, `jest.config.js`, and `.github/workflows/*.yml` as mandatory inspection targets to resolve the framework ambiguity.
- **Address Drift Register:** Explicitly require that if a framework is found in the code but is undocumented, the Executor must record this in `ai/current-state/drift-register.md` as per the "Drift rule" in `AGENTS.md`.
- **Define Fallback Behavior:** Instruct the Executor on what to do if no smoke test exists. (e.g., "If no smoke test is found, the deliverable should be a proposal for the discovery mechanism to be used by a future test").
- **System Dependencies:** Add a requirement to document any non-JS/non-binary system dependencies (OS libraries) needed for headless execution.

## Related Documents
- [[ai/specs/T-0022_spec.md|T-0022 spec]]
- [[ai/briefs/T-0022_implementation.md|T-0022 document]]
- [[ai/results/T-0022_executor_report.md|T-0022 result]]
- [[ai/followups/T-0022_followups.md|T-0022 followup]]
- [[ai/pr/T-0022_pr_draft.md|T-0022 pr-draft]]
