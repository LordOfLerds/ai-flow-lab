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
