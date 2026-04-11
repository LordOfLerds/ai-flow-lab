---
type: result
task_id: T-0021
created: 2026-04-10
tags: [ai-flow-lab, result]
---

# T-0021 Executor Result

## Task
Provision a headless-friendly Chrome binary for the Start UI smoke test in CI/test environments

## Executor
claude

## Files written
- `.gitignore`
- `starter-test/package.json`
- `starter-test/scripts/ensure-chrome.mjs`
- `starter-test/scripts/run-vitest-with-chrome.mjs`
- `starter-test/README.md`

## Execution Report

### What was done
- Added `starter-test/scripts/ensure-chrome.mjs`, a deterministic Chrome-for-Testing provisioner that resolves the current platform, fetches (or reuses) the desired release, verifies `--version`, and honors overrides via `CHROME_PATH`, `CFT_RELEASE`, and `CFT_CHANNEL` while caching builds under `starter-test/.cache/chrome`.
- Created `starter-test/scripts/run-vitest-with-chrome.mjs` and re-wired `npm test` / `npm run testwatch` so every Vitest run first provisions a headless-friendly Chrome binary and exports `CHROME_PATH` before executing the Start UI smoke test.
- Documented the new workflow plus environment knobs in `starter-test/README.md` and ignored the browser cache directory via `.gitignore` to keep download artifacts out of source control.
- Updated `starter-test/package.json` scripts to route through the new runner, ensuring CI/test environments automatically gain the deterministic browser dependency path the spec requested.

### What was NOT done
- Could not complete `npm test` (`cd starter-test && npm test`) because the sandboxed environment cannot resolve `storage.googleapis.com`, so the Chrome download step fails with `getaddrinfo ENOTFOUND storage.googleapis.com`. CI or any networked environment should succeed automatically; locally you can set `CHROME_PATH` to a preinstalled Chrome to bypass downloads.

### Issues discovered
- The provisioning script relies on outbound HTTPS access (and `unzip`/PowerShell for extraction). In environments without network or those lacking these tools, tests will still fail fast with a clear `[chrome-provisioner]` error; consider pre-pinning and caching binaries if strict offline support is required.

### Suggested follow-ups
1. Pin a specific `CFT_RELEASE` in `.github/workflows/ci.yml` once the desired Chrome build is chosen to ensure cross-run determinism (`test-lane`).
2. Extend CI to cache `starter-test/.cache/chrome` between runs (e.g., GitHub Actions cache) to avoid re-downloading Chrome every time (`test-lane`).

---

## Raw executor output
```file:.gitignore
node_modules/
dist/
coverage/
.DS_Store
.env
.env.*
*.log
automation/node_modules/
starter-test/node_modules/
starter-test/.cache/
wt/

# Runtime state for local agent orchestration
automation/state/tasks/*.json
automation/state/locks/
```

```file:starter-test/package.json
{
  "name": "starter-test",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "directories": {
    "test": "tests"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "test": "node ./scripts/run-vitest-with-chrome.mjs",
    "testwatch": "node ./scripts/run-vitest-with-chrome.mjs --watch"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "devDependencies": {
    "@types/node": "^25.5.2",
    "tsx": "^4.21.0",
    "typescript": "^6.0.2",
    "vitest": "^4.1.2"
  }
}
```

