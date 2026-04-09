# Execution Modes

AI Flow Lab supports four execution modes. Choose based on your workflow, API availability, and need for human review.

## Routing Matrix

How each AI provider behaves in each mode:

| Provider | API Mode | CLI Mode | APP Mode | Mock Mode |
|----------|----------|----------|----------|-----------|
| **OpenAI** | Automatic API call | Not used | Manual: prompt in ChatGPT app, response pasted back | Fixture file |
| **Gemini** | Automatic API call | Not used | Automatic API call | Fixture file |
| **Claude/Codex** | Automatic API call | Automatic via `claude --print` CLI | Automatic via `claude --print` CLI | Fixture file |

## API Mode

**When to use:** Production environments, CI/CD, full automation.

**Behavior:** Pipeline runs end-to-end without human intervention. All LLM calls go through their respective APIs.

**Prerequisites:**
- All 3 API keys in `.env`: OPENAI_API_KEY, GEMINI_API_KEY, CLAUDE_API_KEY
- Sufficient API quota / spending limits set
- LLM_MODE=api

**Pros:** Fastest, no manual work, fully auditable.
**Cons:** Highest API costs; no chance to inspect architect output before synthesis.

## CLI Mode

**When to use:** Local development; you have Claude CLI installed and no OpenAI key.

**Behavior:** Architect and Synthesize steps skip (or use a local fallback). Execute steps use `claude --print` for interactive Claude conversations.

**Prerequisites:**
- Claude CLI installed (`npm install -g @anthropic-ai/cli`)
- CLAUDE_API_KEY in `.env`
- LLM_MODE=cli

**Pros:** Lower cost than API mode; can use Claude for architecture if you prefer.
**Cons:** Slower (interactive CLI); requires manual input for some steps.

## APP Mode (Hybrid)

**When to use:** Learning, debugging, or when you want to review architect output before system commits.

**Workflow:**

1. **Pipeline reaches an OpenAI step** (architect, synthesize, pr_draft)
   - Server writes `.prompt.md` and `.meta.json` to `state/prompts-queue/`
   - Dashboard detects pending prompt, renders inline widget under that step

2. **You review the prompt** in the widget (shows full context, example outputs)

3. **Copy prompt → switch to ChatGPT desktop app → paste → run → copy response**

4. **Paste response into widget → click Submit**
   - Server writes `.response.md` and clears the lock
   - Pipeline continues automatically to next step

5. **If next step is Gemini or Claude**: runs automatically (no manual intervention)

6. **If next step is also OpenAI**: new widget appears for that step

**Key points:**
- Gemini (critique) always uses API automatically in APP mode
- Claude/Codex (execute) always uses CLI automatically in APP mode
- Only OpenAI steps are manual

**Unlock feature:** Before pipeline picks up your response, you can click "Unlock" to edit it.

**Prerequisites:**
- OPENAI_API_KEY in `.env` (for reference in prompt)
- ChatGPT desktop app open and authenticated
- LLM_MODE=app
- Gemini and Claude API keys (for their auto steps)

**Pros:** Best for learning; inspect architect reasoning; cost-effective hybrid approach.
**Cons:** Slower (waits for you to copy/paste); requires desktop app context switching.

## Mock Mode

**When to use:** Testing, CI environments without API keys, demonstration.

**Behavior:** All LLM calls read from fixture files (`state/fixtures/`) instead of calling real APIs. Deterministic, fast, repeatable.

**Prerequisites:**
- Fixture files created and committed (or auto-generated from real runs)
- LLM_MODE=mock

**Pros:** No API costs; instant; perfect for testing pipeline logic without LLM variability.
**Cons:** Responses are canned; doesn't test real AI output.

## Recommended Patterns

| Scenario | Mode | Why |
|----------|------|-----|
| Learning the platform | APP | Inspect architect output, understand reasoning |
| Local rapid iteration | CLI | Lower cost, familiar Claude environment |
| Production automation | API | Fastest, fully automated, auditable |
| PR testing before merge | Mock | Fast feedback, no API costs |
| Hybrid team workflow | APP | Architect manual, rest automated |

## Tool-Enabled Claude CLI

In CLI and APP modes, the execute step uses Claude CLI with `--allowed-tools` for direct file access. This is significantly more reliable than the older prompt-and-parse approach, especially for large files.

**How it works:**
- Claude CLI is invoked with `--allowed-tools "Read,Edit,Write,Glob,Grep"` for execute steps
- Claude reads source files directly, makes targeted edits, and reports what changed
- A snapshot diff detects which files were actually modified (no more regex parsing of output)
- Cost is capped per call via `--max-budget-usd` (default: $2.00 for execute, $1.00 for test, $0.50 for diagnose)
- JSON output (`--output-format json`) provides structured metadata: cost, turns, token usage

**Tool access by step:**

| Step | Tools | Budget | Purpose |
|------|-------|--------|---------|
| Execute | Read, Edit, Write, Glob, Grep | $2.00 | Implement code changes |
| Cowork Test | Read, Glob, Grep | $1.00 | Validate executor output |
| Diagnose | Read, Glob, Grep | $0.50 | Analyze pipeline failures |
| Generate Fix | Read, Edit, Write, Glob, Grep, Bash(git:*) | $1.00 | Auto-fix pipeline issues |

**Fallback:** If `--allowed-tools` fails (older CLI version), the system automatically falls back to plain `--print` mode with file content embedded in the prompt.

**Permission mode:** All tool-enabled calls use `--permission-mode acceptEdits` to allow file modifications without interactive approval.
