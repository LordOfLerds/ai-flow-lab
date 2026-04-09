# AI Flow Lab — End-to-End Test Report

**Date:** 2026-04-06
**Tester:** Claude (automated)
**Project:** ai-flow-lab (Snake Game)

---

## 1. Cascade Run (G-0001)

**Result: PASS (with 1 failure)**

The full cascade pipeline ran successfully for goal G-0001 "Build the playable single-file Snake game foundation":

- 9 initial tasks were decomposed from the goal
- 43 follow-up tasks were spawned recursively (depth 2-3)
- **51 of 52 tasks reached PR_DRAFTED** state
- **T-0006 stuck at ARCHITECTED** — the critique step failed and was never retried
- Total token usage: 4.3M tokens (OpenAI 4.2M, Gemini 175.4k)
- Pipeline stages all worked: architect → critique → synthesize → propose-followups → pr-draft

**Key finding:** The pipeline produces planning artifacts (specs, reviews, implementation briefs, PR drafts) but does NOT generate actual executable code. There is no `index.html` for the Snake game — only detailed plans for how to build it.

---

## 2. Dashboard UI Testing

### Views Tested

| View | Status | Notes |
|------|--------|-------|
| Dashboard | PASS | Stats cards (52 tasks, 1 goal, 28 decisions, 132 PR drafts), activity feed, New Goal/Task buttons |
| Pipeline - Flow View | PASS | 17 features listed with task IDs, states, executor badges, Details buttons |
| Pipeline - Kanban View | PASS | Columns: NEW, ARCHITECTED, CRITIQUED, SYNTHESIZED, IMPLEMENTING, REVIEWED, PR_DRAFTED (51) |
| Goals | PASS | G-0001 with progress bar (8/9 tasks), goal detail with ChatGPT workspace |
| Documents - By Task | PASS | Organized per task with spec/review/brief/followups/PR draft |
| Documents - By Category | PASS | 52 specs listed by category |
| Documents - Viewer | PASS | Renders markdown content in side panel |
| Branches - Git History | PASS | Task tree with L2/L3 nesting, Merge All (51) button |
| Branches - Task Tree | PASS | Same tree view showing origin/state/type/executor columns |
| Decisions | PASS | 28 open decisions with priority badges, option dropdowns, rationale fields, Resolve buttons |
| ChatGPT | PASS | Prompt Queue and Send Response interface (empty in API mode) |
| Token Usage | PASS | Provider breakdown (OpenAI/Gemini/Codex/Claude), detailed usage log table |
| Settings | PASS | LLM Mode toggle (API/APP/MOCK), project info, data sources status |

### Navigation

| Element | Status | Notes |
|---------|--------|-------|
| Sidebar links | PASS | All 9 sidebar items navigate correctly |
| Flow/Kanban toggle | BUG | Switches to Kanban but cannot switch back to Flow View — only hard reload (Cmd+Shift+R) restores it |
| Refresh button | PASS | Reloads data |
| Details expand/collapse | PASS | Shows pipeline steps with status and token counts |
| Document click-to-view | PASS | Opens document content in viewer panel |

---

## 3. Goal Creation (G-0002)

**Result: PARTIAL PASS**

- "New Goal" button opens modal correctly
- Auto-assigns next goal ID (G-0002)
- Title, Description, Priority fields all work
- Priority dropdown (P0-Critical to P3-Low) works
- "Create Goal" saves and shows in goals list with correct state (NEW, P2)
- Goal detail view shows ChatGPT Workspace with Decompose/Plan/Refine buttons
- Actions panel shows: Add Task Manually, Run Cascade, Set Planned, Set In Progress, Mark Done

**Issues found:**
- "Decompose" button queues prompt but doesn't actually create tasks in API mode (says "check ChatGPT view" but nothing appears there either)
- The goal markdown file (`ai/goals/G-0002.md`) is NOT auto-created by the dashboard — only the JSON state file is created, which means the `plan-goal-api.mjs` script fails because it expects both files
- "Run Cascade" endpoint crashed the server when triggered for G-0002 (likely because the plan step failed due to missing goal markdown)

---

## 4. Bugs Found

### Critical

1. **Server crash on cascade for new goals** — The `/api/cascade/run-goal` endpoint crashes the Node.js server when the `plan-goal-api.mjs` script fails (e.g., missing goal markdown file). The `execSync` call throws an unhandled error that kills the process.

2. **Goal creation incomplete** — The dashboard's "Create Goal" API creates `automation/state/goals/G-XXXX.json` but does NOT create `ai/goals/G-XXXX.md`. The plan-goal script requires both files, so any newly created goal cannot be decomposed without manually creating the markdown.

### Medium

3. **Flow/Kanban toggle is one-way** — Once switched to Kanban View in the Pipeline, clicking "Flow View" does not switch back. Only a hard page reload restores the Flow View. The toggle button appears active but the view doesn't change.

4. **Decompose button in API mode is broken** — Clicking "Decompose" in a goal's ChatGPT Workspace shows "Decomposition prompt queued" but no tasks are actually created and no response appears in the chat or ChatGPT view.

5. **T-0006 stuck at ARCHITECTED** — The critique step failed for this task during the cascade but it was never retried. The cascade moved on to the next task, leaving T-0006 permanently stuck.

### Low

6. **execSync blocks event loop** — The cascade engine uses `execSync` for each pipeline step, blocking the entire Node.js server during cascade execution. The dashboard becomes completely unresponsive while a cascade is running.

7. **No error recovery in cascade** — When a pipeline step fails for a task, the cascade skips it and moves on. There's no retry mechanism or way to re-run a failed step from the UI.

---

## 5. Feature Gaps

1. **No code executor** — The pipeline produces implementation briefs and PR drafts but has no step that generates actual source code. An "executor" step is needed to convert briefs into working code.

2. **No single-task cascade from UI** — The "Run Cascade" button only exists at the goal level. There's no way to run the cascade for a single task from the Pipeline view.

3. **No task retry from UI** — Failed tasks (like T-0006) cannot be retried from the dashboard.

---

## 6. Summary

The AI Flow Lab dashboard is a well-designed planning pipeline with a polished dark-mode UI. All 9 major views render correctly with proper data. The cascade engine successfully processed 51 of 52 tasks through the full pipeline in a single run. The main gaps are around error handling (server crashes, missing file creation, stuck tasks) and the absence of an actual code generation step. The Flow/Kanban toggle bug is a minor UI issue that needs a quick fix.