```file:starter-test/scripts/ensure-chrome.mjs
#!/usr/bin/env node
import { createWriteStream, existsSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { chmod } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { execFile, spawn } from 'node:child_process';

const entryPoint = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CACHE_ROOT = resolve(__dirname, '..', '.cache', 'chrome');
const CFT_BASE_URL = 'https://storage.googleapis.com/chrome-for-testing-public';
const FALLBACK_RELEASE = '120.0.6099.109';
const DEFAULT_CHANNEL = process.env.CFT_CHANNEL ?? 'stable';
const REQUESTED_RELEASE = process.env.CFT_RELEASE?.trim();

const PLATFORM_MAP = {
  linux: {
    downloadSegment: 'linux64',
    archiveName: 'chrome-linux64.zip',
    binaryRelativePath: join('chrome-linux64', 'chrome'),
    needsChmod: true,
  },
  macx64: {
    downloadSegment: 'mac-x64',
    archiveName: 'chrome-mac-x64.zip',
    binaryRelativePath: join(
      'chrome-mac-x64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing',
    ),
    needsChmod: true,
  },
  macarm64: {
    downloadSegment: 'mac-arm64',
    archiveName: 'chrome-mac-arm64.zip',
    binaryRelativePath: join(
      'chrome-mac-arm64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing',
    ),
    needsChmod: true,
  },
  win64: {
    downloadSegment: 'win64',
    archiveName: 'chrome-win64.zip',
    binaryRelativePath: join('chrome-win64', 'chrome.exe'),
    needsChmod: false,
  },
};

export async function ensureChromeBinary({ release, channel } = {}) {
  const envPath = process.env.CHROME_PATH?.trim();
  if (envPath && (await isUsableBinary(envPath))) {
    return { chromePath: envPath, release: 'env', source: 'env' };
  }

  const platform = detectPlatform();
  const resolvedRelease = release ?? REQUESTED_RELEASE ?? (await resolveRelease(channel ?? DEFAULT_CHANNEL));
  const releaseDir = join(CACHE_ROOT, resolvedRelease);
  const binaryPath = join(releaseDir, platform.binaryRelativePath);

  if (existsSync(binaryPath)) {
    await verifyChrome(binaryPath);
    return { chromePath: binaryPath, release: resolvedRelease, source: 'cache' };
  }

  await downloadAndExtractChrome(resolvedRelease, platform, releaseDir);
  if (platform.needsChmod) {
    await chmod(binaryPath, 0o755);
  }
  await verifyChrome(binaryPath);
  return { chromePath: binaryPath, release: resolvedRelease, source: 'download' };
}

async function resolveRelease(channel) {
  const normalizedChannel = (channel ?? DEFAULT_CHANNEL).toUpperCase();
  const url = `${CFT_BASE_URL}/LATEST_RELEASE_${normalizedChannel}`;
  try {
    const body = await downloadText(url);
    const trimmed = body.trim();
    if (!trimmed) {
      throw new Error('Empty release response');
    }
    return trimmed;
  } catch (error) {
    console.warn(
      `[chrome-provisioner] Failed to fetch latest ${normalizedChannel} release (${formatError(error)}). Falling back to ${FALLBACK_RELEASE}.`,
    );
    return FALLBACK_RELEASE;
  }
}

async function downloadAndExtractChrome(release, platform, releaseDir) {
  if (existsSync(releaseDir)) {
    rmSync(releaseDir, { recursive: true, force: true });
  }
  mkdirSync(releaseDir, { recursive: true });

  const tempDir = mkdtempSync(join(tmpdir(), 'chrome-download-'));
  const zipPath = join(tempDir, platform.archiveName);
  const downloadUrl = `${CFT_BASE_URL}/${release}/${platform.downloadSegment}/${platform.archiveName}`;
  console.log(`[chrome-provisioner] Downloading ${downloadUrl}`);
  await downloadFile(downloadUrl, zipPath);
  await extractZip(zipPath, releaseDir);
  rmSync(tempDir, { recursive: true, force: true });
}

async function downloadFile(url, destination) {
  await new Promise((resolveDownload, rejectDownload) => {
    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        rejectDownload(new Error(`HTTP ${response.statusCode} while downloading ${url}`));
        response.resume();
        return;
      }

      const fileStream = createWriteStream(destination);
      pipeline(response, fileStream)
        .then(resolveDownload)
        .catch(rejectDownload);
    });

    request.on('error', rejectDownload);
  });
}

async function downloadText(url) {
  return new Promise((resolveText, rejectText) => {
    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        rejectText(new Error(`HTTP ${response.statusCode} while fetching ${url}`));
        response.resume();
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => resolveText(body));
    });

    request.on('error', rejectText);
  });
}

async function extractZip(zipPath, destination) {
  if (process.platform === 'win32') {
    await execFilePromise('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${destination}" -Force`,
    ]);
    return;
  }

  await execFilePromise('unzip', ['-q', zipPath, '-d', destination]);
}

function execFilePromise(command, args) {
  return new Promise((resolveExec, rejectExec) => {
    const child = execFile(command, args, (error) => {
      if (error) {
        rejectExec(error);
      } else {
        resolveExec(null);
      }
    });
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
  });
}

