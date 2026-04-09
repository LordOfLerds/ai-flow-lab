#!/usr/bin/env node
// Quick test: is claude CLI available and working?
import { execFileSync, execSync } from "node:child_process";

console.log("=== Claude CLI Test ===\n");

// 1. Check if claude is in PATH
try {
  const which = execSync("which claude", { encoding: "utf8" }).trim();
  console.log(`✓ claude found at: ${which}`);
} catch {
  console.log("✗ claude NOT in PATH — 'which claude' failed");
  console.log("  → Install Claude Code: npm install -g @anthropic-ai/claude-code");
  process.exit(1);
}

// 2. Check claude version
try {
  const version = execSync("claude --version", { encoding: "utf8", timeout: 10000 }).trim();
  console.log(`✓ claude version: ${version}`);
} catch (e) {
  console.log(`✗ claude --version failed: ${e.message}`);
}

// 3. Quick test: claude --print with a simple prompt
console.log("\n--- Testing claude --print (simple echo test) ---");
try {
  const result = execFileSync("claude", [
    "--print",
    "--output-format", "text"
  ], {
    input: "Reply with exactly: CLI_TEST_OK",
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 1024 * 1024
  });
  const trimmed = result.trim();
  console.log(`✓ Response: ${trimmed.substring(0, 200)}`);
  if (trimmed.includes("CLI_TEST_OK")) {
    console.log("✓ Claude CLI is WORKING!");
  } else {
    console.log("⚠ Response doesn't contain CLI_TEST_OK but CLI is responding");
  }
} catch (e) {
  console.log(`✗ claude --print FAILED: ${e.message}`);
  if (e.code === "ENOENT") {
    console.log("  → claude binary not found in PATH");
  } else if (e.killed) {
    console.log("  → Process was killed (timeout?)");
  }
}

console.log("\n=== Test Complete ===");
