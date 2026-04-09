# Known Bugs & Issues

**Last updated:** 2026-04-08

## Open

### BUG-005: No concurrency limit for parallel cascades
- **Severity:** Medium
- **Symptom:** If two cascades start simultaneously, both run on the same event loop. No queue, no limit, potential resource exhaustion.
- **Fix:** Implement task queue with configurable max_parallel_tasks.

### BUG-007: No rollback mechanism for bad merges
- **Severity:** Medium
- **Symptom:** Once a task is merged, there's no undo. Bad code stays on main.
- **Fix:** Implement git revert + task reset + attempt history (audit trail).

### BUG-008: Score does not reset on game restart — FIXED (already fixed in startGame())
- **Severity:** Low
- **File:** `index.html` (game code)
- **Status:** FIXED — `gs.score = 0` already set at line 4725 in startGame() before scoreTracker.reset(). Verified working.

### BUG-009: T-0028 shows FAILED runtime_status cosmetically — FIXED (pipeline reorder)
- **Severity:** Low (cosmetic, no functional impact)
- **Status:** FIXED — Pipeline reorder (merge is now last step) ensures runtime_status=IDLE is set after all steps complete. T-0028 archived.

### BUG-013: nextTaskNum may produce duplicate IDs on concurrent task creation — FIXED (FIX-043)
- **Severity:** Medium
- **File:** `automation/scripts/serve-dashboard.mjs` (nextTaskId function)
- **Status:** FIXED — Added file-based mutex lock (.task-counter.lock with O_EXCL) + atomic counter file (.task-counter). Falls back to scan-based approach with existsSync safety check if lock fails. Also scans archived directory.

## Fixed — Moved from Open (previously misfiled)

### BUG-001: propose-followups silently succeeds on empty results — FIXED (FIX-009)
- **Severity:** High
- **File:** `automation/scripts/propose-followups-api.mjs:232-235`
- **Symptom:** Task completes propose-followups step but no proposals are created.
- **Fix:** FIX-009 — regex now accepts titled F-N headings. Throws error on zero parsed blocks.

### BUG-002: merge-task.mjs marks MERGED on git failure — FIXED (FIX-031)
- **Severity:** High
- **File:** `automation/scripts/merge-task.mjs`
- **Symptom:** Task shows state=MERGED even though no actual merge occurred.
- **Fix:** FIX-031 — missing branch and wrong-branch cases now throw errors.

### BUG-003: Game Start button not visible — FIXED (FIX-011)
- **Severity:** High
- **Fix:** FIX-011 — inlined ScoreTracker, fixed module loading order.

### BUG-004: T-0025 stuck — prompt pasted as response
- **Severity:** Low (data issue, not code bug)
- **Task:** T-0025
- **Fix:** Delete response file, resubmit correct ChatGPT response. Prevented by BUG-001 fix.

### BUG-006: No conflict detection between parallel tasks — FIXED (FIX-040)
- **Severity:** Medium
- **Fix:** FIX-040 — Pre-execute conflict detection scans active tasks for written_files overlap.

### BUG-010: Decisions page shows duplicate entries — FIXED (FIX-041)
- **Severity:** Low (cosmetic)
- **Fix:** FIX-041 — loads all proposals with dedup by decision_proposal_id.

### BUG-011: Execute step produces 0 written files — FIXED (FIX-025)
- **Severity:** Critical
- **Fix:** FIX-025 (enhanced prompt + fallback parser + YELLOW guardrail).

### BUG-012: No cancel/abort mechanism for running tasks — FIXED (FIX-027)
- **Severity:** High
- **Fix:** FIX-027 (Cancel API + UI button).

### BUG-014: Phantom merges — FIXED (FIX-031)
- **Severity:** Medium
- **Fix:** FIX-031 — both phantom merge paths now throw errors.

### BUG-015: Gemini API unreachable from sandboxed environments — FIXED (FIX-024)
- **Severity:** Low (environment-specific)
- **Fix:** FIX-024 — smart fallback to prompt queue on network errors in APP mode.

### BUG-016: Retry flow bypasses RED guardrail — FIXED (FIX-028)
- **Severity:** High
- **Fix:** FIX-028 — retry flow now checks guardrails after execute step.

## Fixed (2026-04-08) — Workflow Test Fixes