async function verifyChrome(binaryPath) {
  await new Promise((resolveVerify, rejectVerify) => {
    const child = spawn(binaryPath, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', rejectVerify);
    child.on('exit', (code) => {
      if (code === 0) {
        resolveVerify(null);
      } else {
        rejectVerify(new Error(`Chrome --version exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}

async function isUsableBinary(candidatePath) {
  if (!candidatePath || !existsSync(candidatePath)) {
    return false;
  }

  try {
    await verifyChrome(candidatePath);
    return true;
  } catch (error) {
    console.warn(
      `[chrome-provisioner] Ignoring CHROME_PATH=${candidatePath} because verification failed: ${formatError(error)}`,
    );
    return false;
  }
}

function detectPlatform() {
  if (process.platform === 'linux' && process.arch === 'x64') {
    return PLATFORM_MAP.linux;
  }

  if (process.platform === 'darwin' && process.arch === 'x64') {
    return PLATFORM_MAP.macx64;
  }

  if (process.platform === 'darwin' && process.arch === 'arm64') {
    return PLATFORM_MAP.macarm64;
  }

  if (process.platform === 'win32' && process.arch === 'x64') {
    return PLATFORM_MAP.win64;
  }

  throw new Error(`Unsupported platform: ${process.platform} ${process.arch}`);
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

if (process.argv[1] && entryPoint === resolve(process.argv[1])) {
  ensureChromeBinary()
    .then(({ chromePath, release, source }) => {
      console.log(`[chrome-provisioner] Ready (${source}) ${chromePath} [${release}]`);
    })
    .catch((error) => {
      console.error('[chrome-provisioner] Failed to provision Chrome:', error.message);
      process.exitCode = 1;
    });
}
```

```file:starter-test/scripts/run-vitest-with-chrome.mjs
#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

import { ensureChromeBinary } from './ensure-chrome.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const VITEST_BIN = join(
  PROJECT_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vitest.cmd' : 'vitest',
);

(async () => {
  try {
    const vitestArgs = process.argv.slice(2);
    if (vitestArgs.length === 0) {
      vitestArgs.push('run');
    }

    const { chromePath, release, source } = await ensureChromeBinary();
    console.log(`[chrome-provisioner] Using Chrome ${release} (${source}) at ${chromePath}`);

    await runVitest(vitestArgs, chromePath);
  } catch (error) {
    console.error('[chrome-provisioner] Test run failed:', error.message);
    process.exitCode = 1;
  }
})();

function runVitest(args, chromePath) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(VITEST_BIN, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        CHROME_PATH: chromePath,
      },
    });

    child.on('error', rejectRun);
    child.on('exit', (code, signal) => {
      if (signal) {
        rejectRun(new Error(`vitest terminated via signal ${signal}`));
      } else if (code === 0) {
        resolveRun(null);
      } else {
        rejectRun(new Error(`vitest exited with code ${code}`));
      }
    });
  });
}
```

```file:starter-test/README.md
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
```

## Execution Report

### What was done
- Added `starter-test/scripts/ensure-chrome.mjs`, a deterministic Chrome-for-Testing provisioner that resolves the current platform, fetches (or reuses) the desired release, verifies `--version`, and honors overrides via `CHROME_PATH`, `CFT_RELEASE`, and `CFT_CHANNEL` while caching builds under `starter-test/.cache/chrome`.
- Created `starter-test/scripts/run-vitest-with-chrome.mjs` and re-wired `npm test` / `npm run testwatch` so every Vitest run first provisions a headless-friendly Chrome binary and exports `CHROME_PATH` before executing the Start UI smoke test.
- Documented the new workflow plus environment knobs in `starter-test/README.md` and ignored the browser cache directory via `.gitignore` to keep download artifacts out of source control.
- Updated `starter-test/package.json` scripts to route through the new runner, ensuring CI/test environments automatically gain the deterministic browser dependency path the spec requested.

### What was NOT done
- Could not complete `npm test` (`cd starter-test && npm test`) because the sandboxed environment cannot resolve `storage.googleapis.com`, so the Chrome download step fails with `getaddrinfo ENOTFOUND storage.googleapis.com`. CI or any networked environment should succeed automatically; locally you can set `CHROME_PATH` to a preinstalled Chrome to bypass downloads.

### Issues discovered
- The provisioning script relies on outbound HTTPS access (and `unzip`/PowerShell for extraction). In environments without network or those lacking these tools, tests will still fail fast with a clear `[chrome-provisioner]` error; consider pre-pinning and caching binaries if strict offline support is required.

### Suggested follow-ups
1. Pin a specific `CFT_RELEASE` in `.github/workflows/ci.yml` once the desired Chrome build is chosen to ensure cross-run determinism (`test-lane`).
2. Extend CI to cache `starter-test/.cache/chrome` between runs (e.g., GitHub Actions cache) to avoid re-downloading Chrome every time (`test-lane`).


## Related Documents
- [[ai/specs/T-0021_spec.md|T-0021 spec]]
- [[ai/reviews/T-0021_gemini_review.md|T-0021 review]]
- [[ai/briefs/T-0021_implementation.md|T-0021 document]]
- [[ai/followups/T-0021_followups.md|T-0021 followup]]
- [[ai/pr/T-0021_pr_draft.md|T-0021 pr-draft]]
