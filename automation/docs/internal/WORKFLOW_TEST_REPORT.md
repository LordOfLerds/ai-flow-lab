---
type: result
created: 2026-04-10
tags: [ai-flow-lab, result]
---

# AI Flow Lab — End-to-End Workflow Test Report

**Date:** 2026-04-08
**Tester:** Claude (Cowork session)
**Mode:** APP mode (ChatGPT simulated, Gemini rerouted to prompt queue, Claude CLI for execute)
**Goal tested:** G-0003 — Build complete Pixel Runner game
**Tasks tested:** T-0040 through T-0045 (6 tasks)

---

## Executive Summary

All 6 tasks were run through the complete 7-step pipeline (Architect → Critique → Synthesize → Execute → Merge → Follow-ups → PR Draft) in APP mode. The pipeline fundamentally works end-to-end, but several bugs and workflow gaps were discovered and fixed during testing. The execute step is the weakest link — `claude --print` frequently fails to output code in the expected `\`\`\`file:path` format, resulting in empty file writes and "phantom merges" where the pipeline advances but no actual code changes are applied.

## Test Matrix

| Test | Result | Notes |
|------|--------|-------|
| Happy path (T-0041) | ✅ Pass | Full pipeline completed with all 7 steps |
| Concurrent execution (T-0040 + T-0041) | ✅ Pass | Both ran simultaneously, no state corruption |
| 4-task concurrent (T-0042–T-0045) | ✅ Pass | All 4 ran in parallel, completed without conflicts |
| Abort at architect + retry | ✅ Pass | Manual state reset → retry → new cascade started |
| Critique routing fix | ✅ Pass (bug fix) | Gemini unreachable → rerouted to prompt queue |
| Guardrail RED detection (T-0043) | ✅ Pass | Detected 53/55 functions missing, blocked correctly |
| Guardrail restore snapshot | ✅ Pass | 1 file restored, task set to FAILED for retry |
| Execute empty output | ⚠️ Known issue | `claude --print` doesn't use `\`\`\`file:path` format |
| Execute timeout | ⚠️ Known issue | 15-min default too low; increased to 30 min |
| Followups parser (### F-N format) | ⚠️ Known issue | Initial response used wrong format; parser strict |
| Double-click retry | ❌ Not tested | No race condition test performed |
| Cowork test failure + retry | ❌ Not tested | No cowork tests triggered (all guardrails GREEN or RED) |

## Bugs Found and Fixed

### 1. Critique routing fails when Gemini API unreachable (FIXED)
- **Symptom:** T-0041 failed at critique step with DNS resolution error for `generativelanguage.googleapis.com`
- **Root cause:** In APP mode, critique defaults to Gemini API which requires internet access
- **Fix:** Changed `ai/project.config.yaml` to route `critique: openai` (prompt queue) instead of `critique: gemini`
- **Impact:** Critical — blocks entire pipeline in offline/sandboxed environments

### 2. `prompt` → `input` mapping missing for rerouted steps (FIXED)
- **Symptom:** `callLLMApp` received `undefined` for `promptContent`, threw `ERR_INVALID_ARG_TYPE`
- **Root cause:** Critique script passes `prompt` parameter but `callOpenAI` only uses `instructions`/`input`. When critique was rerouted from gemini to openai, the prompt wasn't mapped.
- **Fix:** Added `const effectiveInput = input || prompt || ""` in the openai default case of `callLLMForStep`
- **Impact:** Critical — any step rerouted from gemini to openai would fail silently

### 3. Execute step timeout too short (FIXED)
- **Symptom:** T-0041 execute killed with SIGTERM after ~15 minutes
- **Root cause:** Both `callClaudeCLI` timeout (900000ms) and cascade step timeout (900000ms) were 15 min; large game files need more
- **Fix:** Increased both to 1800000ms (30 min)
- **Impact:** High — large files consistently time out at 15 min

## Bugs Found — NOT Fixed (Workflow Gaps)

### 4. Execute step produces 0 written files (CRITICAL)
- **Symptom:** All 6 tasks had `written_files: []` — no actual code was applied to `index.html`
- **Root cause:** `claude --print` outputs code as markdown with ` ```javascript` or ` ```html` fences but NOT with the expected ` ```file:path/to/file.ext` format. The regex `fileBlockRegex = /\`\`\`file:([^\n]+)\n([\s\S]*?)\`\`\`/g` finds no matches.
- **Impact:** CRITICAL — the entire execute → merge pipeline is broken for code changes. Files pass through untouched. The pipeline completes but no game code is ever written.
- **Suggested fix:** Either (a) update the prompt to more aggressively instruct Claude to use the `\`\`\`file:path` format, or (b) add fallback parsing for `\`\`\`html`, `\`\`\`javascript`, etc. and infer the filename from the task's file targets, or (c) use `claude` in interactive mode with tools instead of `--print`.

### 5. No abort/cancel API for running tasks
- **Symptom:** Once a cascade starts, there's no way to stop it through the UI or API
- **Root cause:** No `POST /api/tasks/:id/cancel` endpoint exists; no "Cancel" button in the dashboard
- **Impact:** Medium — users must wait for timeout or manually edit task JSON
- **Suggested fix:** Add a cancel endpoint that sets a flag in the task JSON; the cascade loop checks this flag between steps.

### 6. Goal chat parser only accepts one format
- **Symptom:** Decomposition in `## Task 1: Title` format fails; only `**Title** (type) — description` works
- **Root cause:** `goalConvertToTasks()` uses a single regex: `/\*\*(.+?)\*\*\s*\((\w+)\)\s*[—–-]\s*(.*)/`
- **Impact:** Medium — users typing natural task lists get nothing parsed
- **Suggested fix:** Add multiple regex patterns or use a more flexible parser

### 7. `nextTaskNum()` creates duplicate IDs in batch create
- **Symptom:** When creating 5 tasks in a loop, all get the same ID (T-0040) because `APP.state.tasks` isn't refreshed between API calls
- **Root cause:** `nextTaskNum()` reads from in-memory state which doesn't update until the next `APP.refresh()` cycle
- **Impact:** Medium — bulk task creation silently fails for 4 out of 5 tasks
- **Suggested fix:** Refresh state after each successful create, or use server-side auto-increment IDs

### 8. Follow-ups parser extremely strict on format
- **Symptom:** Follow-ups response with `### 1.` format fails with "No follow-up blocks (### F-N) found"
- **Root cause:** Parser regex requires exactly `### F-\d+` format
- **Impact:** Low-Medium — manual responses from ChatGPT may not use this format
- **Suggested fix:** Accept both `### F-1` and `### 1` formats, or provide clearer format instructions in the prompt

### 9. Guardrail allows phantom merges
- **Symptom:** When execute writes 0 files, guardrail classifies as GREEN (no issues) and merge proceeds
- **Root cause:** `validateWrittenFiles` only checks files that were written; with 0 files, there's nothing to check
- **Impact:** High — tasks silently complete with no actual changes
- **Suggested fix:** Add a check: if `writtenFiles.length === 0`, classify as RED (no output produced)

### 10. Git branch not properly managed in execute
- **Symptom:** `propose-followups` fails with "fatal: ambiguous argument 'main...feature/T-0041-login-ui-and-persistence'"
- **Root cause:** The branch was created but `claude --print` doesn't actually check out or commit to it. The merge step doesn't have real changes to merge.
- **Impact:** Medium — follow-ups step fails on first attempt, needs retry

## Concurrency Analysis

Running up to 4 tasks simultaneously revealed no state corruption or data races in the file-based state store. Each task has its own JSON file and prompt queue entries are namespaced by timestamp + task ID. The main concurrency risk is the `execute` step where multiple Claude CLI processes may attempt to modify the same files, but since the execute step wasn't actually writing files (bug #4), this wasn't triggered.

**Recommendation:** Once bug #4 is fixed (execute actually writes code), concurrent execution of tasks targeting the same files WILL cause conflicts. The pipeline needs either:
1. A file-level locking mechanism
2. Git worktrees per task (the `worktree_path` field exists but isn't used)
3. Sequential execution of tasks touching the same files

## Performance Observations

| Step | Typical Duration | Notes |
|------|-----------------|-------|
| Architect (prompt queue) | Instant (human sim) | Depends on user response time |
| Critique (prompt queue) | Instant (human sim) | Was Gemini API, now prompt queue |
| Synthesize (prompt queue) | Instant (human sim) | Depends on user response time |
| Execute (Claude CLI) | 5-15 minutes | Highly variable; sometimes empty output |
| Merge | < 1 second | Fast, but often no-op due to bug #4 |
| Follow-ups (prompt queue) | Instant (human sim) | Strict format parsing |
| PR Draft | < 2 seconds | Template-based, works well |

## Recommendations for Optimal Workflow

### Must-Have (Blocking)
1. **Fix execute step file extraction** — This is the #1 priority. Without actual code being written, the pipeline is a documentation generator, not a code automation tool.
2. **Add 0-file guardrail check** — Detect when execute produces no files and flag as RED.
3. **Add cancel/abort API** — Users need to be able to stop a running cascade.

### Should-Have (Important)
4. **Implement git worktrees** — The `worktree_path` field exists but isn't used. Each task should edit code in an isolated worktree to prevent concurrent file conflicts.
5. **Flexible format parsing** — Both the goal decomposition parser and follow-ups parser are too strict. Add multiple format support.
6. **Batch task creation fix** — `nextTaskNum()` needs to account for pending creates.

### Nice-to-Have (Polish)
7. **Auto-retry on empty execute output** — If the CLI returns content but no file blocks, retry once with a more explicit prompt.
8. **Estimated time display** — Show expected duration for each step in the UI.
9. **Task dependency graph** — Show which tasks depend on which, prevent out-of-order execution.
10. **Prompt template library** — Store successful prompts that produced correct file blocks for reuse.

## Files Modified During Testing

| File | Change | Purpose |
|------|--------|---------|
| `ai/project.config.yaml` | `critique: gemini` → `critique: openai` | Route critique through prompt queue |
| `automation/scripts/_llm-utils.mjs` | Added `input \|\| prompt` fallback | Fix prompt→input mapping for rerouted steps |
| `automation/scripts/_llm-utils.mjs` | Timeout 900000 → 1800000 | Prevent execute timeout for large files |
| `automation/scripts/serve-dashboard.mjs` | Timeout 900000 → 1800000 | Match cascade step timeout to CLI timeout |
