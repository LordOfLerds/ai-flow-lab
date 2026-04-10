# T-0032 Spec

## Task metadata
- **task_id:** T-0032
- **title:** Add executor file-safety guardrail to pipeline
- **lane_type:** bug-lane
- **executor:** claude

## Problem statement
The Codex executor has destroyed `index.html` three times during pipeline execution (T-0027, T-0029, T-0030). Each time, the LLM returns a truncated file (32-476 lines instead of the expected 1000+ lines) or inserts placeholder comments like `// ... [content continues identical to working copy] ...`. The current `execute-task-api.mjs` script writes files directly from the LLM response without any validation, meaning a single bad LLM response can destroy the entire codebase.

## Source of truth
- `automation/scripts/execute-task-api.mjs` (164 lines) — the executor script that calls the LLM and writes file blocks to disk
- `automation/scripts/_llm-utils.mjs` — utility functions including `writeRepoFile()`, `readRepoFile()`

### Key existing code references:
- Line 107: `const fileBlockRegex = /```file:([\w/.\\-]+)\n([\s\S]*?)```/g;` — parses file blocks from LLM response
- Line 111-121: `while` loop that writes each parsed file to disk using `writeRepoFile(filePath, content)`
- `writeRepoFile(path, content)` — writes to repo root directory
- `readRepoFile(path)` — reads from repo root directory
- `discoverSourceContext(10, 120)` — already discovers source files (used to build LLM context)

## Desired behavior

### 1. Pre-execution file snapshot
Before calling the LLM (before line 98), snapshot all existing source files that the executor might modify:
- Read each file in the repo that matches common game/source patterns (`.html`, `.js`, `.ts`, `.css`, `.json` in the repo root and key subdirectories)
- Store a map of `filePath → { lineCount, sizeBytes, contentHash }` in memory
- Optionally write a `.backup/` directory with copies of files that have > 50 lines

```javascript
function snapshotFiles(repoRoot) {
  const snapshot = {};
  const patterns = ['index.html', 'auth-state.js', 'score-tracker.js'];
  // Also scan for any files the brief mentions
  for (const file of patterns) {
    const fullPath = path.join(repoRoot, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      snapshot[file] = { lineCount: lines, sizeBytes: content.length, content };
    }
  }
  return snapshot;
}
```

### 2. Post-execution validation
After writing all files (after line 121), validate each written file against its snapshot:
- If a file existed before AND the new version has **fewer than 70% of the original line count**, flag it as potentially destroyed
- If a file contains obvious placeholder patterns (e.g., `// ... [content continues`, `// TODO: rest of file`), flag it

```javascript
function validateWrittenFiles(writtenFiles, snapshot, repoRoot) {
  const issues = [];
  for (const filePath of writtenFiles) {
    const prev = snapshot[filePath];
    if (!prev) continue; // New file, no baseline

    const fullPath = path.join(repoRoot, filePath);
    const newContent = fs.readFileSync(fullPath, 'utf8');
    const newLines = newContent.split('\n').length;
    const ratio = newLines / prev.lineCount;

    if (ratio < 0.7) {
      issues.push({
        file: filePath,
        reason: `Line count dropped from ${prev.lineCount} to ${newLines} (${(ratio * 100).toFixed(0)}%)`,
        severity: 'critical'
      });
    }

    // Check for placeholder patterns
    if (newContent.includes('... [content continues') ||
        newContent.includes('// TODO: rest of file') ||
        newContent.includes('// ... existing code') ||
        newContent.includes('[content identical')) {
      issues.push({
        file: filePath,
        reason: 'Contains placeholder/truncation pattern',
        severity: 'critical'
      });
    }
  }
  return issues;
}
```

### 3. Auto-restore on destruction detection
If any critical issues are found:
- Restore the destroyed file(s) from the snapshot
- Log the destruction event with details
- Write the issues to the executor report so follow-ups can reference them
- The executor step still "succeeds" (to avoid blocking the pipeline), but the report clearly documents what happened

```javascript
if (issues.length > 0) {
  console.warn(`⚠️  File safety check detected ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.warn(`  - ${issue.file}: ${issue.reason}`);
    // Restore from snapshot
    if (snapshot[issue.file]) {
      writeRepoFile(issue.file, snapshot[issue.file].content);
      console.warn(`  → Restored ${issue.file} from pre-execution snapshot`);
    }
  }
}
```

### 4. Include validation results in executor report
Add a "File Safety Check" section to the executor report:

```markdown
## File Safety Check
- Validated X files against pre-execution snapshots
- Issues found: Y
  - index.html: Line count dropped from 1163 to 476 (41%) → RESTORED
- Files restored: Z
```

## Constraints
- **Modify only:** `automation/scripts/execute-task-api.mjs`
- **No external dependencies:** Use only Node.js built-ins (`fs`, `path`, `crypto`)
- **No breaking changes:** The existing file-writing behavior is preserved; validation is purely additive
- **Snapshot is in-memory:** No persistent backup directory needed (keeps it simple)
- **Threshold is 70%:** Files that shrink by more than 30% are flagged. This avoids false positives from legitimate refactoring while catching the common destruction pattern (50-80% reduction)
- **Placeholder detection is keyword-based:** Simple string matching, not AST analysis

## Acceptance criteria
1. Pre-execution snapshot captures line counts of existing source files
2. Post-execution validation detects files that shrank by > 30%
3. Post-execution validation detects placeholder/truncation patterns
4. Destroyed files are automatically restored from snapshot
5. Executor report includes "File Safety Check" section
6. Pipeline does not break — executor step completes normally
7. No false positives on new files (files that didn't exist before)
8. No false positives on files that legitimately shrink (e.g., removing dead code)
9. No console errors

## Risks
- **False positives:** Legitimate refactoring that removes > 30% of lines would trigger the guardrail. This is acceptable — better to false-positive and have a human review than to silently destroy code.
- **Snapshot patterns:** The hardcoded file list (`index.html`, `auth-state.js`, etc.) may miss files in other projects. The `discoverSourceContext` function already scans for source files — consider reusing its discovery logic.
- **Race condition:** If another process modifies files between snapshot and validation, the check could be confused. Unlikely in practice since the pipeline runs serially.

## Open questions
1. Should the executor step be marked as FAILED when destruction is detected? **Recommendation:** No — mark as succeeded but include issues in the report. The pipeline can continue because the file was restored. A separate follow-up can investigate why the LLM produced truncated output.
2. Should the snapshot include ALL files or just files mentioned in the brief? **Recommendation:** Start with a known list of key files + any files the brief explicitly mentions. Expand later if needed.
3. Should there be a `.backup/` directory for persistent snapshots? **Recommendation:** No — in-memory is sufficient. The snapshot only needs to live for the duration of the executor script.
