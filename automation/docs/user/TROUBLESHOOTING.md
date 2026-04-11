# Troubleshooting Guide

## Task Stuck at "Running" (Ghost State)

**Symptom:** Task shows `running` in dashboard for hours, no progress updates.

**Cause:** Server restarted or crashed mid-execution. Task state was never updated in the database.

**Fix:**
1. Restart the server: `npm restart` (SaaS: automatic recovery within 5 minutes)
2. Dashboard polls for state changes; it detects the recovery
3. Pipeline resumes from the last completed step (idempotent retry)

**Prevention:** Enable persistence logging via `DEBUG=ai-flow-lab:*` to track state transitions.

## Task Stuck at "Queued"

**Symptom:** Task sits in QUEUED state; architect step never starts.

**Cause:** State file wasn't updated after a step completed. Cascade engine skips already-running tasks.

**Fix:**
1. Click **Retry** button on the task card
2. System re-checks state and advances to architect step
3. If still stuck, check logs: `tail -f logs/flow.log | grep TASK_ID`

**Root causes to check:**
- API quota exhausted (check OpenAI/Gemini/Anthropic dashboards)
- Network error during state write (transient; retry usually fixes)
- Invalid executor_routing config (check project.config.yaml syntax)

## API Timeouts / Rate Limits

**Symptom:**
- Step fails with "Timeout" or "Rate limit exceeded (429)"
- Architect/Critic/Synthesize steps suddenly fail after working fine

**Cause:**
- OpenAI/Gemini/Anthropic rate limits exceeded
- Request too large (prompt exceeds token limit)
- Network latency spike

**Quick Fix:**
1. **Immediate:** Click Retry after 60 seconds (or longer for rate limits)
2. **Check quotas:** View your API provider's dashboard
3. **Shorten prompts:** Edit goal/task description to be more concise

**Workaround for strict rate limits:**
- Switch executor_routing to use a different provider (e.g., Claude instead of OpenAI)
- Reduce cascade_limits.max_parallel_tasks (run fewer tasks concurrently)
- Disable Test step (via executor_routing.test: null) to reduce API load

## Git Merge Conflicts

**Symptom:** Task fails at Merge step with "Conflict detected in file X".

**Cause:** Two or more parallel tasks modified the same file. Git can't auto-merge.

**Fix:**
1. **Manual resolution** (SaaS: contact support for git access):
   - Clone repo locally: `git clone ...`
   - `git checkout TASK_BRANCH`
   - `git rebase main` (or merge main, depending on your workflow)
   - Resolve conflicts in editor
   - `git add .` then `git rebase --continue` (or `git commit` if merging)
   - `git push --force-with-lease`
   - Dashboard detects merged branch, task auto-advances

2. **Prevention:**
   - Reduce max_parallel_tasks in cascade_limits (serialize execution)
   - Assign lanes to tasks that touch different files
   - Wait for one task to merge before spawning follow-ups

## State Inconsistencies

**Symptom:** Task shows SYNTHESIZED state, but no synthesized spec file exists. Or test results exist but state is still IMPLEMENTING.

**Cause:** Result file was generated but state write failed (file I/O error, database connection drop).

**Fix:**
1. Click **Retry** on the task
2. System re-evaluates: if result file exists, it updates state to match
3. Pipeline continues from correct step

**Debug check:**
```bash
# In project root:
ls -la .ai-flow-lab/tasks/TASK_ID/
# Should see: architect.md, critique.md, synthesized.md, execute.md, test.log, etc.
# Compare to dashboard state; if mismatch, retry
```

## APP Mode: Response Not Found

**Symptom:** You pasted your ChatGPT response, clicked Submit, but step completed without using it. Dashboard shows "response ignored".

**Cause:** You pasted the prompt instead of the response. Server wrote it to the wrong file.

