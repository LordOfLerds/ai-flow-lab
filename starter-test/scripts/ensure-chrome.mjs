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
