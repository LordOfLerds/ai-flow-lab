#!/usr/bin/env node
/**
 * ChatGPT Browser Worker
 *
 * Watches the prompts-queue directory for pending prompts and sends them
 * to ChatGPT via a real browser (Playwright). Writes responses back to
 * .response.md so the pipeline can pick them up.
 *
 * Usage:
 *   node scripts/chatgpt-browser-worker.mjs [--headed]
 *
 * Environment:
 *   CHATGPT_CHAT_URL  — URL of a project-specific ChatGPT conversation
 *                        (e.g. https://chatgpt.com/c/abc123)
 *                        If not set, uses https://chatgpt.com/
 *
 * First run: start with --headed, log into ChatGPT manually once.
 * The session is persisted in automation/state/.chatgpt-profile/
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { listProjects } from "./project-registry.mjs";
import { automationRoot } from "./_llm-utils.mjs";

const AUTOMATION_ROOT = automationRoot();
const PROFILE_DIR = path.join(AUTOMATION_ROOT, "state", ".chatgpt-profile");
const PID_FILE = path.join(AUTOMATION_ROOT, "state", ".chatgpt-worker.pid");
const POLL_INTERVAL = 3000; // ms between queue checks
const RESPONSE_TIMEOUT = 1800000; // 30 min max wait for ChatGPT response
const HEADED = process.argv.includes("--headed");

// ChatGPT URL — project-specific chat or default
const CHATGPT_URL = process.env.CHATGPT_CHAT_URL || "https://chatgpt.com/";

// Collect all queue dirs: own + registered projects
function getAllQueueDirs() {
  const dirs = [path.join(AUTOMATION_ROOT, "state", "prompts-queue")];
  try {
    for (const p of listProjects()) {
      const d = path.join(p.automation_path, "state", "prompts-queue");
      if (fs.existsSync(d) && !dirs.includes(d)) dirs.push(d);
    }
  } catch {}
  return dirs;
}

let browser = null;
let page = null;

// ─── Browser Lifecycle ───

async function launchBrowser({ forceHeaded = false } = {}) {
  const headed = HEADED || forceHeaded;
  console.log(`[WORKER] Launching browser (headed=${headed})...`);
  console.log(`[WORKER] Profile: ${PROFILE_DIR}`);
  console.log(`[WORKER] ChatGPT URL: ${CHATGPT_URL}`);

  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  // Remove stale lock files left by a previous crash
  for (const lockFile of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
    try { fs.rmSync(path.join(PROFILE_DIR, lockFile)); } catch {}
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !headed,
    viewport: { width: 1440, height: 1080 },
    args: [
      "--disable-blink-features=AutomationControlled",
    ],
  });

  page = context.pages()[0] || await context.newPage();
  browser = context;

  // Navigate to ChatGPT
  await page.goto(CHATGPT_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check if logged in — if not, relaunch headed so the user can log in
  const isLoggedIn = await checkLoggedIn();
  if (!isLoggedIn) {
    if (!headed) {
      console.log("[WORKER] ⚠️  Not logged in — relaunching with visible window for login...");
      await browser.close();
      return launchBrowser({ forceHeaded: true });
    }
    console.log("[WORKER] ⚠️  Not logged in to ChatGPT!");
    console.log("[WORKER] Please log in manually in the browser window.");
    console.log("[WORKER] Waiting for login...");

    // Wait for login (poll for the chat input to appear)
    while (true) {
      await page.waitForTimeout(5000);
      if (await checkLoggedIn()) {
        console.log("[WORKER] ✓ Login detected! Continuing...");
        break;
      }
    }
  } else {
    console.log("[WORKER] ✓ Logged in to ChatGPT");
  }
}

async function checkLoggedIn() {
  try {
    // Look for the prompt textarea (only visible when logged in)
    const textarea = await page.$("#prompt-textarea, [contenteditable][data-placeholder]");
    return textarea !== null;
  } catch {
    return false;
  }
}

// ─── ChatGPT Interaction ───

async function sendPromptAndGetResponse(promptText) {
  // Navigate to the project chat URL to ensure we're in the right conversation
  const currentUrl = page.url();
  if (CHATGPT_URL !== "https://chatgpt.com/" && !currentUrl.startsWith(CHATGPT_URL)) {
    await page.goto(CHATGPT_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
  }

  // Count existing messages before sending
  const messagesBefore = await page.$$('[data-message-author-role="assistant"]');
  const countBefore = messagesBefore.length;

  // Find and fill the textarea
  const textarea = await page.waitForSelector(
    "#prompt-textarea, [contenteditable][data-placeholder]",
    { timeout: 10000 }
  );

  // Clear existing content and paste the prompt
  await textarea.scrollIntoViewIfNeeded();
  await textarea.click({ force: true });
  await page.waitForTimeout(300);

  // Use clipboard paste for large prompts (faster and more reliable)
  await page.evaluate((text) => {
    navigator.clipboard.writeText(text);
  }, promptText);
  await page.keyboard.press("Meta+v"); // macOS paste
  await page.waitForTimeout(500);

  // Verify content was pasted (fallback to typing if clipboard fails)
  const content = await textarea.textContent();
  if (!content || content.trim().length < 10) {
    console.log("[WORKER] Clipboard paste failed, using fill...");
    await textarea.click({ clickCount: 3 });
    await textarea.fill(promptText);
    await page.waitForTimeout(300);
  }

  // Press Enter to send (or click send button)
  console.log("[WORKER] Sending prompt...");
  await page.keyboard.press("Enter");

  // Wait for response to start (new assistant message appears)
  console.log("[WORKER] Waiting for ChatGPT response...");
  const startMs = Date.now();

  // Wait for a stop/generating indicator to appear (response started)
  try {
    await page.waitForSelector(
      'button[aria-label="Stop generating"], button[data-testid="stop-button"], [class*="stop"]',
      { timeout: 30000 }
    );
    console.log("[WORKER] Response generating...");
  } catch {
    // Maybe it was a very fast response, check if new message appeared
    const messagesNow = await page.$$('[data-message-author-role="assistant"]');
    if (messagesNow.length <= countBefore) {
      throw new Error("ChatGPT did not start generating a response within 30s");
    }
  }

  // Wait for response to finish (stop button disappears)
  while (Date.now() - startMs < RESPONSE_TIMEOUT) {
    const stopBtn = await page.$(
      'button[aria-label="Stop generating"], button[data-testid="stop-button"]'
    );
    if (!stopBtn) {
      // No stop button — check that we actually have a new message
      const messagesNow = await page.$$('[data-message-author-role="assistant"]');
      if (messagesNow.length > countBefore) {
        break; // Response is complete
      }
    }
    await page.waitForTimeout(1000);
  }

  if (Date.now() - startMs >= RESPONSE_TIMEOUT) {
    throw new Error(`ChatGPT response timed out after ${RESPONSE_TIMEOUT / 1000}s`);
  }

  // Give it a moment to finalize rendering
  await page.waitForTimeout(1500);

  // Extract the last assistant message
  const responseText = await page.evaluate(() => {
    const msgs = document.querySelectorAll('[data-message-author-role="assistant"]');
    const last = msgs[msgs.length - 1];
    if (!last) return "";

    // Try to get markdown content from the message
    const markdown = last.querySelector(".markdown, .prose, [class*='markdown']");
    if (markdown) return markdown.innerText;

    return last.innerText;
  });

  const durationS = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`[WORKER] Response received (${responseText.length} chars, ${durationS}s)`);

  return responseText.trim();
}

// ─── Queue Processing ───

function findPendingPrompts() {
  const pending = [];

  for (const queueDir of getAllQueueDirs()) {
    if (!fs.existsSync(queueDir)) continue;

    const files = fs.readdirSync(queueDir);
    for (const file of files) {
      if (!file.endsWith(".meta.json")) continue;

      try {
        const meta = JSON.parse(fs.readFileSync(path.join(queueDir, file), "utf8"));
        if (meta.status !== "pending") continue;

        const promptFile = path.join(queueDir, meta.promptFile);
        const responseFile = path.join(queueDir, meta.responseFile);

        if (fs.existsSync(promptFile) && !fs.existsSync(responseFile)) {
          pending.push({ meta, metaFile: file, promptFile, responseFile, queueDir });
        }
      } catch {
        // Skip malformed meta files
      }
    }
  }

  // Sort by creation time (oldest first)
  pending.sort((a, b) => (a.meta.createdAt || "").localeCompare(b.meta.createdAt || ""));
  return pending;
}

async function processPrompt({ meta, metaFile, promptFile, responseFile, queueDir }) {
  const prompt = fs.readFileSync(promptFile, "utf8");
  console.log(`\n[WORKER] ═══ Processing: ${meta.id} ═══`);
  console.log(`[WORKER] Task: ${meta.taskId || "manual"}, Step: ${meta.step || "unknown"}`);
  console.log(`[WORKER] Queue: ${path.basename(path.resolve(queueDir, "../.."))}`);
  console.log(`[WORKER] Prompt: ${prompt.length} chars`);

  try {
    const response = await sendPromptAndGetResponse(prompt);

    if (!response) {
      throw new Error("Empty response from ChatGPT");
    }

    // Write response
    fs.writeFileSync(responseFile, response);

    // Update meta
    const metaPath = path.join(queueDir, metaFile);
    meta.status = "completed";
    meta.completedAt = new Date().toISOString();
    meta.workerType = "chatgpt-browser";
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    console.log(`[WORKER] ✓ Done: ${meta.id} → ${path.basename(responseFile)}`);
  } catch (err) {
    console.error(`[WORKER] ✗ Failed: ${meta.id}: ${err.message}`);

    // Mark as failed in meta (don't retry automatically)
    const metaPath = path.join(queueDir, metaFile);
    meta.status = "failed";
    meta.error = err.message;
    meta.failedAt = new Date().toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  }
}

// ─── Single-Instance Guard ───

function acquireWorkerLock() {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (!isNaN(pid) && pid !== process.pid) {
      try {
        process.kill(pid, 0); // throws if process is dead
        console.error(`[WORKER] Another instance is already running (pid=${pid}). Exiting.`);
        process.exit(0);
      } catch {
        console.log(`[WORKER] Stale PID file (pid=${pid}), taking over.`);
      }
    }
  }
  fs.writeFileSync(PID_FILE, String(process.pid));
}

function releaseWorkerLock() {
  try { fs.rmSync(PID_FILE); } catch {}
}

// ─── Main Loop ───

async function main() {
  const queueDirs = getAllQueueDirs();
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║  ChatGPT Browser Worker                      ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`  Mode: ${HEADED ? "headed (visible)" : "headless"}`);
  console.log(`  Chat: ${CHATGPT_URL}`);
  console.log(`  Queues (${queueDirs.length}):`);
  for (const d of queueDirs) {
    const project = path.basename(path.resolve(d, "../.."));
    console.log(`    - ${project}: ${d}`);
  }
  console.log("");

  acquireWorkerLock();
  await launchBrowser();

  console.log(`[WORKER] Watching queue (poll every ${POLL_INTERVAL / 1000}s)...`);
  console.log("[WORKER] Press Ctrl+C to stop\n");

  // Process loop
  let _cycleCount = 0;
  while (true) {
    _cycleCount++;
    try {
      // Periodic login re-check (every 5 cycles)
      if (_cycleCount % 5 === 0) {
        const stillLoggedIn = await checkLoggedIn();
        if (!stillLoggedIn) {
          console.log("[WORKER] ⚠️  Session expired — navigating to ChatGPT to re-establish...");
          await page.goto(CHATGPT_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
          await page.waitForTimeout(3000);
          if (!await checkLoggedIn()) {
            console.log("[WORKER] ⚠️  Still not logged in. Waiting for manual login...");
            for (let i = 0; i < 60; i++) {
              await page.waitForTimeout(5000);
              if (await checkLoggedIn()) { console.log("[WORKER] ✅ Re-logged in!"); break; }
            }
          }
        }
      }

      const pending = findPendingPrompts();

      if (pending.length > 0) {
        console.log(`[WORKER] Found ${pending.length} pending prompt(s)`);
        for (const item of pending) {
          await processPrompt(item);
          // Small delay between prompts to avoid ChatGPT rate limits
          await page.waitForTimeout(2000);
        }
      }
    } catch (err) {
      console.error(`[WORKER] Queue processing error: ${err.message}`);

      // Try to recover browser if it crashed
      if (err.message.includes("Target closed") || err.message.includes("Browser")) {
        console.log("[WORKER] Browser crashed, relaunching...");
        try { await browser?.close(); } catch {}
        await launchBrowser();
      }
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[WORKER] Shutting down...");
  try { await browser?.close(); } catch {}
  releaseWorkerLock();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  try { await browser?.close(); } catch {}
  releaseWorkerLock();
  process.exit(0);
});

main().catch((err) => {
  console.error("[WORKER] Fatal error:", err);
  process.exit(1);
});
