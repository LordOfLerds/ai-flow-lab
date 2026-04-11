/**
 * cowork-test.mjs — Phase 2: Cowork Test Step
 *
 * Validates executor output by:
 * 1. Generating a structured test prompt from task spec + code changes
 * 2. Running Claude CLI to analyze code and check acceptance criteria
 * 3. Parsing the structured JSON report
 * 4. Creating bug tasks automatically on failure
 *
 * Usage: node scripts/cowork-test.mjs <TASK_ID>
 *
 * Reads: task JSON, spec, brief, executor report, written files, snapshot
 * Writes: state/cowork-tests/CT-{taskId}.result.json
 * Sets state: TESTED (pass) or TEST_FAILED (fail)
 */

import {
  loadTask,
  saveTask,
  readRepoFile,
  repoRoot,
  automationRoot,
  estimateTokens,
  logUsage
} from "./_llm-utils.mjs";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const taskId = process.argv[2];
if (!taskId) {
  console.error("Usage: node scripts/cowork-test.mjs <TASK_ID>");
  process.exit(1);
}

// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════

const CONFIG = {
  timeout_ms: 300000,       // 5 min for tool-enabled test analysis
  model: "claude-sonnet-4-20250514",
  max_prompt_chars: 50000,  // Cap prompt size (leaner with tool access)
  results_dir: "cowork-tests"
};

// Try loading project config overrides
try {
  const configPath = path.join(repoRoot(), "project.config.yaml");
  if (fs.existsSync(configPath)) {
    // Basic YAML parsing for cowork_test section
    const yaml = fs.readFileSync(configPath, "utf8");
    const timeoutMatch = yaml.match(/timeout_ms:\s*(\d+)/);
    if (timeoutMatch) CONFIG.timeout_ms = parseInt(timeoutMatch[1]);
    const modelMatch = yaml.match(/cowork_test[\s\S]*?model:\s*"?([^"\n]+)"?/);
    if (modelMatch) CONFIG.model = modelMatch[1].trim();
  }
} catch (_) {}

// ═══════════════════════════════════════════════
// PROMPT GENERATION
// ═══════════════════════════════════════════════

function buildTestPrompt(task) {
  const sections = [];

  sections.push(`# Cowork Test — Code Review & Validation`);
  sections.push(`\nYou are a QA engineer testing a code change produced by an automated pipeline. Your job is to determine whether the executor's output meets the specification and does not introduce regressions.`);
  sections.push(`\nYou have access to Read, Glob, and Grep tools. USE THEM to inspect the actual source files, verify function existence, check for syntax errors, and validate acceptance criteria. Do not rely solely on the summaries below — read the actual code.\n`);

  // Task info
  sections.push(`## Task\n**${task.title}** (${task.task_id})\n`);
  if (task.description) {
    sections.push(`**Description:** ${task.description}\n`);
  }

  // Spec (what was supposed to be built)
  if (task.spec_path) {
    try {
      const spec = readRepoFile(task.spec_path);
      if (spec) {
        sections.push(`## Specification (what was supposed to be built)\n\`\`\`\n${truncate(spec, 20000)}\n\`\`\`\n`);
      }
    } catch (_) {}
  }

  // Implementation brief (synthesized plan)
  if (task.brief_path) {
    try {
      const brief = readRepoFile(task.brief_path);
      if (brief) {
        sections.push(`## Implementation Brief (synthesized plan)\n\`\`\`\n${truncate(brief, 10000)}\n\`\`\`\n`);
      }
    } catch (_) {}
  }

  // Executor report (what files were written)
  if (task.result_path) {
    try {
      const report = readRepoFile(task.result_path);
      if (report) {
        sections.push(`## Executor Report\n\`\`\`\n${truncate(report, 5000)}\n\`\`\`\n`);
      }
    } catch (_) {}
  }

  // Written file list (Claude will use Read tool to inspect actual content)
  const writtenFiles = collectWrittenFiles(task);
  if (writtenFiles.length > 0) {
    sections.push(`## Written Files (use Read tool to inspect these)\n`);
    for (const { relativePath, content } of writtenFiles) {
      const lineCount = content.split('\n').length;
      const funcNames = extractFunctionNames(content);
      sections.push(`- **${relativePath}** (${lineCount} lines, ${funcNames.length} functions: ${funcNames.slice(0, 15).join(', ')}${funcNames.length > 15 ? '...' : ''})`);
    }
    sections.push(`\nRead these files with the Read tool to verify acceptance criteria.\n`);
  }

  // Snapshot diff (what changed)
  const snapshotDiff = buildSnapshotDiff(task);
  if (snapshotDiff) {
    sections.push(`## Snapshot Diff (before → after execution)\n${snapshotDiff}\n`);
  }

  // Guardrail result (why this test was triggered)
  if (task.guardrail_result) {
    sections.push(`## Guardrail Result\nLevel: **${task.guardrail_result.level}**\nIssues:\n`);
    for (const issue of (task.guardrail_result.issues || [])) {
      sections.push(`- [${issue.severity}] ${issue.file}: ${issue.reason}`);
    }
    sections.push('');
  }

  // Instructions
  sections.push(`## Instructions

1. Read the specification carefully. Identify ALL acceptance criteria.
2. Read the written code. Check that EVERY acceptance criterion is met.
3. Check for regressions: are any existing functions missing or broken?
4. Check for common issues: syntax errors, missing imports, broken references, unclosed tags.
5. If the guardrail flagged specific issues, verify whether those issues are real problems or false positives.
6. Be thorough but fair — minor style differences are not failures.

## Output Format

Respond with EXACTLY this JSON (no markdown fences, no extra text before or after):
{
  "result": "PASS" or "FAIL",
  "summary": "One-sentence summary of your findings",
  "checks": [
    { "criterion": "description of what was checked", "status": "PASS" or "FAIL", "detail": "explanation" }
  ],
  "regressions": ["description of any regression found"],
  "bugs_to_create": [
    { "title": "Bug title", "description": "What is wrong and how to fix it", "lane_type": "bug-lane" }
  ]
}

IMPORTANT: Output ONLY the JSON object. No markdown code fences. No explanation before or after.`);

  let prompt = sections.join('\n');

  // Truncate if too long
  if (prompt.length > CONFIG.max_prompt_chars) {
    prompt = prompt.substring(0, CONFIG.max_prompt_chars) + '\n\n[TRUNCATED — prompt exceeded max length]';
  }

  return prompt;
}

