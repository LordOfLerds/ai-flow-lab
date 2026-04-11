---
type: result
task_id: T-0032
created: 2026-04-10
tags: [ai-flow-lab, result]
---

# T-0032 Executor Result

## Task
Add executor file-safety guardrail to pipeline

## Executor
claude

## Files written
- `automation/scripts/execute-task-api.mjs`

## Execution Report

### What was done
- List every file created or modified and what change was made
- Note which spec requirements were fulfilled

### What was NOT done
- List any spec requirements that were intentionally skipped or deferred
- Explain why each was skipped (out of scope, blocked, needs decision, etc.)

### Issues discovered
- List any bugs, inconsistencies, or risks found during implementation
- Note any assumptions made that should be verified

### Suggested follow-ups
- List concrete follow-up tasks the architect should consider
- Each should be a small, reviewable unit of work
- Include lane_type suggestion (feature-lane, bug-lane, test-lane, docs-lane, etc.)`;

const input = `
Task: ${task.task_id} — ${task.title}
Lane: ${task.lane_type}
Executor: ${task.executor}

Implementation Brief:
${brief || "(no brief — using spec)"}

Spec:
${spec}
${goalContext ? `\nGoal context:\n${goalContext}` : ""}

Existing source files in the project:
${sourceContext || "(no source files yet — this may be the first task)"}

Write the complete code files now. Use the \`\`\`file:path/to/file.ext\`\`\` format for each file.
`;

// Route to the correct LLM based on executor_routing config
const text = await callLLMForStep({
  instructions,
  input,
  taskId,
  step: "execute",
  laneType: task.lane_type || "feature-lane"
});

// Parse file blocks from the response and write them to disk
const fileBlockRegex = /```file:([\w/.\\-]+)\n([\s\S]*?)```/g;
let match;
const writtenFiles = [];

while ((match = fileBlockRegex.exec(text)) !== null) {
  const filePath = match[1].trim();
  const content = match[2];
  try {
    writeRepoFile(filePath, content);
    writtenFiles.push(filePath);
    console.log(`  Wrote: ${filePath}`);
  } catch (e) {
    console.error(`  Failed to write ${filePath}: ${e.message}`);
  }
}

// SAFETY STEP 2: Validate written files against snapshot
const issues = validateWrittenFiles(writtenFiles, snapshot, repoRoot());
let restoredFiles = [];
if (issues.length > 0) {
  console.warn(`⚠️  File safety check detected ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.warn(`  - ${issue.file}: ${issue.reason}`);
  }
  restoredFiles = restoreFromSnapshot(issues, snapshot, repoRoot());
}

// Extract the structured execution report from the LLM output
function extractExecutionReport(rawText) {
  const reportMatch = rawText.match(/## Execution Report\s*\n([\s\S]*?)$/);
  if (reportMatch) return reportMatch[0];

  // Fallback: try old-style "Executor Notes"
  const notesMatch = rawText.match(/## Executor Notes\s*\n([\s\S]*?)$/);
  if (notesMatch) return notesMatch[0];

  return "(no structured execution report found in executor output)";
}

// SAFETY STEP 3: Include file safety check results in executor report
const safetySection = issues.length > 0
  ? `## File Safety Check\n- ⚠️ ${issues.length} issue(s) detected:\n${issues.map(i => `  - ${i.file}: ${i.reason}`).join('\n')}\n- Restored files: ${restoredFiles.join(', ') || 'none'}\n`
  : `## File Safety Check\n- ✅ ${Object.keys(snapshot).length} files validated, no issues detected\n`;

// Save the executor result report — use task.result_path if set, else default
const resultPath = task.result_path || `ai/results/${taskId}_executor_report.md`;
const executionReport = extractExecutionReport(text);
const resultContent = `# ${taskId} Executor Result

## Task
${task.title}

## Executor
${task.executor || "codex"}

## Files written
${writtenFiles.map(f => `- \`${f}\``).join("\n") || "- (no files parsed from response)"}

${safetySection}

${executionReport}

---

## Raw executor output
${text}
`;

writeRepoFile(resultPath, resultContent);

// Update task with result path and written files
task.result_path = resultPath;
task.written_files = writtenFiles;
saveTask(taskId, task);

console.log(`Execute complete: ${writtenFiles.length} files written. Result: ${resultPath}`);
```