### FIX-031: Phantom merge prevention
- **File:** `automation/scripts/merge-task.mjs`
- **Feature:** Two phantom merge paths now throw errors: (1) branch doesn't exist → Error instead of silent continue, (2) wrong branch active → Error instead of silent continue. Both prevent task from advancing to MERGED without an actual merge.
- **Resolves:** BUG-002, BUG-014

### FIX-030: Tool-enabled Claude CLI for execute, diagnose, test, and fix
- **Files:** `_llm-utils.mjs`, `execute-task-api.mjs`, `cowork-test.mjs`, `serve-dashboard.mjs`
- **Feature:** All Claude CLI calls now use `--allowed-tools` for steps that benefit from file access:
  - **Execute step**: `Read,Edit,Write,Glob,Grep` — Claude reads source files and makes targeted edits directly. No more dumping 100KB file contents into prompts or parsing file blocks from output. Snapshot diff detects changed files.
  - **Cowork Test**: `Read,Glob,Grep` — Claude can read code files to verify correctness.
  - **Diagnose/Fix**: `Read,Glob,Grep` (diagnose), `Read,Edit,Write,Glob,Grep,Bash(git:*)` (apply fix) — Claude can inspect code for better diagnostics and apply fixes directly.
  - All calls include `--max-budget-usd` cost caps ($0.50-$2.00) and `--permission-mode acceptEdits`.
  - JSON output (`--output-format json`) provides structured data: cost, turns, token usage, permission denials.
  - Fallback: if `--allowed-tools` fails (old CLI version), automatically falls back to plain `--print` mode.
- **Impact:** Execute step works reliably on large files (1654+ lines). Cost is comparable or lower due to reduced output tokens (targeted edits vs full-file reproduction). Tested: $0.09 per execute with tool mode vs $0.13+ without (plus retries).

### FIX-029: Edit mode for large files (SEARCH/REPLACE blocks) — SUPERSEDED by FIX-030
- **File:** `automation/scripts/execute-task-api.mjs`
- **Feature:** When existing source files exceed 400 lines, the executor prompt switches to "edit mode". Instead of asking the LLM to reproduce the entire file, it outputs `\`\`\`edit:filepath` blocks containing `<<<<<<< SEARCH / ======= / >>>>>>> REPLACE` sections. The parser applies these edits to the existing file, preserving all untouched code. Includes fuzzy matching (trimmed whitespace) for search blocks that don't match exactly. New files still use `\`\`\`file:path` format.
- **Impact:** Resolves the fundamental problem of LLMs truncating large files during execute. Tested on T-0040 with a 1932-line index.html: 3 edits applied, 62/62 functions preserved, guardrail GREEN.
- **Resolves:** Root cause of BUG-011

### FIX-028: Retry flow now checks guardrails after execute step
- **File:** `automation/scripts/serve-dashboard.mjs` (retry endpoint)
- **Feature:** After the execute step completes in the retry flow, the guardrail result is checked. RED results pause the pipeline at BLOCKED_ON_DECISION (same as main cascade). YELLOW results route to COWORK_TESTING. GREEN continues normally.
- **Resolves:** BUG-016

### FIX-027: Cancel API + UI button
- **Files:** `serve-dashboard.mjs`, `dashboard.html`
- **Feature:** Added `POST /api/tasks/:id/cancel` endpoint that sets task to FAILED with cancel reason and attempts to kill running `claude --print` child processes. Dashboard shows a red "✕ Cancel" button on running tasks. Confirmation dialog prevents accidental cancellation.
- **Resolves:** BUG-012

### FIX-026: 0-file YELLOW guardrail
- **File:** `automation/scripts/execute-task-api.mjs`
- **Feature:** When execute step produces 0 extractable file blocks, guardrail now classifies as YELLOW instead of GREEN. Distinguishes between "output with no file blocks" (likely format issue) and "empty/minimal output" (likely execution failure). Routes to Cowork Test for user review.
- **Resolves:** Part of BUG-011

### FIX-025: Enhanced execute prompt + fallback file parser
- **File:** `automation/scripts/execute-task-api.mjs`
- **Feature:** Two-part fix for 0-file extraction:
  1. **Prompt enhancement:** Made ` ```file:path ` format instruction the most prominent rule in the executor prompt, with explicit examples and warnings that code without the prefix is lost.
  2. **Fallback parser:** When primary regex finds 0 ` ```file: ` blocks but output is >500 chars, attempts to extract standard language-tagged blocks (` ```html `, ` ```js `, etc.) and infer filenames from brief file targets or snapshot keys.
