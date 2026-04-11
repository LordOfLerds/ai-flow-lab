---
type: followup
task_id: T-0020
created: 2026-04-10
tags: [ai-flow-lab, followup]
---

# T-0020 Follow-ups

## Task outcome summary
T-0020 completed the requested test-lane scope by adding a real headless-browser smoke test at `starter-test/tests/headless-start-ui.test.ts`.

What is now covered:
- launches a real Chrome/Chromium process via CDP,
- navigates to the actual entry page,
- waits for runtime-rendered Start/Login UI under `#menu-content .auth-panel`,
- asserts visible rendered state rather than static HTML presence,
- checks specific rendered UI details including overlay visibility, login label, and status role.

Important execution caveat:
- the new test currently **auto-skips** when no usable headless-capable Chrome binary can start in the environment.
- On the executor’s macOS host, the standard Google Chrome app aborted at launch (`SIGABRT` / LaunchServices-related failure), so the harness itself is in place, but the smoke assertions could not be exercised in that environment.

## Remaining risks
- The biggest remaining risk is **environmental rather than code-level**: the test may exist but not actually execute in CI or local environments unless a headless-friendly browser binary is available.
- Because the test skips when Chrome cannot start, regressions in Start UI rendering could remain undetected in environments lacking a valid browser binary.
- Browser-path handling is only partially addressed through candidate path probing plus `CHROME_PATH`; developer/CI setup is not yet documented, which may reduce adoption and diagnosability.
- A bundled or standardized browser runtime is still absent, so test reliability may vary by host OS and installation type.

## Candidate follow-up tasks

### F-1
- title: Provision a headless-friendly Chrome binary for the Start UI smoke test in CI/test environments
- lane_type: test-lane
- executor: claude
- rationale: The executor report shows the new smoke test is implemented but cannot reliably run because the default macOS Chrome app aborts on headless startup. Providing a known-good Chrome for Testing or equivalent headless-capable binary is the smallest concrete step that converts this from mostly-skip coverage into executable regression coverage.
- smallest_safe_scope: Add minimal test-environment support so the existing `starter-test` smoke test can launch a known-good browser binary via `CHROME_PATH` or equivalent existing mechanism, and verify the test runs without skipping in that environment.
- depends_on: T-0020
- priority: high
- should_spawn_now: true

### F-2
- title: Document browser binary discovery and `CHROME_PATH` setup for the headless Start UI smoke test
- lane_type: docs-lane
- executor: claude
- rationale: The new harness already supports alternate browser paths, but there is no documented setup path for developers or CI maintainers. Small documentation would reduce confusion and make the test usable without changing product code.
- smallest_safe_scope: Add concise test-runner documentation describing supported browser candidates, `CHROME_PATH` usage, expected skip behavior, and how to run the headless smoke test successfully.
- depends_on: T-0020
- priority: medium
- should_spawn_now: true

### F-3
- title: Evaluate an offline-friendly cached browser distribution strategy for browser smoke tests
- lane_type: infrastructure-lane
- executor: claude
- rationale: The executor reported that Playwright installation and some package operations are blocked in restricted environments. If those constraints are expected to continue, a cached or vendored browser strategy may be needed for stable automation. This is useful, but less urgent than first making the current harness runnable and documented.
- smallest_safe_scope: Assess and document one minimal repo-compatible approach for providing a vetted browser binary in restricted/offline environments, without replacing the current harness.
- depends_on: T-0020
- priority: low
- should_spawn_now: false

## Recommended next task
**F-1** is the recommended next task.

Reason:
- It directly addresses the executor’s primary unresolved issue.
- It unlocks actual execution of the newly added smoke test instead of leaving it as conditional/skip-only coverage on some hosts.
- It is smaller and more immediately valuable than broader infrastructure work.

## Notes for planner
- No owner-decision blocker is strictly required to continue with **F-1** if the project already has an accepted way to supply CI/test binaries or environment variables.
- **F-2** is safe to run in parallel with F-1 because it is documentation-only and based on behavior already implemented in T-0020.
- Do **not** spawn a follow-up to add more Start UI browser assertions right now; the more urgent gap is execution environment readiness, not assertion breadth.
- Do **not** propose redirect coverage for `game.html`; that area is already handled by **T-0019** or intentionally left outside T-0020 scope.

## Related Documents
- [[ai/specs/T-0020_spec.md|T-0020 spec]]
- [[ai/reviews/T-0020_gemini_review.md|T-0020 review]]
- [[ai/briefs/T-0020_implementation.md|T-0020 document]]
- [[ai/results/T-0020_executor_report.md|T-0020 result]]
- [[ai/pr/T-0020_pr_draft.md|T-0020 pr-draft]]