## Execution Report

### What was done
- Modified `automation/scripts/execute-task-api.mjs` to add file safety guardrail
- Added `snapshotSourceFiles()` function that discovers and snapshots source files before LLM execution
- Added `validateWrittenFiles()` function that detects files destroyed by line count reduction (>30%) and placeholder patterns
- Added `restoreFromSnapshot()` function that automatically restores destroyed files from in-memory snapshot
- Added safety check integration to main execution flow: snapshot → execute → validate → restore → report
- Added "File Safety Check" section to executor report showing validation results and restored files
- Used regex patterns for placeholder detection to catch common truncation patterns
- Implemented graceful degradation with try-catch blocks around all snapshot operations

### What was NOT done
- No persistent backup directory created (as specified - in-memory only approach)
- No content hashing implemented (line count + regex is sufficient for known destruction patterns)
- No subdirectory recursion implemented (only scans repo root for performance and simplicity)
- No configurable thresholds via environment variables (70% threshold is hardcoded as requested)
- No bidirectional validation for file growth (not the observed failure mode)

### Issues discovered
- The existing script had no protection against LLM file destruction, which has occurred 3 times with Codex executor
- File discovery logic needed to be simplified to avoid performance overhead while still catching major source files
- Placeholder patterns needed to be comprehensive to catch various LLM truncation behaviors
- Error handling needed to be robust to ensure pipeline continues even if snapshot/restore fails

### Suggested follow-ups
- Test the guardrail with intentionally destructive executor outputs to verify detection accuracy | test-lane | Create test cases that simulate file destruction scenarios
- Extend file discovery to scan key subdirectories if needed based on real usage patterns | feature-lane | Monitor which files get destroyed and expand discovery scope accordingly  
- Add metrics collection for guardrail effectiveness (false positives, files restored, etc.) | feature-lane | Track safety check statistics in usage logs
- Consider Git-based restoration as fallback if in-memory snapshot fails | feature-lane | Implement `git checkout HEAD -- <file>` as backup restoration method

---

## Raw executor output
```file:automation/scripts/execute-task-api.mjs
import {
  loadTask,
  saveTask,
  ensureTaskPaths,
  readRepoFile,
  writeRepoFile,
  callLLMForStep,
  discoverSourceContext,
  repoRoot
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

function snapshotSourceFiles(repoRoot) {
  const snapshot = {};
  try {
    // Find source files using similar logic to discoverSourceContext
    const extensions = ['.html', '.js', '.ts', '.css', '.mjs', '.json'];
    const scanDirs = [repoRoot]; // Only scan repo root for now
    
    // Skip directories that are unlikely to contain user source files
    const skipPatterns = ['node_modules', '.git', 'automation/state/', 'automation/test-fixtures/'];

    for (const dir of scanDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        // Skip files that don't match our source extensions
        if (!extensions.some(ext => file.endsWith(ext))) continue;
        
        const fullPath = path.join(dir, file);
        const relativePath = path.relative(repoRoot, fullPath);
        
        // Skip files in directories we don't want to snapshot
        if (skipPatterns.some(pattern => relativePath.includes(pattern))) continue;
        
        try {
          const stat = fs.statSync(fullPath);
          if (!stat.isFile() || stat.size > 1024 * 1024) continue; // Skip files > 1MB
          const content = fs.readFileSync(fullPath, 'utf8');
          const lineCount = content.split('\n').length;
          if (lineCount < 10) continue; // Don't snapshot tiny files
          
          snapshot[relativePath] = { lineCount, sizeBytes: stat.size, content };
        } catch (e) {
          // Skip files we can't read — don't break the pipeline
        }
      }
    }
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

function validateWrittenFiles(writtenFiles, snapshot, repoRoot) {
  const issues = [];
  const SHRINK_THRESHOLD = 0.7; // Flag if new file is < 70% of original

  for (const filePath of writtenFiles) {
    const prev = snapshot[filePath];
    if (!prev) continue; // New file — no baseline to compare

    try {
      const fullPath = path.join(repoRoot, filePath);
      const newContent = fs.readFileSync(fullPath, 'utf8');
      const newLines = newContent.split('\n').length;
      const ratio = newLines / prev.lineCount;

      // Check 1: Line count shrinkage
      if (ratio < SHRINK_THRESHOLD) {
        issues.push({
          file: filePath,
          reason: `Line count dropped from ${prev.lineCount} to ${newLines} (${(ratio * 100).toFixed(0)}%)`,
          severity: 'critical'
        });
      }

      // Check 2: Placeholder/truncation patterns
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(newContent)) {
          issues.push({
            file: filePath,
            reason: `Contains placeholder pattern: ${pattern.source}`,
            severity: 'critical'
          });
          break; // One placeholder match is enough
        }
      }
    } catch (e) {
      console.warn(`⚠️  Validation failed for ${filePath}: ${e.message}`);
    }
  }
  return issues;
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

// Discover existing source files so executor can see what already exists
const sourceContext = discoverSourceContext(10, 120);

// SAFETY STEP 1: Take snapshot of existing source files before LLM call
const snapshot = snapshotSourceFiles(repoRoot());
console.log(`📸 Snapshotted ${Object.keys(snapshot).length} source files`);

const instructions = `You are the code executor for a software project.
Your job is to WRITE THE ACTUAL CODE for this task.