- **Resolves:** BUG-011

### FIX-024: Gemini smart network-error fallback to prompt queue
- **File:** `automation/scripts/_llm-utils.mjs` (callGemini)
- **Feature:** After Gemini retry loop exhaustion, checks if the error is network-level (EAI_AGAIN, ENOTFOUND, ECONNREFUSED, fetch failed). If so and in APP mode, falls back to prompt queue (`callLLMApp`) so the user can manually handle the critique step via ChatGPT. Non-network errors (API errors, auth errors) still throw normally.
- **Resolves:** BUG-015

## Fixed (2026-04-08)

### FIX-022: Phase 2 Cowork Test Script
- **Files:** NEW `cowork-test.mjs`, `serve-dashboard.mjs`
- **Feature:** Added Cowork Test step that validates executor output via Claude CLI:
  - Generates structured test prompt from spec + brief + code + snapshot diff
  - Calls `claude --print` CLI for code review & acceptance criteria validation
  - Parses structured JSON report (PASS/FAIL with checks, regressions, bugs)
  - Auto-creates bug tasks on FAIL with `parent_task_id` linking
  - Integrated into cascade engine: Yellow guardrail → runs cowork-test.mjs
  - "Run Cowork Test" decision button launches test async

### FIX-023: saveTask missing taskId in execute-task-api.mjs
- **File:** `execute-task-api.mjs:370-371`
- **Bug:** `saveTask(task)` called with one argument instead of `saveTask(taskId, task)`, causing `TypeError: Cannot set properties of undefined`
- **Fix:** Changed to `saveTask(taskId, task)` and removed redundant `updated_at` assignment

### FIX-021: Phase 1 Guardrail Threshold Routing
- **Files:** `execute-task-api.mjs`, `serve-dashboard.mjs`, `dashboard.html`
- **Feature:** Replaced auto-restore guardrail with tiered user-controlled response:
  - Green (0 issues): Continue to merge automatically
  - Yellow (1-2 functions changed): Route to Cowork Test (Phase 2 placeholder — immediately marks TESTED)
  - Red (>10% functions missing): Pause pipeline, show Decision Proposal with Accept/Restore/Test buttons
- **New states:** EXECUTED, COWORK_TESTING, TESTED, TEST_FAILED, BLOCKED_ON_DECISION
- **New API:** `POST /api/tasks/:id/guardrail-decision` (accept/restore/test actions)
- **Dashboard:** Red guardrail box with issues + 3 buttons, yellow test indicator, new state badges

### FIX-018: renderTaskCard syntax fix
- **File:** `automation/ui/dashboard.html`
- **Bug:** Orphaned loop code left from old rendering logic was causing task cards to render multiple times.
- **Fix:** Removed the legacy loop wrapper; renderTaskCard() is now a clean, idempotent function called once per task.

### FIX-017: Pipeline task sorting — completed tasks collapsible
- **File:** `automation/ui/dashboard.html` (Flow view)
- **Feature:** Flow view now separates active and completed tasks. Completed tasks (state=MERGED) are placed in a collapsible `<details>` section. Reduces visual clutter while preserving history.

### FIX-016: Executor guardrail enhanced with function-existence check
- **File:** `automation/scripts/execute-task-api.mjs`
- **Feature:** Check 3 added to executor guardrail. Before/after execution, executor snapshots function and class names (via AST parsing or regex scan). If >10% of functions are missing after execution, auto-restores worktree and fails task. Works in tandem with LLM guardrail rules 9-11 (forbid removing functions not in spec).

### FIX-015: Diagnosis/Fix now works without ANTHROPIC_API_KEY via Gemini fallback
- **Files:** `automation/scripts/serve-dashboard.mjs` (diagnoseStepError, generateStepFix functions)
- **Feature:** Diagnosis and fix generation now check for ANTHROPIC_API_KEY availability. If missing, they fall back to `callGeminiDirect()` (Gemini API) instead of Claude CLI. Helper function `hasClaudeCLI()` checks Claude CLI availability at startup.

