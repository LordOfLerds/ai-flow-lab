# T-0021 Follow-ups

## Task outcome summary
T-0021 appears successfully implemented at the project-script level.

Completed work:
- Added a Chrome-for-Testing provisioner script with:
  - platform detection,
  - cache reuse,
  - release/channel overrides,
  - `CHROME_PATH` override support,
  - executable verification via `--version`.
- Added a Vitest wrapper that provisions Chrome before test execution and exports `CHROME_PATH`.
- Rewired `starter-test` test commands to always use the provisioning flow.
- Documented the workflow and cache behavior.
- Ignored the downloaded browser cache in source control.

Not completed during execution:
- End-to-end validation of `cd starter-test && npm test` in the executor sandbox, due lack of DNS/network access to `storage.googleapis.com`.

Net result:
- The repo now has an explicit, deterministic browser acquisition path for the Start UI smoke test workflow.
- The main remaining gaps are operational/CI wiring rather than core implementation.

## Remaining risks
- The current default behavior still resolves the latest stable release unless `CFT_RELEASE` is set, so cross-run determinism is weaker than it could be.
- CI may re-download Chrome on every run unless the cache directory is persisted between jobs.
- Offline or restricted-network environments will still fail unless they provide `CHROME_PATH` or an equivalent cached/preinstalled browser.
- Extraction depends on platform tools (`unzip` on Unix-like systems, PowerShell on Windows); if missing in the target environment, provisioning will fail clearly but still fail.
- The executor could not fully prove the smoke-test path in a networked environment from this run.

## Candidate follow-up tasks

### F-1
- title: Pin a specific Chrome for Testing release in CI for deterministic Start UI smoke runs
- lane_type: test-lane
- executor: claude
- rationale: The executor explicitly recommended setting `CFT_RELEASE` in CI; this is the smallest remaining step to eliminate drift from "latest stable" changing between runs.
- smallest_safe_scope: Update the CI workflow that runs `starter-test` so it exports a chosen `CFT_RELEASE` value for the smoke-test job, without changing the local default behavior.
- depends_on: T-0021
- priority: high
- should_spawn_now: true

### F-2
- title: Cache the provisioned Chrome directory in CI to avoid repeated browser downloads
- lane_type: test-lane
- executor: claude
- rationale: The executor explicitly identified CI cache persistence for `starter-test/.cache/chrome` as the next safe optimization; this reduces runtime and network dependence without changing test logic.
- smallest_safe_scope: Add cache restore/save wiring for `starter-test/.cache/chrome` in the existing CI job that runs the Start UI smoke test, keyed by OS and chosen Chrome release.
- depends_on: T-0021
- priority: medium
- should_spawn_now: true

## Recommended next task
**F-1** — Pin a specific Chrome for Testing release in CI for deterministic Start UI smoke runs.

Reason:
- It directly addresses the biggest remaining determinism gap.
- It was the executor’s top suggested follow-up.
- It is small, reviewable, and does not require broader refactoring.
- F-2 becomes cleaner once the release value is pinned, because the cache key can include that known version.

## Notes for planner
- No decision blocker is strictly required to proceed with F-1 if the maintainer is comfortable choosing a current known-good Chrome-for-Testing version already referenced by the implementation fallback/documentation.
- F-2 should ideally be scheduled after or alongside F-1 so cache keys can be version-aware.
- I did not propose offline-support hardening or extraction-tool fallback work because that would expand scope beyond the executor’s minimal recommended next steps.
- I did not propose additional smoke-test code changes because browser provisioning itself is now in place and no separate code defect was reported.