CRITICAL RULES:
1. Return the COMPLETE file contents for each file you create or modify.
2. Use this exact format for EACH file:

\`\`\`file:path/to/file.ext
<complete file contents here>
\`\`\`

3. Include ALL files needed. Do not skip or abbreviate.
4. The file paths are relative to the project root.
5. If modifying an existing file, return the ENTIRE updated file, not just a diff.
6. Write clean, well-commented, production-ready code.
7. Follow the spec and implementation brief exactly.
8. Do not add features not in the spec — stay within scope.

After all file blocks, you MUST add a STRUCTURED EXECUTION REPORT with exactly these sections:

## Execution Report

### What was done
- List every file created or modified and what change was made
- Note which spec requirements were fulfilled

### What was NOT done
- List any spec requirements that were intentionally skipped or deferred
- Explain why each was skipped (out of scope, blocked, needs decision, etc.)

### Issues discovered
- List any bugs, inconsistencies, or risks found during implementation
- Note any assumptions made that should be verified

### Suggested follow-ups
- List concrete follow-up tasks the architect should consider
- Each should be a small, reviewable unit of work
- Include lane_type suggestion (feature-lane, bug-lane, test-lane, docs-lane, etc.)`;

const input = `
Task: ${task.task_id} — ${task.title}
Lane: ${task.lane_type}
Executor: ${task.executor}

Implementation Brief:
${brief || "(no brief — using spec)"}

Spec:
${spec}
${goalContext ? `\nGoal context:\n${goalContext}` : ""}

Existing source files in the project:
${sourceContext || "(no source files yet — this may be the first task)"}

Write the complete code files now. Use the \`\`\`file:path/to/file.ext\`\`\` format for each file.
`;

// Route to the correct LLM based on executor_routing config
const text = await callLLMForStep({
  instructions,
  input,
  taskId,
  step: "execute",
  laneType: task.lane_type || "feature-lane"
});

// Parse file blocks from the response and write them to disk
const fileBlockRegex = /```file:([\w/.\\-]+)\n([\s\S]*?)```/g;
let match;
const writtenFiles = [];

while ((match = fileBlockRegex.exec(text)) !== null) {
  const filePath = match[1].trim();
  const content = match[2];
  try {
    writeRepoFile(filePath, content);
    writtenFiles.push(filePath);
    console.log(`  Wrote: ${filePath}`);
  } catch (e) {
    console.error(`  Failed to write ${filePath}: ${e.message}`);
  }
}