### FIX-014: CSS spacing between AI badges and doc links fixed
- **File:** `automation/ui/dashboard.html` (style tag)
- **Bug:** AI provider badges and documentation links had no margin separation, making the UI appear cramped.
- **Fix:** Added margin-right to .ai-badge CSS class to create consistent spacing.

### FIX-020: CLI auth check now supports OAuth (not just API key)
- **File:** `automation/scripts/serve-dashboard.mjs`
- **Bug:** `hasClaudeCLI()` only checked `ANTHROPIC_API_KEY` env var. Claude CLI works via OAuth login too (`claude auth status` → `loggedIn: true`).
- **Fix:** `hasClaudeCLI()` now checks OAuth login status via `claude auth status` as fallback. Result is cached for server lifetime.

### FIX-019: ChatGPT textarea values persist across auto-refresh renders
- **File:** `automation/ui/dashboard.html` (auto-refresh polling loop)
- **Bug:** Even with the previous skip-render fix (FIX-013), textarea values were still lost when the user was not actively focused on the textarea (e.g., switched tab to copy from ChatGPT). The DOM rebuild destroyed the textarea and its value.
- **Fix:** Auto-refresh now saves all textarea values (keyed by element ID) before render and restores them after. Also re-focuses the previously active element. This replaces the skip-render approach — the page always re-renders but textarea content is preserved.

### FIX-013: Dashboard auto-refresh no longer clears ChatGPT paste textarea (superseded by FIX-019)
- **File:** `automation/ui/dashboard.html` (auto-refresh polling loop)
- **Bug:** When dashboard polled /api/state every 1-2 seconds, it would re-render the entire Flow view, clearing the APP mode response textarea while the user was pasting ChatGPT's answer. Users would lose their work.
- **Fix:** ~~Auto-refresh now detects active typing or unsaved content in any textarea and skips the re-render.~~ Superseded by FIX-019 which takes a save/restore approach instead.

## Fixed (2026-04-08)

### FIX-012: Executor file-safety guardrail added
- **File:** `automation/scripts/execute-task-api.mjs`
- **Feature:** Execute step now implements snapshot → validate → restore pattern for file safety. Before executing code, executor snapshots the worktree directory. After code execution, it validates that only expected files were modified (against task written_files list). If validation fails, restores all files to pre-execution state and sets task to FAILED with diagnostic message. This prevents accidental/malicious file overwrites while allowing executor autonomy within intentional scope.

### FIX-011: Game Start button not visible (BUG-003)
- **Files:** `index.html` (repo root), `automation/ui/game.html`, `automation/scripts/serve-dashboard.mjs`
- **Bug (root cause 1):** `index.html` had no game code — just a comment stub `// (full script content as shown in the command output above)`. The `/game` route served this broken file.
- **Bug (root cause 2):** `automation/ui/game.html` had game code but used `score-tracker.js` as `type="module"` while the inline `<script>` ran synchronously, throwing `if (!window.ScoreTracker)` before the module loaded.
- **Fix (index.html):** Inlined ScoreTracker class directly in a regular `<script>` tag. No module imports, no loading order issues. Full game code now self-contained.
- **Fix (game.html):** Changed inline `<script>` to `<script type="module">`, used ES import for ScoreTracker, exposed `startGame` on window.
- **Fix (serve-dashboard.mjs):** Updated `/game` route to prefer `ui/game.html` over repo root `index.html`.
- **Origin:** T-0017 simplified game.html, broke script content in index.html.

### FIX-009: F-N block regex in propose-followups didn't match titled headings
- **File:** `propose-followups-api.mjs` (line ~230)
- **Bug:** Regex `/###\s+(F-\d+)\s*\r?\n/` required newline immediately after `F-N` ID, but ChatGPT often returns `### F-1: Some title` with text after the ID.
- **Fix:** Changed to `/###\s+(F-\d+)[^\r\n]*\r?\n/` which accepts any characters on the heading line after the F-N ID.
- **Impact:** All propose-followups steps with titled F-N blocks were silently failing.

### FIX-010: Auto-fix feature with user approval
- **File:** `serve-dashboard.mjs`, `dashboard.html`
- **Feature:** `generateStepFix()` generates code fixes via Claude CLI. Stored in `state/fixes/`. User reviews in dashboard with risk badge, clicks "Apply Fix" or "Reject". Applied fixes are auto-committed. Server auto-restarts if the fix touches serve-dashboard.mjs.
- **Endpoints:** `POST /api/tasks/:id/generate-fix`, `POST /api/tasks/:id/apply-fix`, `POST /api/tasks/:id/reject-fix`, `GET /api/tasks/:id/fix`

