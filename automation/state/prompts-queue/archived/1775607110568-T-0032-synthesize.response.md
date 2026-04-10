# T-0032 Implementation Brief

## Goal
Add pre-execution file snapshots and post-execution validation to `execute-task-api.mjs` to detect and auto-restore files destroyed by the LLM executor. This prevents the recurring issue where the Codex executor rewrites files with truncated content.

## Scope
Modify only `automation/scripts/execute-task-api.mjs`. Add snapshot, validation, and restore logic around the existing LLM call and file-writing loop. No external dependencies. No persistent backup directory.

## Constraints
1. **Single file:** Only modify `automation/scripts/execute-task-api.mjs`
2. **In-memory snapshots only:** No `.backup/` directory — resolve Gemini contradiction by choosing in-memory (simpler, no cleanup needed)
3. **Use `discoverSourceContext` for file discovery:** Don't hardcode file patterns (Gemini fix #2). Reuse the existing discovery function to find source files.
4. **Try-catch all snapshot/restore ops:** Graceful degradation — snapshot failures don't block execution (Gemini fix #5)
5. **Threshold: 70%** — files that shrink below 70% of original line count are flagged. Configurable via comment, not env var (keep it simple for now).
6. **Regex placeholder detection:** Use regex patterns instead of simple string matching (Gemini fix #7)
7. **Remove `crypto` from scope:** No content hashing — line count + placeholder detection is sufficient for the known destruction patterns
8. **Pipeline continues on detection:** Executor step succeeds with warnings. Destroyed files are restored. Report documents the issue.

## File targets
- `automation/scripts/execute-task-api.mjs` — add snapshot, validation, and restore logic

### Implementation details:

**1. Add `snapshotSourceFiles()` function** — before the LLM call (before line 98):

```javascript
function snapshotSourceFiles(repoRoot) {
  const snapshot = {};
  try {
    // Find source files using similar logic to discoverSourceContext
    const extensions = ['.html', '.js', '.ts', '.css', '.mjs'];
    const scanDirs = [repoRoot]; // Only scan repo root for now

    for (const dir of scanDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!extensions.some(ext => file.endsWith(ext))) continue;
        const fullPath = path.join(dir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (!stat.isFile() || stat.size > 1024 * 1024) continue; // Skip files > 1MB
          const content = fs.readFileSync(fullPath, 'utf8');
          const lineCount = content.split('\n').length;
          if (lineCount < 10) continue; // Don't snapshot tiny files
          const relativePath = path.relative(repoRoot, fullPath);
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
```

**2. Add `validateWrittenFiles()` function** — after the file-writing loop (after line 121):

```javascript
const PLACEHOLDER_PATTERNS = [
  /\.{3}\s*\[content\s+continues/i,
  /\/\/\s*TODO:\s*rest\s+of\s+file/i,
  /\/\/\s*\.{3}\s*existing\s+code/i,
  /\[content\s+identical/i,
  /\/\/\s*\.{3}\s*\[content/i,
  /continues\s+identical\s+to\s+working/i
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
```

**3. Add restore logic** — after validation:

```javascript
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
```

**4. Wire into execute-task-api.mjs** — the execution flow becomes:

```javascript
// BEFORE LLM call
const snapshot = snapshotSourceFiles(repoRoot);
console.log(`📸 Snapshotted ${Object.keys(snapshot).length} source files`);

// ... existing LLM call and file-writing loop ...

// AFTER file writing
const issues = validateWrittenFiles(writtenFiles, snapshot, repoRoot);
let restoredFiles = [];
if (issues.length > 0) {
  console.warn(`⚠️  File safety check detected ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.warn(`  - ${issue.file}: ${issue.reason}`);
  }
  restoredFiles = restoreFromSnapshot(issues, snapshot, repoRoot);
}
```

**5. Include in executor report** — add a "File Safety Check" section to the report template:

```javascript
const safetySection = issues.length > 0
  ? `## File Safety Check\n- ⚠️ ${issues.length} issue(s) detected:\n${issues.map(i => `  - ${i.file}: ${i.reason}`).join('\n')}\n- Restored files: ${restoredFiles.join(', ') || 'none'}\n`
  : `## File Safety Check\n- ✅ ${Object.keys(snapshot).length} files validated, no issues detected\n`;
```

## Tests required
1. Executor runs normally when no destruction occurs (no false positives)
2. Files with > 30% line reduction are detected and flagged
3. Files with placeholder comments are detected and flagged
4. Destroyed files are restored from snapshot
5. New files (no snapshot baseline) are not flagged
6. Files < 10 lines are not snapshotted (avoid noise)
7. Files > 1MB are skipped (performance guard)
8. Snapshot/restore failures don't break the pipeline
9. Executor report includes "File Safety Check" section
10. Pipeline completes end-to-end with guardrail enabled

## Chosen minimal policy
- **In-memory only** — no persistent backup directory (Gemini contradiction resolved)
- **Line count + regex** — no content hashing (sufficient for known destruction patterns)
- **Scan repo root only** — don't recurse into subdirectories (avoids node_modules, keeps it fast)
- **70% threshold** — empirically, all three destruction incidents resulted in 30-97% line reduction
- **Succeed with warnings** — pipeline continues, file is restored, report documents the issue
- **No bidirectional validation** — don't flag files that grow (Gemini suggestion deferred — growth isn't the observed failure mode)

## Risks
1. **False positives on legitimate refactoring:** A task that intentionally removes > 30% of a file will trigger the guardrail. Acceptable — the restore happens silently and the report documents it, so a human can review.
2. **Root-only scan misses nested files:** If future tasks modify files in subdirectories, they won't be protected. Easily extended later.
3. **Snapshot adds ~10ms overhead:** Reading and storing a few files is negligible compared to LLM call time (~60-180s).

## Explicit non-goals
- Persistent backup directory (`.backup/`)
- Content hashing (SHA-256)
- Bidirectional validation (flagging growth)
- Configurable thresholds via env vars
- Git-based restoration (`git checkout`)
- Protection against logic errors or subtle bugs
- AST-level validation