**Fix:**
1. Look at the task's `.prompt.md` and `.response.md` files in `.ai-flow-lab/tasks/TASK_ID/`
2. If response file contains your prompt (not ChatGPT's answer), delete it: `rm .ai-flow-lab/tasks/TASK_ID/.response.md`
3. Manually paste the **correct** ChatGPT response into a text editor
4. Copy its content and re-submit via the widget
5. Click Submit again

**Prevention:** In APP mode, always copy ChatGPT's full response (the part after you sent your prompt), not the prompt itself.

## "Empty Response" from LLM

**Symptom:** Architect step completes, but spec is blank or just "{}" JSON.

**Cause:**
- Prompt was malformed or too short
- LLM hit rate limit and returned empty
- Unexpected response format

**Fix:**
1. Check the `.prompt.md` file: does it make sense?
2. If prompt is bad, edit the goal description (more detail, clearer requirements)
3. Click Retry on task
4. If issue persists, switch providers: edit project.config.yaml, change architect from openai to gemini
5. Retry

## Codex CLI Hangs

**Symptom:** Execute step (using Claude CLI) freezes for 5+ minutes, no output.

**Cause:** Claude CLI is waiting for interactive input (expecting stdin). Should be non-interactive.

**Fix (Implemented):**
- System auto-detects hang after 5 minutes, auto-kills process
- Falls back to Anthropic API call (no CLI needed)
- Task continues; cascade resumes

**Workaround if fallback isn't working:**
- Verify `claude --print` works locally: `echo "Hello" | claude --print "Repeat this: $$"`
- Check stdin/stdout aren't captured by another process
- Update Claude CLI: `npm install -g @anthropic-ai/cli@latest`

## Silent Failure in Follow-ups

**Symptom:** Task completes and merges, but no follow-ups are spawned even though spec clearly lists next steps.

**Cause:** Propose-Followups step didn't parse any F-# blocks from spec. System falls back to empty list (no error shown).

**Fix (Planned):**
- Spec must include explicit follow-up blocks: `## F-1: Write integration tests` or `### Follow-up: Add OAuth support`
- Each F-# block becomes a proposed follow-up task
- Current workaround: manually create follow-up goals in dashboard if auto-parse fails
- This will be patched to throw FAILED status with clear error message

**Verify spec format:**
```markdown
## F-1: Write unit tests
...details...

## F-2: Add CI/CD integration
...details...
```

If spec lacks F-# blocks, they won't auto-generate. Edit spec and re-trigger propose-followups.

## Wrong Dashboard After Server Start (Multi-Project)

**Symptom:** You start the server but see an old/outdated dashboard without multi-project support, inline APP mode prompts, or other recent features.

**Cause:** You're starting the server from the **project directory** (e.g. `aurena-wbs-ai-flow/automation/`) instead of from the **AI Flow Lab core directory** (`ai-flow-lab/automation/`). Each project has its own copy of `serve-dashboard.mjs` and `ui/dashboard.html`, but the canonical, up-to-date versions live in the `ai-flow-lab/` repo. The core server supports multi-project switching — it loads project-specific state and `.env` files dynamically.

**Fix:**
1. Always start the server from the **`ai-flow-lab/`** directory
2. Use the `restart-server.command` or `start-server.command` in `~/Dev/ai-flow-lab/` (double-click on macOS)
3. In the dashboard, use the project switcher to select your target project (e.g. `aurena-wbs`)

**What the `.command` files do:**
- `start-server.command`: `cd automation && LLM_MODE=app node scripts/serve-dashboard.mjs`
- `restart-server.command`: Same, but first kills any existing process on port 3847

**Important:** Do NOT create `.command` files in project directories — they would start the old, project-local copy of the server without multi-project support.

**Architecture:**
- `ai-flow-lab/automation/ui/dashboard.html` — canonical dashboard UI (230+ KB, full features)
- `ai-flow-lab/automation/scripts/serve-dashboard.mjs` — canonical server with `project-registry.mjs`, `switchToProject()`, `captureProjectContext()`
- `<project>/automation/` — project-local copies are older snapshots, NOT the source of truth
- `.env` is loaded first from `ai-flow-lab/automation/.env`, then overridden per-project via `dotenv.config({ override: true })` on project switch

## Gemini API Returns 429 (Rate Limit / Quota Exhausted)

**Symptom:** Critique step fails or hangs. Server logs show repeated `429 Too Many Requests` from Gemini API. Google AI Studio dashboard shows hundreds of errors.

**Cause:** The Gemini free tier has strict rate limits (requests per minute and per day). The retry loop in `callGemini()` (4 retries with exponential backoff) can exhaust quota quickly, especially if the server crashed and restarted mid-cascade (triggering re-execution of the same step).

**Quick Fix:**
1. Switch to a model with separate quota: edit `.env` → `GEMINI_MODEL=gemini-2.5-flash-lite`
2. Restart the server and click Retry on the failed task

**Model Options (as of April 2026):**

| Model | Speed | Cost | Quota | Notes |
|-------|-------|------|-------|-------|
| `gemini-2.5-flash` | Fast | Low | Shared | Default. Good for critique. |
| `gemini-2.5-flash-lite` | Fastest | Lowest | **Separate** | Best fallback when flash quota is exhausted |
| `gemini-2.5-pro` | Slow | High | Separate | Overkill for critique step |
| `gemini-2.0-flash` | — | — | — | **DEPRECATED — do not use** |
| `gemini-2.0-flash-lite` | — | — | — | **DEPRECATED — do not use** |

**Fallback behavior (APP mode):** If all Gemini retries fail due to network errors, `callGemini()` automatically falls back to the prompt queue — the critique step appears as a manual paste widget in the dashboard (same as OpenAI steps). This only triggers on network-level errors (`EAI_AGAIN`, `ENOTFOUND`, `ECONNREFUSED`), not on 429 quota errors.

**Long-term fix:** Upgrade to a paid Gemini API plan for higher rate limits, or route critique through a different provider via `executor_routing.critique` in `project.config.yaml`.

## Pipeline Step Fails — Auto-Diagnosis

**Symptom:** A pipeline step fails and the task shows a red error card with error details.

**What happens automatically:** When any step fails or times out, the system runs Claude CLI to analyze the error. You'll see an amber "Auto-Diagnosis" section under the error message with a structured root cause analysis and suggested fix.

**If diagnosis wasn't generated (e.g. Claude CLI not available):**
1. Click the "Re-diagnose" button on the failed task
2. This triggers `POST /api/tasks/:id/diagnose` which re-runs the Claude analysis
3. The diagnosis will appear after a few seconds (up to 2 minutes)

**Want Claude to fix it automatically?**
1. Click "Generate Fix" on the failed task
2. Claude analyzes the error and proposes a concrete code fix with diffs
3. Review the proposed changes and the risk level (LOW/MEDIUM/HIGH)
4. Click "Apply Fix" to accept — changes are committed and server restarts if needed
5. Click "Reject" to discard and try a different approach

**If diagnosis is unhelpful:**
- Check that your `ANTHROPIC_API_KEY` is set or `claude` CLI is installed and authenticated
- The diagnosis uses task context (state, error, artifacts) — if the step produced no artifacts, the diagnosis may be less specific
- You can always manually inspect the error log via `GET /api/tasks/:id/errors`