### FIX-008: Auto-diagnosis on pipeline failures
- **File:** `serve-dashboard.mjs` (diagnoseStepError function)
- **Feature:** When any pipeline step fails or times out, Claude CLI automatically analyzes the error and produces a structured diagnosis (root cause, details, suggested fix). Stored in `task.last_error.diagnosis`, displayed in dashboard. Manual re-diagnosis via `POST /api/tasks/:id/diagnose`.

### FIX-001: execSync blocking Node event loop in CLI calls
- **File:** `_llm-utils.mjs:815-827, 868-888`
- **Fix:** Migrated callClaudeCLI and callCodexCLI from execSync to async execFileAsync.

### FIX-002: Codex CLI hangs indefinitely
- **File:** `_llm-utils.mjs:867-930`
- **Fix:** Reduced timeout from 15min to 5min, added automatic fallback to Claude CLI on timeout.

### FIX-003: Ghost "running" states after server restart
- **File:** `serve-dashboard.mjs:1849-1929`
- **Fix:** cleanStaleStatus() at startup resets ghost states. Enhanced: now also cleans orphaned temp files.

### FIX-004: Retry endpoint didn't spawn follow-up tasks
- **File:** `serve-dashboard.mjs:1414-1445`
- **Fix:** Added follow-up spawning logic (with dedup + limits) after successful retry completion.

### FIX-005: Cascade always restarted from architect
- **File:** `serve-dashboard.mjs:1582-1598`
- **Fix:** Added skip logic: cascade reads task state and starts from the next incomplete step.

### FIX-006: Gemini routed through prompt queue in APP mode
- **File:** `_llm-utils.mjs:516-519`
- **Fix:** Removed APP mode prompt queue for Gemini. It now uses Gemini API directly in all modes.

### FIX-007: APP_MODE_STEPS included critique (Gemini)
- **File:** `automation/ui/dashboard.html:636`
- **Fix:** Removed 'critique' from APP_MODE_STEPS set. Only OpenAI steps show prompt widget.

### FIX-032: IMPLEMENTED state missing from STATE_TO_NEXT_STEP
- **File:** `serve-dashboard.mjs` (STATE_TO_NEXT_STEP map)
- **Bug:** When task was at state IMPLEMENTED (set by guardrail routing after execute), cascade restart would fall through to step 0 (architect) because IMPLEMENTED wasn't in the STATE_TO_NEXT_STEP map.
- **Fix:** Added `'IMPLEMENTED': 'merge'` to STATE_TO_NEXT_STEP. Now cascade correctly skips to merge step.
- **Impact:** Prevented cascades from re-running architect/critique/synthesize for already-executed tasks.

### FIX-033: Cowork test timeout too short for tool-enabled CLI
- **File:** `cowork-test.mjs` (CONFIG)
- **Bug:** 180s timeout was too short for tool-enabled Claude CLI which does multi-turn work (read files, analyze, respond).
- **Fix:** Increased timeout to 300s (5 min). Also optimized prompt to be leaner — instead of embedding full file contents, tells Claude to use Read/Glob/Grep tools to inspect files directly.

### FIX-034: logUsage() drops costUsd, numTurns, cacheReadTokens
- **File:** `_llm-utils.mjs` (logUsage function)
- **Bug:** Tool-mode code passed `costUsd`, `numTurns`, `cacheReadTokens` to `logUsage()` but the function signature only destructured the old fields — new fields were silently dropped.
- **Fix:** Extended `logUsage()` signature to accept and persist all three fields. Dashboard now shows dollar costs alongside token counts.

### FIX-035: Dashboard hardcodes execute step as "claude"
- **File:** `dashboard.html` (PIPELINE_STEPS)
- **Bug:** Execute step had `ai:'claude'` hardcoded. Tasks with `executor: codex` still showed "claude" in the pipeline view.
- **Fix:** Changed to `ai:'auto'` and resolve dynamically from `task.executor` at render time. Both pipeline flow and detail panel now show correct executor.

