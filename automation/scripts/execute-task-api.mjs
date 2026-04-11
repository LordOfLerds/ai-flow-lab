import {
  loadTask,
  saveTask,
  ensureTaskPaths,
  readRepoFile,
  writeRepoFile,
  callLLMForStep,
  discoverSourceContext,
  repoRoot,
  automationRoot,
  addFrontmatter
} from "./_llm-utils.mjs";
import fs from "node:fs";
import path from "node:path";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/execute-task-api.mjs <TASK_ID>");
  process.exit(1);
}

// ═══════════════════════════════════════════════
// FILE SAFETY GUARDRAIL FUNCTIONS
// ═══════════════════════════════════════════════

function snapshotSourceFiles(rootDir) {
  const snapshot = {};
  const extensions = new Set(['.html', '.js', '.ts', '.tsx', '.jsx', '.css', '.mjs', '.json', '.mts']);
  // Directories to skip entirely (never descend into these)
  const skipDirs = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.turbo', '.vercel', 'coverage', '__pycache__']);
  // Path substrings to skip (relative paths containing these are ignored)
  const skipPathPatterns = ['automation/state/', 'automation/test-fixtures/', 'automation/ui/', '.ai-flow-lab/'];
  const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
  const MIN_LINES = 10;
  const MAX_FILES = 2000; // Safety cap to prevent scanning enormous repos

  function extractFunctions(content) {
    const fnNames = [];
    const patterns = [
      /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:function|\()/g,
      /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?function/g,
      /export\s+(?:default\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(content)) !== null) fnNames.push(m[1]);
    }
    return [...new Set(fnNames)];
  }

  function walkDir(dir, depth) {
    if (depth > 12 || Object.keys(snapshot).length >= MAX_FILES) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (Object.keys(snapshot).length >= MAX_FILES) break;

      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name) || entry.name.startsWith('.')) continue;
        walkDir(path.join(dir, entry.name), depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (!extensions.has(ext)) continue;

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(rootDir, fullPath);

        // Skip paths matching exclusion patterns
        if (skipPathPatterns.some(p => relativePath.includes(p))) continue;

        try {
          const stat = fs.statSync(fullPath);
          if (stat.size > MAX_FILE_SIZE || stat.size === 0) continue;
          const content = fs.readFileSync(fullPath, 'utf8');
          const lineCount = content.split('\n').length;
          if (lineCount < MIN_LINES) continue;

          const functions = extractFunctions(content);
          snapshot[relativePath] = { lineCount, sizeBytes: stat.size, content, functions };
        } catch {
          // Skip unreadable files — don't break the pipeline
        }
      }
    }
  }

  try {
    walkDir(rootDir, 0);
  } catch (e) {
    console.warn('⚠️  Snapshot creation failed (non-blocking):', e.message);
  }
  return snapshot;
}