function collectWrittenFiles(task) {
  const files = [];
  const worktree = task.worktree_path ? path.resolve(repoRoot(), task.worktree_path) : repoRoot();

  // Try to get written files list from executor report
  if (task.result_path) {
    try {
      const report = readRepoFile(task.result_path);
      if (report) {
        // Parse "Wrote: filename" lines from executor report
        const wroteMatches = report.matchAll(/Wrote:\s*(.+?)(?:\s*\(|$)/gm);
        for (const m of wroteMatches) {
          const relPath = m[1].trim();
          const fullPath = path.join(worktree, relPath);
          if (fs.existsSync(fullPath)) {
            try {
              const content = fs.readFileSync(fullPath, "utf8");
              files.push({ relativePath: relPath, content });
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  // Fallback: check snapshot for file list
  if (files.length === 0 && task.guardrail_result?.issues) {
    for (const issue of task.guardrail_result.issues) {
      const fullPath = path.join(worktree, issue.file);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          files.push({ relativePath: issue.file, content });
        } catch (_) {}
      }
    }
  }

  return files;
}

function buildSnapshotDiff(task) {
  if (!task.snapshot_path) return null;

  const snapshotFile = path.join(repoRoot(), task.snapshot_path);
  if (!fs.existsSync(snapshotFile)) return null;

  try {
    const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
    const worktree = task.worktree_path ? path.resolve(repoRoot(), task.worktree_path) : repoRoot();
    const diffs = [];

    for (const [relPath, snapData] of Object.entries(snapshot)) {
      const currentPath = path.join(worktree, relPath);
      const currentExists = fs.existsSync(currentPath);

      if (!currentExists) {
        diffs.push(`### ${relPath}\n**DELETED** (was ${snapData.lineCount} lines)`);
        continue;
      }

      const currentContent = fs.readFileSync(currentPath, "utf8");
      const currentLines = currentContent.split('\n').length;
      const snapFunctions = snapData.functions || [];

      // Check for function changes
      const currentFunctions = extractFunctionNames(currentContent);
      const missing = snapFunctions.filter(f => !currentFunctions.includes(f));
      const added = currentFunctions.filter(f => !snapFunctions.includes(f));

      if (missing.length > 0 || added.length > 0 || Math.abs(currentLines - snapData.lineCount) > 10) {
        let diff = `### ${relPath}\n`;
        diff += `Lines: ${snapData.lineCount} → ${currentLines}\n`;
        if (missing.length > 0) diff += `Functions REMOVED: ${missing.join(', ')}\n`;
        if (added.length > 0) diff += `Functions ADDED: ${added.join(', ')}\n`;
        diffs.push(diff);
      }
    }

    return diffs.length > 0 ? diffs.join('\n') : null;
  } catch (_) {
    return null;
  }
}

function extractFunctionNames(code) {
  const names = [];
  // function declarations
  const funcDecl = code.matchAll(/function\s+([a-zA-Z_$][\w$]*)\s*\(/g);
  for (const m of funcDecl) names.push(m[1]);
  // const/let/var arrow functions
  const arrowFn = code.matchAll(/(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g);
  for (const m of arrowFn) names.push(m[1]);
  // class methods
  const methods = code.matchAll(/^\s+(async\s+)?([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{/gm);
  for (const m of methods) if (!['if', 'for', 'while', 'switch', 'catch'].includes(m[2])) names.push(m[2]);
  return [...new Set(names)];
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || '';
  return str.substring(0, maxLen) + '\n... [truncated]';
}

// ═══════════════════════════════════════════════
// CLI INVOCATION & REPORT PARSING
// ═══════════════════════════════════════════════

async function runClaudeTest(prompt, task) {
  const model = CONFIG.model;
  const startMs = Date.now();

  // Write prompt to file
  const testsDir = path.join(automationRoot(), "state", CONFIG.results_dir);
  fs.mkdirSync(testsDir, { recursive: true });
  const promptFile = path.join(testsDir, `CT-${taskId}.prompt.md`);
  fs.writeFileSync(promptFile, prompt);

  console.log(`[COWORK-TEST] Prompt written (${prompt.length} chars) → ${promptFile}`);
  console.log(`[COWORK-TEST] Launching Claude CLI (model: ${model}, timeout: ${CONFIG.timeout_ms}ms)...`);

  try {
    // Use tool-enabled mode: Claude can Read files to verify code, Grep for patterns, etc.
    const cmd = `cat "${promptFile}" | claude --print --model "${model}" --output-format json --allowed-tools "Read,Glob,Grep" --permission-mode acceptEdits --max-budget-usd 1.00`;
    const { stdout } = await execFileAsync("bash", ["-c", cmd], {
      cwd: repoRoot(),
      timeout: CONFIG.timeout_ms,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env }
    });

    const rawOutput = (stdout || "").trim();
    const durationMs = Date.now() - startMs;

    // Parse JSON output if available, otherwise treat as plain text
    let raw;
    let costUsd = 0;
    let numTurns = 1;
    try {
      const jsonResult = JSON.parse(rawOutput);
      raw = jsonResult.result || "";
      costUsd = jsonResult.total_cost_usd || 0;
      numTurns = jsonResult.num_turns || 1;
      console.log(`[COWORK-TEST] CLI response received (${raw.length} chars, ${numTurns} turns, ${durationMs}ms, $${costUsd.toFixed(4)})`);
    } catch (_) {
      raw = rawOutput;
      console.log(`[COWORK-TEST] CLI response received (${raw.length} chars, ${durationMs}ms, plain text)`);
    }

    // Log usage
    logUsage({
      taskId,
      step: "cowork-test",
      provider: "claude-cli-tools",
      model,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(raw),
      durationMs,
      costUsd,
      numTurns
    });

    return raw;
  } catch (err) {
    const durationMs = Date.now() - startMs;
    if (err.killed) {
      throw new Error(`Claude CLI timed out after ${durationMs}ms (limit: ${CONFIG.timeout_ms}ms)`);
    }
    throw new Error(`Claude CLI error: ${err.message}`);
  }
}

function parseTestReport(raw) {
  // Try to extract JSON from the response
  let jsonStr = raw;

  // Strip markdown code fences if present
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Try to find JSON object boundaries
  const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonObjMatch) {
    jsonStr = jsonObjMatch[0];
  }

  try {
    const report = JSON.parse(jsonStr);

    // Validate required fields
    if (!report.result || !['PASS', 'FAIL'].includes(report.result)) {
      console.warn(`[COWORK-TEST] Invalid result field: "${report.result}" — treating as FAIL`);
      report.result = 'FAIL';
    }
    if (!report.summary) report.summary = 'No summary provided';
    if (!Array.isArray(report.checks)) report.checks = [];
    if (!Array.isArray(report.regressions)) report.regressions = [];
    if (!Array.isArray(report.bugs_to_create)) report.bugs_to_create = [];

    return report;
  } catch (parseErr) {
    console.error(`[COWORK-TEST] Failed to parse JSON report: ${parseErr.message}`);
    console.error(`[COWORK-TEST] Raw response (first 500 chars): ${raw.substring(0, 500)}`);

    // Return a FAIL report with the raw output as diagnosis
    return {
      result: 'FAIL',
      summary: `Test report was not valid JSON — manual review needed`,
      checks: [],
      regressions: [],
      bugs_to_create: [],
      raw_output: raw.substring(0, 5000),
      parse_error: parseErr.message
    };
  }
}

// ═══════════════════════════════════════════════
// BUG TASK CREATION
// ═══════════════════════════════════════════════

function createBugTask(bugSpec, parentTaskId) {
  const tasksDir = path.join(automationRoot(), "state", "tasks");

  // Find next bug task ID
  const existingIds = fs.readdirSync(tasksDir)
    .filter(f => f.match(/^T-\d+\.json$/))
    .map(f => parseInt(f.match(/^T-(\d+)/)[1]))
    .sort((a, b) => b - a);
  const nextId = (existingIds[0] || 0) + 1;
  const bugTaskId = `T-${String(nextId).padStart(4, '0')}`;

  const bugTask = {
    task_id: bugTaskId,
    title: bugSpec.title,
    description: bugSpec.description,
    repo: "ai-flow-lab",
    lane_type: bugSpec.lane_type || "bug-lane",
    executor: "claude",
    parent_task_id: parentTaskId,
    origin: "cowork-test",
    state: "NEW",
    runtime_status: "IDLE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const taskFile = path.join(tasksDir, `${bugTaskId}.json`);
  fs.writeFileSync(taskFile, JSON.stringify(bugTask, null, 2));
  console.log(`[COWORK-TEST] Created bug task ${bugTaskId}: ${bugSpec.title}`);

  return bugTaskId;
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// HAIKU PRE-CHECK (cost gate)
// ═══════════════════════════════════════════════

function buildHaikuPreCheckPrompt(task) {
  const parts = [`You are a fast triage checker. Determine if this code change needs a full detailed test or if it's clearly safe.`];
  parts.push(`\nTask: ${task.title} (${task.task_id})`);
  if (task.description) parts.push(`Description: ${task.description}`);
  parts.push(`Lane: ${task.lane_type || 'unknown'}`);

  // Guardrail summary
  if (task.guardrail_result) {
    parts.push(`\nGuardrail level: ${task.guardrail_result.level}`);
    for (const issue of (task.guardrail_result.issues || [])) {
      parts.push(`- [${issue.severity}] ${issue.file}: ${issue.reason}`);
    }
  }

  // Brief summary (truncated heavily)
  if (task.brief_path) {
    try {
      const brief = readRepoFile(task.brief_path);
      if (brief) parts.push(`\nBrief (summary):\n${truncate(brief, 3000)}`);
    } catch (_) {}
  }

  // Executor report (truncated)
  if (task.result_path) {
    try {
      const report = readRepoFile(task.result_path);
      if (report) parts.push(`\nExecutor report:\n${truncate(report, 2000)}`);
    } catch (_) {}
  }

  parts.push(`\nRespond with ONLY this JSON (no markdown fences):
{
  "needs_full_test": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "one sentence explaining your decision"
}

Set needs_full_test=false ONLY if the change is clearly safe: cosmetic, docs-only, config tweaks, trivial renames. When in doubt, set needs_full_test=true.`);

  return parts.join('\n');
}

async function runHaikuPreCheck(task) {
  const prompt = buildHaikuPreCheckPrompt(task);
  const startMs = Date.now();

  console.log(`[COWORK-TEST] Running Haiku pre-check (${prompt.length} chars)...`);

  try {
    const cmd = `echo ${JSON.stringify(prompt)} | claude --print --model "claude-haiku-4-5-20251001" --max-turns 1`;
    const { stdout } = await execFileAsync("bash", ["-c", cmd], {
      cwd: repoRoot(),
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env }
    });

    const raw = (stdout || "").trim();
    const durationMs = Date.now() - startMs;

    // Log usage
    logUsage({
      taskId,
      step: "cowork-test-precheck",
      provider: "claude-cli",
      model: "claude-haiku-4-5-20251001",
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(raw),
      durationMs,
      costUsd: 0.01
    });

    // Parse JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log(`[COWORK-TEST] Haiku pre-check: needs_full_test=${result.needs_full_test}, confidence=${result.confidence}, reason="${result.reason}" (${durationMs}ms)`);
      return result;
    }
  } catch (err) {
    console.warn(`[COWORK-TEST] Haiku pre-check failed (${err.message}) — falling through to full test`);
  }

  // Default: run full test
  return { needs_full_test: true, confidence: 0, reason: "pre-check failed or unparseable" };
}

const task = loadTask(taskId);
if (!task) {
  console.error(`Task ${taskId} not found`);
  process.exit(1);
}

console.log(`\n🧪 Cowork Test: ${taskId} — ${task.title}`);
console.log(`   State: ${task.state}, Guardrail: ${task.guardrail_result?.level || 'n/a'}`);

// 0. Haiku pre-check gate
const skipPreCheck = process.argv.includes('--force');
if (!skipPreCheck) {
  const preCheck = await runHaikuPreCheck(task);
  if (!preCheck.needs_full_test && preCheck.confidence > 0.8) {
    console.log(`[COWORK-TEST] ✅ Haiku pre-check PASSED with high confidence (${preCheck.confidence}) — skipping full Sonnet test`);
    console.log(`   Reason: ${preCheck.reason}`);
    task.state = 'TESTED';
    task.test_result = {
      result: 'PASS',
      summary: `Haiku pre-check: ${preCheck.reason}`,
      pre_check: true,
      confidence: preCheck.confidence,
      tested_at: new Date().toISOString()
    };
    saveTask(taskId, task);
    console.log(`[COWORK-TEST] Task ${taskId} updated: state=${task.state}`);
    process.exit(0);
  }
  console.log(`[COWORK-TEST] Haiku pre-check says full test needed — proceeding with Sonnet...`);
}

// 1. Build test prompt
const prompt = buildTestPrompt(task);
console.log(`[COWORK-TEST] Prompt generated (${prompt.length} chars)`);

// 2. Run Claude CLI
let rawResponse;
try {
  rawResponse = await runClaudeTest(prompt, task);
} catch (err) {
  console.error(`[COWORK-TEST] CLI execution failed: ${err.message}`);
  task.state = 'TEST_FAILED';
  task.last_error = {
    step: 'cowork-test',
    message: err.message,
    timestamp: new Date().toISOString()
  };
  saveTask(taskId, task);
  process.exit(1);
}

// 3. Parse report
const report = parseTestReport(rawResponse);

// 4. Save result
const resultsDir = path.join(automationRoot(), "state", CONFIG.results_dir);
fs.mkdirSync(resultsDir, { recursive: true });
const resultFile = path.join(resultsDir, `CT-${taskId}.result.json`);
const fullResult = {
  task_id: taskId,
  ...report,
  tested_at: new Date().toISOString(),
  prompt_chars: prompt.length,
  response_chars: rawResponse.length
};
fs.writeFileSync(resultFile, JSON.stringify(fullResult, null, 2));
console.log(`[COWORK-TEST] Result saved → ${resultFile}`);

// 5. Log results
console.log(`\n${'='.repeat(50)}`);
console.log(`🧪 TEST RESULT: ${report.result}`);
console.log(`   Summary: ${report.summary}`);
if (report.checks.length > 0) {
  console.log(`   Checks:`);
  for (const c of report.checks) {
    console.log(`     ${c.status === 'PASS' ? '✅' : '❌'} ${c.criterion}: ${c.detail || ''}`);
  }
}
if (report.regressions.length > 0) {
  console.log(`   Regressions: ${report.regressions.join('; ')}`);
}
console.log(`${'='.repeat(50)}\n`);

// 6. Update task state
if (report.result === 'PASS') {
  task.state = 'TESTED';
  task.test_result = { result: 'PASS', summary: report.summary, tested_at: new Date().toISOString() };
  console.log(`[COWORK-TEST] ✅ PASSED — task ready for merge`);
} else {
  task.state = 'TEST_FAILED';
  task.failed_step = 'cowork-test';
  task.test_result = {
    result: 'FAIL',
    summary: report.summary,
    checks: report.checks,
    regressions: report.regressions,
    tested_at: new Date().toISOString()
  };
  task.last_error = {
    step: 'cowork-test',
    message: `Cowork test failed: ${report.summary}`,
    timestamp: new Date().toISOString()
  };

  // 7. Auto-create bug tasks
  const createdBugs = [];
  for (const bugSpec of report.bugs_to_create) {
    if (bugSpec.title && bugSpec.description) {
      const bugId = createBugTask(bugSpec, taskId);
      createdBugs.push(bugId);
    }
  }
  if (createdBugs.length > 0) {
    task.test_result.created_bugs = createdBugs;
    console.log(`[COWORK-TEST] Created ${createdBugs.length} bug task(s): ${createdBugs.join(', ')}`);
  }
  console.log(`[COWORK-TEST] ❌ FAILED — task marked TEST_FAILED`);
}

saveTask(taskId, task);
console.log(`[COWORK-TEST] Task ${taskId} updated: state=${task.state}`);