### FIX-036: Docs-lane tasks trigger unnecessary cowork test
- **File:** `execute-task-api.mjs` (guardrail logic)
- **Bug:** Function-count and line-shrinkage guardrails triggered YELLOW for docs-lane tasks (which write markdown, not code). Caused a 2+ minute cowork test that added no value.
- **Fix:** Docs-lane tasks (`lane_type.includes('docs')`) now skip guardrail validation and are set to GREEN directly.

### FIX-037: Sandbox detection banner in dashboard UI
- **File:** `dashboard.html`
- **Feature:** Yellow banner appears when tasks have DNS/network errors (EAI_AGAIN, ENOTFOUND, ECONNREFUSED) indicating sandbox mode. Shows instructions to run server locally for full API access. Dismissable with click.

## Fixed (2026-04-09) — Pipeline Reorder & Bug Fixes

### FIX-044: Pipeline reorder — merge is now last step
- **Files:** `serve-dashboard.mjs` (5 locations), `generate-pr-draft.mjs`, `dashboard.html` (4 files)
- **Change:** Pipeline order changed from `execute → merge → followups → pr-draft` to `execute → followups → pr-draft → merge`. Follow-up proposals are generated before merge, but tasks are only spawned after successful merge (spawn logic is at end of cascadeRunTask which is after merge since merge is now last). This prevents premature task completion and ensures all artifacts exist before merge.
- **Resolves:** BUG-009 (cosmetic FAILED status), premature task completion issue

### FIX-043: Atomic task ID counter with file lock
- **File:** `serve-dashboard.mjs` (nextTaskId function)
- **Feature:** Uses `.task-counter` file with `.task-counter.lock` (O_EXCL exclusive create) for atomic ID assignment. Scans both active and archived task directories to prevent ID reuse. Stale lock detection (5s timeout). Falls back to original scan-based logic if lock fails.
- **Resolves:** BUG-013

## Fixed (2026-04-09) — Cleanup & Reliability Fixes

### FIX-038: Game auth-state.js inlined to fix sandbox proxy 503
- **File:** `index.html` (game code)
- **Bug:** `auth-state.js` loaded as ES module via `<script type="module" src="./auth-state.js">`. Sandbox proxy returned 503 for secondary `.js` module imports, so `window.AuthFunctions` was never set. `showLoginScreen()` polled forever with no UI rendered.
- **Fix:** Inlined all auth-state functions directly into a regular `<script>` block. No external module fetch needed. Also fixed relative path issue (`./auth-state.js` resolved to `/game/auth-state.js` when served from `/game` route).

### FIX-039: Enhanced follow-up dedup (scope + title + written_files)
- **File:** `serve-dashboard.mjs` (isDuplicate function)
- **Bug:** Follow-up dedup only checked Jaccard similarity on title (>0.75). Tasks with different titles but identical scope/files were spawned as duplicates.
- **Fix:** New `isDuplicate()` function checks three dimensions:
  1. Title similarity (Jaccard >0.75) — existing check
  2. Scope/description similarity (Jaccard >0.6) — new
  3. Written files overlap (>50% shared files by basename) — new
- **Backwards compatible:** `isDuplicateTitle()` wrapper preserved for existing callers.

### FIX-040: Pre-execute file conflict detection
- **File:** `execute-task-api.mjs`
- **Feature:** Before the LLM call, scans all other active tasks for `written_files` overlap. If conflicts found, injects a warning into the execute prompt: "Other active tasks modify the same files — do NOT contradict their changes." Logs conflicts to console.
- **Impact:** Prevents contradicting changes when tasks share files. No blocking — just awareness injection.

### FIX-041: Decisions tab shows all proposals (not just open)
- **File:** `serve-dashboard.mjs` (`GET /api/state`)
- **Bug (BUG-010):** `/api/state` only loaded open decision proposals. Resolved proposals were never sent to the UI. The Decisions tab showed an empty "Resolved" section.
- **Fix:** Now loads ALL decision proposals with dedup by `decision_proposal_id`. UI correctly splits open vs resolved.

### FIX-042: Archived old tasks, proposals, prompts, and decisions
- **Files:** `state/tasks/archived/`, `state/proposals/archived/`, `state/prompts-queue/archived/`, `state/decision_proposals/archived/`
- **Feature:** Moved 47 old/stale tasks (PR_DRAFTED, NEW), 96 orphaned proposals, 77+ old prompts, and 6 resolved decisions to archived subdirectories. Dashboard only shows 11 active MERGED tasks. Clean state for new development.
