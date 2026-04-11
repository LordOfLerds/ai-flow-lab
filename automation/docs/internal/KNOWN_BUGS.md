---
type: document
created: 2026-04-10
tags: [ai-flow-lab, document]
---

# Known Bugs & Issues

**Last updated:** 2026-04-08

## Open

### BUG-017: Gemini 2.0 models deprecated — causes critique step to hang
- **Severity:** High
- **Symptom:** Critique step hangs indefinitely or returns errors. No response from Gemini API.
- **Root cause:** `gemini-2.0-flash` and `gemini-2.0-flash-lite` were retired by Google ("eingestellt") as of early 2026. API calls to these models return errors or timeout silently.
- **Discovery:** T-0001 critique step stuck after `.env` was changed from `gemini-2.5-flash` (429 quota exhaustion) to `gemini-2.0-flash` (deprecated). The deprecated model endpoint does not return a clear deprecation error — it simply fails silently.
- **Fix:** Changed `GEMINI_MODEL` in both `.env` files to `gemini-2.5-flash-lite`:
  - `ai-flow-lab/automation/.env` — base config (loaded at server start)
  - `aurena-wbs-ai-flow/automation/.env` — project config (loaded on project switch)
- **Prevention:** Only use models listed as "Stabil" (stable) on the Google AI models page. Current stable models: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`.
- **Status:** FIXED (2026-04-09)

### BUG-018: Corrupted decision proposals (DP-0001, DP-0002) crash server JSON parser
- **Severity:** Medium
- **Symptom:** Server console spams `Error reading .../DP-0002.json: Unexpected token '/', "/sessions/"... is not valid JSON` on every poll cycle. Can cause cascade retry loops to crash.
- **Root cause:** Some process wrote the sandbox file path (`/sessions/gracious-eloquent-sagan/...`) as file content instead of actual JSON.
- **Fix:** Replaced both files with valid JSON objects (`{ "status": "resolved" }`).
- **Prevention:** `serve-dashboard.mjs` should wrap DP file reads in try/catch and skip malformed files instead of crashing.
- **Status:** FIXED (2026-04-09)

### BUG-019: snapshotSourceFiles() only scans top-level directory — FIXED (FIX-045)
- **Severity:** Critical
- **File:** `automation/scripts/execute-task-api.mjs` (snapshotSourceFiles function)
- **Symptom:** Execute step completes, files are written to disk by Codex/Claude CLI, but guardrail reports `written_files: []` and "0 files changed on disk". YELLOW guardrail triggers unnecessarily. Cowork Test runs on phantom "no changes" scenario.
- **Root cause:** `snapshotSourceFiles()` used `fs.readdirSync(dir)` which only reads the **top-level directory** — no recursion into subdirectories. In monorepo projects with `apps/`, `packages/`, `src/` etc., **zero source files** were captured in the pre-execution snapshot. Post-execution snapshot was equally empty, so the diff found nothing.
- **Impact:** Affected ALL projects with nested directory structures (i.e. every real project). Only flat single-directory projects worked correctly.
- **Discovery:** T-0001 on aurena-wbs project: Codex CLI ran for 285s, wrote 5 files (1 modified + 4 new), but `written_files: []` and guardrail was YELLOW. Git status confirmed files exist.
- **Fix (FIX-045):** Rewrote `snapshotSourceFiles()` with recursive `walkDir()`:
  - Recursively walks up to 12 levels deep
  - Skips `node_modules`, `.git`, `.next`, `dist`, `build`, etc.
  - Supports `.ts`, `.tsx`, `.jsx`, `.mts` (not just `.js`, `.ts`)
  - Safety cap of 2000 files to prevent scanning enormous repos
  - Uses `fs.readdirSync(dir, { withFileTypes: true })` for efficient directory traversal
- **Status:** FIXED (2026-04-09)

### BUG-021: process.cwd() in 25 pipeline scripts breaks multi-project state — FIXED (FIX-048)
- **Severity:** Critical
- **Symptom:** Follow-up proposals, task state, decisions, and other artifacts written to ai-flow-lab's state directory instead of the target project. Cascade thinks no proposals exist → no follow-ups spawned. Affects ALL multi-project pipelines.
- **Root cause:** 25 pipeline scripts used `const automationRoot = process.cwd()` to derive state paths. When the server runs scripts with `cwd: ai-flow-lab/automation` (for script resolution), `process.cwd()` returns ai-flow-lab's path instead of the target project. The `_llm-utils.mjs` utility already exported `automationRoot()` (reads `AUTOMATION_ROOT` env var) and `repoRoot()` (reads `REPO_ROOT` env var) but most scripts didn't use them.
- **Discovery:** T-0008 on aurena-k-list ran through entire pipeline (spec→review→brief→execute→followups→pr_draft), but proposals landed in ai-flow-lab/automation/state/proposals/ instead of aurena-k-list/automation/state/proposals/. Follow-ups were never spawned.
- **Fix (FIX-048):** Replaced `process.cwd()` with `automationRoot()` / `repoRoot()` imports in all 25 scripts:
  - propose-followups-api.mjs, synthesize-task-api.mjs, architect-task-api.mjs, plan-goal-api.mjs
  - chatgpt-browser-worker.mjs, smart-import.mjs, synthesize-task.mjs, start-goal.mjs
  - spawn-from-goal-proposal.mjs, spawn-followup-task.mjs, set-state.mjs, set-goal-state.mjs
  - run-goal-first-task.mjs, finalize-task.mjs, critique-task.mjs, close-task.mjs
  - check-artifacts.mjs, capture-decision.mjs, bootstrap-worktree.mjs, architect-task.mjs
  - run-task.mjs, run-e2e-test.mjs, prepare-worktree.mjs, new-task.mjs, init-project.mjs
- **Status:** FIXED (2026-04-10)

### BUG-022: Goal cascade allows double-start — tasks run in parallel — FIXED (FIX-049)
- **Severity:** High
- **Symptom:** Clicking "Run Cascade" on a goal while a cascade is already running starts a second parallel cascade. Tasks get corrupted state (e.g. T-0008 reverted from PR_DRAFTED to CRITIQUED by the second run).
- **Root cause:** `POST /api/cascade/run-goal` had no guard against re-entry. No check for `goal.state === 'IN_PROGRESS'` or running tasks.
- **Discovery:** T-0008 ran completely through the first cascade (all artifacts exist), but user clicked Run Cascade again. Second run overwrote T-0008's state back to CRITIQUED and started synthesize step again.
- **Fix (FIX-049):** Three guards added to serve-dashboard.mjs:
  1. Goal-level guard: reject HTTP 409 if goal is IN_PROGRESS and tasks have runtime_status=running
  2. Task-skip in goal loop: filter out PR_DRAFTED/MERGED and running tasks before cascade
  3. Task-level guard in cascadeRunTask: skip if runtime_status=running
- **Status:** FIXED (2026-04-10)

### BUG-023: Cascade status endpoint shows DELETED tasks
- **Severity:** Low
- **Symptom:** Dashboard "running" indicator shows old deleted tasks (T-0001-T-0007) because status endpoint doesn't filter by state.
- **Fix:** Added `state !== 'DELETED'` filter to `GET /api/cascade/status` endpoint.
- **Status:** FIXED (2026-04-10)

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

## Fixed (2026-04-09) — Snapshot & Guardrail Fixes

### FIX-045: Recursive snapshot for monorepo projects
- **File:** `automation/scripts/execute-task-api.mjs` (snapshotSourceFiles function)
- **Feature:** Complete rewrite of `snapshotSourceFiles()` from flat `readdirSync` to recursive `walkDir()`. Now correctly captures source files in nested directories (`apps/`, `packages/`, `src/`, etc.). Supports TypeScript extensions (`.tsx`, `.jsx`, `.mts`). Safety limits: max depth 12, max files 2000, max file size 1 MB, min 10 lines. Skips `node_modules`, `.git`, `.next`, `dist`, `build`, `.turbo`, `coverage`, `automation/state/`, `automation/test-fixtures/`, `.ai-flow-lab/`.
- **Resolves:** BUG-019
- **Impact:** Guardrail and snapshot-diff now work correctly for monorepo projects. Both Codex CLI and Claude CLI tool-mode benefit from this fix — any files they write in nested directories are now detected.

### FIX-046: YELLOW guardrail now pauses for user decision instead of auto-running Cowork Test
- **Files:** `automation/scripts/serve-dashboard.mjs` (cascade engine + retry flow, 2 locations)
- **Change:** Previously, YELLOW guardrail automatically launched `cowork-test.mjs` as fire-and-forget in the cascade flow. This wasted API budget when the user wasn't watching the dashboard, and the test results were often irrelevant (especially when YELLOW was caused by snapshot bugs like BUG-019).
- **New behavior:** YELLOW now behaves like RED — pipeline pauses at `BLOCKED_ON_DECISION`, creates a Decision Proposal with three options (Accept / Run Cowork Test / Restore Snapshot), and waits for user input. The user explicitly clicks "Run Cowork Test" if they want it.
- **Affected flows:** Main cascade (line ~2821) and retry flow (line ~2036). Both now `break`/`return` instead of continuing.
- **Resolves:** User complaint: "er soll das auch nur machen wenn UI da ist" (it should only do that when the UI is open).

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

### BUG-020: Guardrail "Accept" leaves task stuck at IMPLEMENTED/IDLE with no UI button to continue
- **Severity:** High
- **Symptom:** User clicks "Accept" on a RED/YELLOW guardrail decision. Task state becomes `IMPLEMENTED` / `runtime_status: IDLE`. No Retry button (requires `FAILED`), no Start button (requires `NEW`), only a "Details" button. Pipeline is stuck — user has no way to continue.
- **Root cause:** The accept handler set `runtime_status: 'IDLE'` and responded with "retry to continue pipeline", but the Retry button only renders when `runtime_status === 'FAILED'`. Dead end in the UI.
- **Discovery:** T-0020 in aurena-wbs project, user accepted RED guardrail (layout.tsx shrunk), task went to IMPLEMENTED/IDLE, no further progress possible.
- **Status:** FIXED by FIX-047 (2026-04-09)

### FIX-047: Guardrail accept auto-continues pipeline (propose-followups → pr-draft → merge)
- **File:** `serve-dashboard.mjs` (guardrail decision handler, `action === 'accept'`)
- **Bug (BUG-020):** After accepting guardrail, task was left at IMPLEMENTED/IDLE with no way to continue.
- **Fix:** Accept handler now:
  1. Sets `runtime_status: 'running'` and `current_step: 'propose-followups'` (not IDLE)
  2. Responds immediately to the user
  3. Runs remaining pipeline steps (propose-followups → pr-draft → merge) in fire-and-forget background, same pattern as the test and retry handlers
  4. After merge, spawns follow-up tasks from approved proposals
  5. On failure at any step, sets `runtime_status: 'FAILED'` and `failed_step` so Retry button appears
- **Impact:** All projects. Guardrail accept is now a one-click action that completes the pipeline.

### BUG-024: Snapshot extension filter misses Python/Markdown/Config files — FIXED (FIX-050)
- **Severity:** High
- **Symptom:** ALL tasks show Yellow Guardrail ("no files changed on disk") even though Claude DID write files via Edit/Write tools. Git commits prove files exist.
- **Root cause:** `snapshotSourceFiles()` in `execute-task-api.mjs` line 29 only captures web extensions (`.html`, `.js`, `.ts`, `.tsx`, `.jsx`, `.css`, `.mjs`, `.json`, `.mts`). Python (`.py`), docs (`.md`), config (`.yaml`, `.yml`) files are invisible to the snapshot diff.
- **Impact:** Every non-web-extension task gets `written_files: []` and Yellow Guardrail. Affects aurena-k-list (Python project) and any non-JS project.
- **Discovery:** T-0008, T-0009, T-0032, T-0033 all completed with valid artifacts on disk but all reported as Yellow.
- **Status:** FIXED by FIX-050 (2026-04-11)

### FIX-050: Expanded snapshot extension filter
- **File:** `execute-task-api.mjs` (snapshotSourceFiles, line 29)
- **Bug (BUG-024):** Snapshot only detected web-extension files.
- **Fix:** Added `.py`, `.pyi`, `.pyx`, `.md`, `.rst`, `.txt`, `.yaml`, `.yml`, `.toml`, `.cfg`, `.ini`, `.sh`, `.bash`, `.zsh`, `.sql`, `.r`, `.R`, `.rb`, `.go`, `.rs`, `.java`, `.vue`, `.svelte`, `.graphql`, `.gql`, `.env.example`, `.env.template`.
- **Impact:** All projects. Executor file detection now covers common source, docs, config, and shell files.

### BUG-025: new-task.mjs hardcodes `repo: "ai-flow-lab"` — FIXED (FIX-051)
- **Severity:** Medium
- **Symptom:** Follow-up tasks spawned via `spawn-followup-task.mjs` or `spawn-from-goal-proposal.mjs` get `repo: "ai-flow-lab"` even when running for a different project (aurena-k-list, aurena-wbs).
- **Root cause:** `new-task.mjs` line 39 had `repo: "ai-flow-lab"` hardcoded.
- **Discovery:** T-0032, T-0033, T-0034 all created with `repo: "ai-flow-lab"` despite being aurena-k-list tasks.
- **Status:** FIXED by FIX-051 (2026-04-11)

### FIX-051: Derive repo name from REPO_ROOT env var
- **File:** `new-task.mjs`
- **Bug (BUG-025):** Hardcoded `repo: "ai-flow-lab"`.
- **Fix:** Changed to `repo: path.basename(repoRoot())` — derives repo name from the `REPO_ROOT` env var (or cwd fallback).
- **Manual fix:** Corrected T-0032, T-0033, T-0034 task JSON files from `"ai-flow-lab"` to `"aurena-k-list"`.

### BUG-026: APP-mode prompts are 77KB+ due to full snapshot summary — FIXED (FIX-053)
- **Severity:** Medium
- **Symptom:** User sees enormous prompts (2000+ lines, 77KB) in ChatGPT prompt queue. Contains full file-by-file listing with function names for every file in the repo.
- **Root cause:** `execute-task-api.mjs` includes `snapshotSummary` (all files with line counts + function lists) in the execute prompt. Useful for tool-capable executors (Claude/Codex), useless for ChatGPT which can't read files.
- **Status:** FIXED by FIX-053 (2026-04-11)

### FIX-053: Compact snapshot for non-tool executors
- **File:** `execute-task-api.mjs`
- **Fix:** Detects `task.executor` — full snapshot for claude/codex (tool-capable), compact filenames-only list (max 50 files) for ChatGPT/OpenAI.

### BUG-027: APP-mode retries create duplicate prompts in queue — FIXED (FIX-054)
- **Severity:** Medium
- **Symptom:** Same 77KB prompt appears 2-5 times in prompts-queue for the same task+step. Each retry creates a new file.
- **Root cause:** `callLLMApp()` always creates a new prompt file. No dedup check for existing pending prompts.
- **Status:** FIXED by FIX-054 (2026-04-11)

### FIX-054: Prompt dedup in callLLMApp()
- **File:** `_llm-utils.mjs` (callLLMApp function)
- **Fix:** Before creating a new prompt, scans queue for existing pending prompt with same taskId+step. If found, polls for that prompt's response instead of creating a duplicate.

### BUG-028: Follow-up spiral on blocked tasks — FIXED (FIX-055)
- **Severity:** Medium
- **Symptom:** Task blocked on external dependency (missing fixture) → propose-followups spawns follow-ups that rediscover the same blocker → those spawn more follow-ups. 5 tasks spent documenting a missing file instead of doing useful work.
- **Root cause:** propose-followups prompt had no instruction to detect blocked state or suppress spawning.
- **Status:** FIXED by FIX-055 (2026-04-11)

### FIX-055: Blocked-dependency detection in propose-followups
- **File:** `propose-followups-api.mjs`
- **Fix:** Added two rules to the LLM instructions:
  1. If executor report shows task was BLOCKED on external dependency → set `should_spawn_now: false` for ALL follow-ups
  2. No busywork — don't propose follow-ups that only document/describe a problem already covered by the executor report

### FIX-052: Follow-up tasks inherit parent_goal_id
- **File:** `spawn-followup-task.mjs`
- **Bug:** Follow-up tasks (e.g. T-0034) were missing `parent_goal_id`, making them invisible to goal cascade status.
- **Fix:** After spawning, reads parent task JSON and copies its `parent_goal_id` to the new task.

### BUG-029: cascade-all deadlocks on stale `_runningCascades` counter — FIXED (FIX-056)
- **File:** `serve-dashboard.mjs`
- **Symptom:** `[CASCADE-ALL] Waiting for 1 running cascade(s)...` loops forever.
- **Root cause:** If a single cascade is started (e.g. user clicks "Run Cascade" on one task), then cancelled mid-step (APP-mode architect waiting on ChatGPT paste), the `_runningCascades` counter stays at 1 because the poll loop is still alive or the finally block never ran. When cascade-all then starts, it enters `while (_runningCascades > 0)` and never exits.
- **Impact:** cascade-all completely blocked, cannot run any goals.

### FIX-056: cascade-all stale counter protection
- **File:** `serve-dashboard.mjs`
- **Fix:** (1) Force-reset `_runningCascades = 0` at cascade-all start before any goals run. (2) Add 60s timeout (12 × 5s polls) in the per-goal wait loop — if counter is still >0 after 60s, force-clear and continue. (3) Added `POST /api/cascade/reset-counter` endpoint for manual recovery.
