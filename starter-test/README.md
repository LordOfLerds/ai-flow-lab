# starter-test

## Test and browser provisioning workflow

- `npm test` (and `npm run testwatch`) now invoke `scripts/run-vitest-with-chrome.mjs`, which
  1. validates an existing `CHROME_PATH` value **or** downloads a Chrome for Testing build,
  2. stores downloaded builds in `starter-test/.cache/chrome/<release>/`, and
  3. exports `CHROME_PATH` to Vitest so the headless Start UI smoke test can launch deterministically.
- The provisioning script fetches the latest `stable` build by default. To pin a specific
  release for CI, set `CFT_RELEASE=<version>` (for example `120.0.6099.109`). `CFT_CHANNEL`
  can override the release channel (`stable`, `beta`, `dev`, `canary`) when no explicit
  version is supplied.
- When network access is unavailable, you can preinstall Chrome manually and point the
  harness at it by exporting `CHROME_PATH=/path/to/chrome`. The script will still run a
  `--version` preflight and fall back to downloading if validation fails.
- Cached browsers may be removed safely; the next test run will redownload whichever
  release is requested.

## Commands

- `npm test` – runs the full Vitest suite with the provisioned Chrome binary.
- `npm run testwatch` – runs Vitest in watch mode with the same provisioning flow.
- `node scripts/ensure-chrome.mjs` – performs the provisioning step by itself and prints
  the Chrome path it will use.