const PLACEHOLDER_PATTERNS = [
  /\.{3}\s*\[content\s+continues/i,
  /\/\/\s*TODO:\s*rest\s+of\s+file/i,
  /\/\/\s*\.{3}\s*existing\s+code/i,
  /\[content\s+identical/i,
  /\/\/\s*\.{3}\s*\[content/i,
  /continues\s+identical\s+to\s+working/i,
  /\/\/\s*\.\.\.\s*\[content\s+continues\s+identical\s+to\s+working\s+copy\]/i,
  /<!--\s*\.\.\.\s*rest\s+of\s+file/i,
  /<!--\s*content\s+continues/i
];

// Threshold config (can be overridden by project.config.yaml cowork_test.thresholds)
const THRESHOLDS = {
  yellow_fn_missing: 1,      // >= this many missing functions → yellow
  red_fn_missing_pct: 0.10,  // >= this % of functions missing → red
  yellow_line_shrink: 0.90,  // line ratio < this → yellow
  red_line_shrink: 0.70      // line ratio < this → red
};

function validateWrittenFiles(writtenFiles, snapshot, repoRoot) {
  const issues = [];

  for (const filePath of writtenFiles) {
    const prev = snapshot[filePath];
    if (!prev) continue; // New file — no baseline to compare

    try {
      const fullPath = path.join(repoRoot, filePath);
      const newContent = fs.readFileSync(fullPath, 'utf8');
      const newLines = newContent.split('\n').length;
      const ratio = newLines / prev.lineCount;

      // Check 1: Line count shrinkage
      if (ratio < THRESHOLDS.red_line_shrink) {
        issues.push({
          file: filePath,
          reason: `Line count dropped from ${prev.lineCount} to ${newLines} (${(ratio * 100).toFixed(0)}%)`,
          severity: 'red'
        });
      } else if (ratio < THRESHOLDS.yellow_line_shrink) {
        issues.push({
          file: filePath,
          reason: `Line count dropped from ${prev.lineCount} to ${newLines} (${(ratio * 100).toFixed(0)}%)`,
          severity: 'yellow'
        });
      }

      // Check 2: Placeholder/truncation patterns (always red)
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(newContent)) {
          issues.push({
            file: filePath,
            reason: `Contains placeholder pattern: ${pattern.source}`,
            severity: 'red'
          });
          break;
        }
      }

      // Check 3: Function/class existence — detect feature deletion
      if (prev.functions && prev.functions.length > 0) {
        const newFns = new Set();
        const fnPatterns = [
          /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
          /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:function|\()/g,
          /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
          /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?function/g
        ];
        for (const pat of fnPatterns) {
          let m;
          while ((m = pat.exec(newContent)) !== null) newFns.add(m[1]);
        }
        const missingFns = prev.functions.filter(fn => !newFns.has(fn));
        const missingRatio = prev.functions.length > 0 ? missingFns.length / prev.functions.length : 0;

        if (missingFns.length >= THRESHOLDS.yellow_fn_missing && missingRatio >= THRESHOLDS.red_fn_missing_pct) {
          issues.push({
            file: filePath,
            reason: `${missingFns.length}/${prev.functions.length} functions missing: ${missingFns.slice(0, 8).join(', ')}${missingFns.length > 8 ? '...' : ''}`,
            severity: 'red',
            missingFunctions: missingFns
          });
        } else if (missingFns.length >= THRESHOLDS.yellow_fn_missing) {
          issues.push({
            file: filePath,
            reason: `${missingFns.length} function(s) changed/missing: ${missingFns.join(', ')}`,
            severity: 'yellow',
            missingFunctions: missingFns
          });
        }
      }
    } catch (e) {
      console.warn(`⚠️  Validation failed for ${filePath}: ${e.message}`);
    }
  }
  return issues;
}

/**
 * Classify guardrail issues into green/yellow/red threshold.
 * - green: no issues
 * - yellow: 1-2 functions changed, minor shrinkage → needs Cowork test
 * - red: >10% functions missing, severe shrinkage, placeholders → needs user decision
 */
function classifyGuardrailResult(issues) {
  if (issues.length === 0) return { level: 'green', issues: [] };
  const hasRed = issues.some(i => i.severity === 'red');
  if (hasRed) return { level: 'red', issues };
  return { level: 'yellow', issues };
}

function restoreFromSnapshot(issues, snapshot, repoRoot) {
  const restored = [];
  for (const issue of issues) {
    if (issue.severity !== 'critical') continue;
    const prev = snapshot[issue.file];
    if (!prev) continue;

    try {
      const fullPath = path.join(repoRoot, issue.file);
      fs.writeFileSync(fullPath, prev.content, 'utf8');
      restored.push(issue.file);
      console.warn(`  → Restored ${issue.file} from pre-execution snapshot`);
    } catch (e) {
      console.error(`  → Failed to restore ${issue.file}: ${e.message}`);
    }
  }
  return restored;
}

// ═══════════════════════════════════════════════
// MAIN EXECUTION FLOW
// ═══════════════════════════════════════════════

let task = loadTask(taskId);
task = ensureTaskPaths(task, taskId);

const brief = readRepoFile(task.brief_path);
const spec = readRepoFile(task.spec_path);

if (!brief.trim() && !spec.trim()) {
  throw new Error(`Neither brief nor spec found for ${taskId}`);
}

// Load goal context if task belongs to a goal
let goalContext = "";
if (task.parent_goal_id) {
  const goalMd = readRepoFile(`goals/${task.parent_goal_id}.md`);
  if (goalMd) goalContext += `\n[goals/${task.parent_goal_id}.md]\n${goalMd}\n`;
}

// SAFETY STEP 1: Take snapshot of existing source files before LLM call
const snapshot = snapshotSourceFiles(repoRoot());
console.log(`📸 Snapshotted ${Object.keys(snapshot).length} source files`);

// Build a snapshot summary so the LLM knows what files exist
const snapshotSummary = Object.entries(snapshot).map(([file, info]) =>
  `  ${file}: ${info.lineCount} lines, ${info.functions.length} functions [${info.functions.slice(0, 8).join(', ')}${info.functions.length > 8 ? '...' : ''}]`
).join('\n');

// SAFETY STEP 2: Check for file conflicts with other active tasks
let conflictWarning = '';
{
  const tasksDir = path.join(automationRoot(), 'state', 'tasks');
  const taskFiles = task.written_files || [];
  if (taskFiles.length > 0 && fs.existsSync(tasksDir)) {
    const otherTasks = fs.readdirSync(tasksDir)
      .filter(f => /^T-\d+\.json$/.test(f) && f !== `${taskId}.json`)
      .map(f => { try { return JSON.parse(fs.readFileSync(path.join(tasksDir, f), 'utf8')); } catch(_) { return null; } })
      .filter(t => t && t.written_files && t.written_files.length > 0
        && !['MERGED', 'FAILED', 'CANCELLED'].includes(t.state));
    const myFiles = new Set(taskFiles.map(f => f.replace(/^.*\//, '')));
    const conflicts = [];
    for (const other of otherTasks) {
      const otherFiles = (other.written_files || []).map(f => f.replace(/^.*\//, ''));
      const shared = otherFiles.filter(f => myFiles.has(f));
      if (shared.length > 0) {
        conflicts.push({ taskId: other.task_id, title: other.title, state: other.state, sharedFiles: shared });
      }
    }
    if (conflicts.length > 0) {
      console.log(`\n⚠️  FILE CONFLICT DETECTED: ${conflicts.length} other task(s) touch the same files`);
      conflictWarning = '\n\n⚠️ FILE CONFLICT WARNING — Other active tasks modify the same files:\n' +
        conflicts.map(c => `  - ${c.taskId} "${c.title}" (${c.state}) — shared: ${c.sharedFiles.join(', ')}`).join('\n') +
        '\n  → Do NOT contradict or undo changes from these tasks. Read the files first to see their current state.\n';
      for (const c of conflicts) {
        console.log(`   → ${c.taskId} (${c.state}): ${c.sharedFiles.join(', ')}`);
      }
    }
  }
}

// ═══════════════════════════════════════════════
// TOOL-BASED EXECUTION (Claude reads/edits files directly)
// ═══════════════════════════════════════════════
// Claude gets Read/Edit/Write tools — it reads the source files itself,
// makes targeted edits, and writes new files. No need to dump file contents
// into the prompt or parse file blocks from the output.

const instructions = `You are the code executor for a software project.
Your job is to IMPLEMENT the task by reading and editing project files directly.

You have access to Read, Edit, Write, Glob, and Grep tools. USE THEM:
- Read files to understand the existing code before making changes
- Use Edit for surgical modifications to existing files (preferred)
- Use Write only for brand-new files
- Use Glob/Grep to find relevant code sections

EXISTING PROJECT FILES:
${snapshotSummary || '  (no existing files — this may be the first task)'}

CRITICAL RULES:
1. READ before you EDIT. Always read a file first to understand its structure.
2. Make TARGETED edits. Do not rewrite entire files — edit only the sections that need to change.
3. NEVER remove or rename existing functions, classes, or methods unless the spec explicitly says to.
4. Preserve all existing functionality. A safety system counts functions before/after — missing functions = rejection.
5. Follow the spec and implementation brief exactly. Do not add features not in the spec.
6. Write clean, well-commented, production-ready code.
7. After making all changes, list every file you created or modified.

When you are done, output a STRUCTURED EXECUTION REPORT:

## Execution Report

### What was done
- List every file created or modified and what change was made

### What was NOT done
- List any spec requirements that were intentionally skipped or deferred

### Issues discovered
- List any bugs, inconsistencies, or risks found during implementation

### Suggested follow-ups
- List concrete follow-up tasks (with lane_type: feature-lane, bug-lane, etc.)`;

const input = `
Task: ${task.task_id} — ${task.title}
Lane: ${task.lane_type}

Implementation Brief:
${brief || "(no brief — using spec)"}

Spec:
${spec}
${goalContext ? `\nGoal context:\n${goalContext}` : ""}
${conflictWarning}
Implement this task now. Read the relevant source files, make the necessary code changes using Edit/Write tools, then provide the execution report.
`;

// Route to the correct LLM based on executor_routing config
const text = await callLLMForStep({
  instructions,
  input,
  taskId,
  step: "execute",
  laneType: task.lane_type || "feature-lane"
});

// ═══════════════════════════════════════════════
// DETECT WRITTEN FILES VIA SNAPSHOT DIFF
// ═══════════════════════════════════════════════
// With tool-based execution, Claude edits files directly via Read/Edit/Write tools.
// We detect which files changed by comparing the post-execution state to the snapshot.
const writtenFiles = [];
const postSnapshot = snapshotSourceFiles(repoRoot());

for (const [file, postInfo] of Object.entries(postSnapshot)) {
  const preInfo = snapshot[file];
  if (!preInfo) {
    // New file created
    writtenFiles.push(file);
    console.log(`  [NEW] ${file} (${postInfo.lineCount} lines, ${postInfo.functions.length} functions)`);
  } else if (preInfo.content !== postInfo.content) {
    // Existing file modified
    const lineDiff = postInfo.lineCount - preInfo.lineCount;
    const funcDiff = postInfo.functions.length - preInfo.functions.length;
    writtenFiles.push(file);
    console.log(`  [MOD] ${file} (${lineDiff >= 0 ? '+' : ''}${lineDiff} lines, ${funcDiff >= 0 ? '+' : ''}${funcDiff} functions)`);
  }
}

// Also check for files in text output (fallback for non-tool-mode or if Claude outputs file blocks)
const fileBlockRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
let match;
while ((match = fileBlockRegex.exec(text)) !== null) {
  const filePath = match[1].trim();
  const content = match[2];
  if (!writtenFiles.includes(filePath)) {
    // Claude output a file block in its text response — write it
    const fullPath = path.join(repoRoot(), filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    writtenFiles.push(filePath);
    console.log(`  [BLOCK] ${filePath} (${content.length} chars from text output)`);
  }
}

// SAFETY STEP 2: Validate written files against snapshot — classify as green/yellow/red
let guardrailResult = { level: 'green', issues: [] };

// NEW: If execute produced no files at all, classify as YELLOW (not silently green)
if (writtenFiles.length === 0) {
  const hasContent = text.length > 200;
  guardrailResult = {
    level: 'yellow',
    issues: [{
      file: '(none)',
      reason: hasContent
        ? `Executor produced ${text.length} chars of output but no files were changed on disk. Claude may have described changes without using Edit/Write tools.`
        : `Executor produced empty or minimal output (${text.length} chars). The LLM may have timed out or failed to generate code.`,
      severity: 'yellow'
    }]
  };
  console.warn(`\n⚠️  YELLOW: 0 files written — executor output exists (${text.length} chars) but no file blocks extracted`);
} else if (writtenFiles.length > 0) {
  // Docs-lane tasks: skip function/line guardrail (docs are markdown, not code)
  const isDocsLane = (task.lane_type || '').includes('docs');
  if (isDocsLane) {
    guardrailResult = { level: 'green', issues: [] };
    console.log(`\n✅ Docs-lane task — guardrail skipped (GREEN by default)`);
  } else {
    const issues = validateWrittenFiles(writtenFiles, snapshot, repoRoot());
    guardrailResult = classifyGuardrailResult(issues);

    if (guardrailResult.level === 'green') {
      console.log(`\n✅ All ${writtenFiles.length} written files passed safety validation (GREEN)`);
    } else if (guardrailResult.level === 'yellow') {
      console.warn(`\n⚠️  YELLOW threshold — minor issues detected (will route to Cowork test):`);
      issues.forEach(i => console.warn(`  - [${i.severity}] ${i.file}: ${i.reason}`));
    } else {
      console.error(`\n🔴 RED threshold — critical issues detected (will pause for user decision):`);
      issues.forEach(i => console.error(`  - [${i.severity}] ${i.file}: ${i.reason}`));
    }
  }
}

// Save the executor report
const reportMatch = text.match(/## Execution Report[\s\S]*/);
const report = reportMatch ? reportMatch[0] : `## Execution Report\n\n### What was done\nWrote ${writtenFiles.length} files: ${writtenFiles.join(", ")}\n\n### What was NOT done\n(auto-generated report)\n\n### Issues discovered\nNone detected.\n\n### Suggested follow-ups\nNone.`;

const resultPath = task.result_path || `ai/results/${taskId}_executor_report.md`;
const resultContent = addFrontmatter(`# ${taskId} Executor Report\n\n${report}\n\n---\nFiles written: ${writtenFiles.join(", ") || "none"}\n`, {
  type: 'result',
  task_id: taskId,
  goal_id: task.parent_goal_id || '',
  created: new Date().toISOString().split('T')[0],
  tags: `[ai-flow-lab, result, ${task.lane_type || 'feature'}]`
});
writeRepoFile(resultPath, resultContent);

// Update task state
task.state = "EXECUTED";
task.result_path = resultPath;
task.written_files = writtenFiles;
task.guardrail_result = {
  level: guardrailResult.level,
  issues: guardrailResult.issues.map(i => ({ file: i.file, reason: i.reason, severity: i.severity })),
  checked_at: new Date().toISOString()
};
// Save snapshot paths for potential restore (only if yellow/red)
if (guardrailResult.level !== 'green') {
  const snapshotDir = path.join(repoRoot(), 'automation', 'state', 'snapshots');
  fs.mkdirSync(snapshotDir, { recursive: true });
  const snapshotFile = path.join(snapshotDir, `${taskId}-snapshot.json`);
  // Only save affected files' content to keep size manageable
  const affectedSnapshot = {};
  for (const issue of guardrailResult.issues) {
    if (snapshot[issue.file]) affectedSnapshot[issue.file] = snapshot[issue.file];
  }
  fs.writeFileSync(snapshotFile, JSON.stringify(affectedSnapshot, null, 2));
  task.snapshot_path = `automation/state/snapshots/${taskId}-snapshot.json`;
}
saveTask(taskId, task);

console.log(`\n✅ Execute step complete for ${taskId}: ${writtenFiles.length} files written`);