# T-0021 Gemini Review

## Review target
- **Task ID:** T-0021
- **Spec Title:** Provision a headless-friendly Chrome binary for the Start UI smoke test in CI/test environments
- **Focus:** Ensuring consistent browser availability for UI testing in non-interactive environments.

## Contradictions
- **Authority vs. Implementation:** The spec identifies `docs/DOMAIN_MODEL.md` and `docs/ARCHITECTURE.md` as primary truth but acknowledges they were not provided. This creates a contradiction where the Executor is told to "not invent rules" but must establish a provisioning strategy without the architectural guidelines that likely dictate how dependencies are managed.
- **Minimal Changes vs. Infrastructure Setup:** The spec mandates "minimal safe changes" while simultaneously requiring a "documented and repeatable way to obtain a binary." Infrastructure provisioning often requires non-minimal changes to CI YAML files or dependency manifests (e.g., `package.json` or `requirements.txt`).

## Missing edge cases
- **Architecture Mismatch:** CI runners often vary between `linux/amd64` and `linux/arm64`. A provisioned binary must match the runner's architecture.
- **Shared Library Dependencies:** Chrome binaries often require system-level libraries (`libnss3`, `libatk-bridge`, etc.) that are missing in slim CI images. Provisioning the binary alone may not be enough for a "headless-friendly" environment.
- **Cache Persistence:** If the provisioning strategy involves downloading a binary (~150MB+), the spec should address CI caching to prevent bandwidth waste and slow build times.
- **Zombie Processes:** Headless Chrome instances in CI frequently fail to terminate on test failure. The provisioning/execution strategy should account for process cleanup.

## Scope risks
- **Test Runner Refactoring:** If the (currently unknown) smoke test runner uses hardcoded paths (e.g., `/usr/bin/google-chrome`), the scope of this task will bloat into refactoring the test suite itself to support dynamic binary paths.
- **Environment Parity:** There is a risk that the "provisioned" browser in CI diverges significantly from the version used by developers, leading to "works on my machine" failures that are hard to debug.
- **Version Pinning:** The spec does not mandate a specific Chrome/Chromium version. Relying on "latest" can cause CI to break spontaneously when a new browser version is released.

## Missing tests
- **Provisioning Verification:** There is no requirement for a "pre-flight" check (e.g., `chrome --version`) to verify the binary is functional and all shared libraries are present before the full smoke test runs.
- **Network-Isolated Provisioning:** If the CI environment is firewalled, the provisioning strategy must be tested against a local or internal mirror rather than public Google/Puppeteer endpoints.

## Hidden assumptions
- **Internet Access:** Assumes CI runners have outbound internet access to fetch Chrome/Chromium binaries.
- **Linux Host:** Assumes CI is running on a Linux-based container/VM, though the UI smoke test might eventually need to run on macOS or Windows runners.
- **Tooling Support:** Assumes the existing smoke test (if it exists) can accept a browser path via environment variables (e.g., `CHROME_PATH`) or CLI flags.

## Recommended corrections
- **Mandate Version Pinning:** Explicitly require the provisioning strategy to pin a specific major version of Chrome/Chromium to ensure test stability.
- **Define Strategy Type:** Clarify if the "provisioning" should be handled by the package manager (e.g., `npm install` fetching Chromium via Puppeteer), a CI action (e.g., `setup-chrome` action), or a standalone setup script.
- **Include Dependency Check:** Add an acceptance criterion that the provisioning step must verify the binary is actually executable in the target environment (e.g., checking for missing `.so` files).
- **Address Architecture:** Specify that the provisioning mechanism must be cross-platform or at least detect the runner's OS/architecture.