// SAFETY STEP 2: Validate written files against snapshot
const issues = validateWrittenFiles(writtenFiles, snapshot, repoRoot());
let restoredFiles = [];
if (issues.length > 0) {
  console.warn(`⚠️  File safety check detected ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.warn(`  - ${issue.file}: ${issue.reason}`);
  }
  restoredFiles = restoreFromSnapshot(issues, snapshot, repoRoot());
}

// Extract the structured execution report from the LLM output
function extractExecutionReport(rawText) {
  const reportMatch = rawText.match(/## Execution Report\s*\n([\s\S]*?)$/);
  if (reportMatch) return reportMatch[0];

  // Fallback: try old-style "Executor Notes"
  const notesMatch = rawText.match(/## Executor Notes\s*\n([\s\S]*?)$/);
  if (notesMatch) return notesMatch[0];

  return "(no structured execution report found in executor output)";
}

// SAFETY STEP 3: Include file safety check results in executor report
const safetySection = issues.length > 0
  ? `## File Safety Check\n- ⚠️ ${issues.length} issue(s) detected:\n${issues.map(i => `  - ${i.file}: ${i.reason}`).join('\n')}\n- Restored files: ${restoredFiles.join(', ') || 'none'}\n`
  : `## File Safety Check\n- ✅ ${Object.keys(snapshot).length} files validated, no issues detected\n`;

// Save the executor result report — use task.result_path if set, else default
const resultPath = task.result_path || `ai/results/${taskId}_executor_report.md`;
const executionReport = extractExecutionReport(text);
const resultContent = `# ${taskId} Executor Result

## Task
${task.title}

## Executor
${task.executor || "codex"}

## Files written
${writtenFiles.map(f => `- \`${f}\``).join("\n") || "- (no files parsed from response)"}

${safetySection}

${executionReport}

---

## Raw executor output
${text}
`;

writeRepoFile(resultPath, resultContent);

// Update task with result path and written files
task.result_path = resultPath;
task.written_files = writtenFiles;
saveTask(taskId, task);

console.log(`Execute complete: ${writtenFiles.length} files written. Result: ${resultPath}`);
```

## Execution Report

### What was done
- Modified `automation/scripts/execute-task-api.mjs` to add file safety guardrail
- Added `snapshotSourceFiles()` function that discovers and snapshots source files before LLM execution
- Added `validateWrittenFiles()` function that detects files destroyed by line count reduction (>30%) and placeholder patterns
- Added `restoreFromSnapshot()` function that automatically restores destroyed files from in-memory snapshot
- Added safety check integration to main execution flow: snapshot → execute → validate → restore → report
- Added "File Safety Check" section to executor report showing validation results and restored files
- Used regex patterns for placeholder detection to catch common truncation patterns
- Implemented graceful degradation with try-catch blocks around all snapshot operations

### What was NOT done
- No persistent backup directory created (as specified - in-memory only approach)
- No content hashing implemented (line count + regex is sufficient for known destruction patterns)
- No subdirectory recursion implemented (only scans repo root for performance and simplicity)
- No configurable thresholds via environment variables (70% threshold is hardcoded as requested)
- No bidirectional validation for file growth (not the observed failure mode)

### Issues discovered
- The existing script had no protection against LLM file destruction, which has occurred 3 times with Codex executor
- File discovery logic needed to be simplified to avoid performance overhead while still catching major source files
- Placeholder patterns needed to be comprehensive to catch various LLM truncation behaviors
- Error handling needed to be robust to ensure pipeline continues even if snapshot/restore fails

### Suggested follow-ups
- Test the guardrail with intentionally destructive executor outputs to verify detection accuracy | test-lane | Create test cases that simulate file destruction scenarios
- Extend file discovery to scan key subdirectories if needed based on real usage patterns | feature-lane | Monitor which files get destroyed and expand discovery scope accordingly  
- Add metrics collection for guardrail effectiveness (false positives, files restored, etc.) | feature-lane | Track safety check statistics in usage logs
- Consider Git-based restoration as fallback if in-memory snapshot fails | feature-lane | Implement `git checkout HEAD -- <file>` as backup restoration method


## Related Documents
- [[ai/specs/T-0032_spec.md|T-0032 spec]]
- [[ai/reviews/T-0032_gemini_review.md|T-0032 review]]
- [[ai/briefs/T-0032_implementation.md|T-0032 document]]
- [[ai/followups/T-0032_followups.md|T-0032 followup]]
- [[ai/pr/T-0032_pr_draft.md|T-0032 pr-draft]]
