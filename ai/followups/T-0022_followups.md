# T-0022 Follow-ups

## Task outcome summary

T-0022 appears to have completed its intended docs-only scope successfully.

Confirmed from the executor report:
- A testing documentation artifact was created at `docs/TESTING.md`.
- The executor verified the actual headless Start UI smoke test implementation and its supporting scripts rather than relying on the earlier speculative task framing.
- The documentation now covers:
  - the Start UI target under test,
  - `index.html` / `game.html` entry-point behavior,
  - the confirmed browser discovery order,
  - invocation/setup details,
  - troubleshooting for missing browser cases.

Important outcome nuance:
- The main gap was not missing implementation, but missing documentation for already-mature test infrastructure.
- No code changes or infra changes were needed for this task.

## Remaining risks

- The executor report says `docs/TESTING.md` was created, but the structured “Files written” section shows no parsed files, so planner/reviewer should verify the doc was actually committed and contains the reported content.
- CI-specific operating guidance is still likely under-documented; the executor explicitly suggested a separate CI integration guide.
- The current documentation is scoped to the Start UI smoke test only, so maintainers may still lack guidance for adjacent browser-driven test areas such as auth or gameplay transitions.
- The existing approach is Chrome-specific; broader browser compatibility remains unaddressed, but that is not a blocker for current documented behavior.
- If repository policy expects undocumented implemented behavior to be tracked in drift-register.md, it is not clear from the report whether any drift entry was needed or added when the spec assumptions proved outdated.

## Candidate follow-up tasks

### F-1
- title: Document CI environment setup for the headless Chrome Start UI smoke test
- lane_type: docs-lane
- executor: claude
- rationale: The executor identified a useful next step that does not require product-owner decisions: documenting how the already-existing Chrome discovery/provisioning flow should be run in CI environments such as GitHub Actions or containers. This extends the newly added test documentation without changing implementation.
- smallest_safe_scope: Add a focused CI section or companion doc describing verified repository-supported setup for running the existing headless Start UI smoke test in CI-like environments, including confirmed invocation path, environment expectations, and known troubleshooting boundaries.
- depends_on: T-0022
- priority: medium
- should_spawn_now: true

### F-2
- title: Add headless browser smoke coverage for gameplay state transitions beyond the Start UI
- lane_type: test-lane
- executor: claude
- rationale: The executor reported that the current browser automation stack is mature and suitable for expansion. A small next increment would be extending real-browser smoke coverage to one narrow post-start flow, building on existing infrastructure. This does not duplicate T-0015, which is focused on mock login validation and state transitions, nor T-0019/T-0020, which are Start UI visibility tasks.
- smallest_safe_scope: Add one narrowly scoped browser smoke test that starts from the existing entry flow and verifies a single confirmed gameplay-facing state transition after the Start UI, reusing the current headless Chrome tooling.
- depends_on: T-0020, T-0022
- priority: medium
- should_spawn_now: true

## Recommended next task

Recommend **F-1: Document CI environment setup for the headless Chrome Start UI smoke test**.

Why this one first:
- It is a small, reviewable continuation of the docs work just completed.
- It directly follows the executor’s recommendation.
- It has low coordination risk and does not require new feature behavior.
- It improves operability of the already-implemented smoke test without overlapping existing tasks.

## Notes for planner

- Before spawning anything, verify whether `docs/TESTING.md` is actually present in the branch/worktree, since the executor narrative and the parsed file summary disagree.
- Do not spawn a follow-up for auth-flow browser testing because that substantially overlaps with **T-0015**.
- Do not spawn a follow-up for additional Start UI visibility coverage because that is already handled by **T-0019** and **T-0020**.
- Cross-browser support and HTTP-served test coverage may be valid later, but they are broader than necessary right now and are less aligned with the immediate docs outcome.
- If the repository review shows no missing CI documentation after all, no immediate follow-up is needed beyond verifying the T-0022 artifact landed correctly.