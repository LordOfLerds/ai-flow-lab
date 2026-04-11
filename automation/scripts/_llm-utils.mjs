import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

export function automationRoot() {
  return process.cwd();
}

export function repoRoot() {
  return path.resolve(process.cwd(), "..");
}

export function taskFilePath(taskId) {
  return path.join(automationRoot(), "state", "tasks", `${taskId}.json`);
}

export function goalFilePath(goalId) {
  return path.join(automationRoot(), "state", "goals", `${goalId}.json`);
}

export function loadTask(taskId) {
  const file = taskFilePath(taskId);
  if (!fs.existsSync(file)) {
    throw new Error(`Task file not found: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function saveTask(taskId, task) {
  const file = taskFilePath(taskId);
  task.updated_at = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(task, null, 2));
}

export function ensureTaskPaths(task, taskId) {
  if (!task.spec_path) task.spec_path = `ai/specs/${taskId}_spec.md`;
  if (!task.review_path) task.review_path = `ai/reviews/${taskId}_gemini_review.md`;
  if (!task.brief_path) task.brief_path = `ai/briefs/${taskId}_implementation.md`;
  return task;
}

export function readRepoFile(relPath) {
  const abs = path.join(repoRoot(), relPath);
  if (!fs.existsSync(abs)) return "";
  return fs.readFileSync(abs, "utf8");
}

export function writeRepoFile(relPath, content) {
  const abs = path.join(repoRoot(), relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

/**
 * Add YAML frontmatter to markdown content for Obsidian compatibility.
 * If content already has frontmatter (starts with ---), it is returned as-is.
 */
export function addFrontmatter(content, metadata = {}) {
  if (content.trimStart().startsWith('---')) return content;
  const fm = Object.entries(metadata)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`;
      return `${k}: ${v}`;
    })
    .join('\n');
  return `---\n${fm}\n---\n\n${content}`;
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function normalizeLaneType(value) {
  const v = (value || "").trim().toLowerCase();
  const map = {
    "analysis": "analysis-lane",
    "analysis-lane": "analysis-lane",
    "bug": "bug-lane",
    "bug-lane": "bug-lane",
    "feature": "feature-lane",
    "feature-lane": "feature-lane",
    "danger": "danger-lane",
    "danger-lane": "danger-lane",
    "docs": "docs-lane",
    "docs-lane": "docs-lane",
    "documentation": "docs-lane",
    "test": "test-lane",
    "tests": "test-lane",
    "test-lane": "test-lane"
  };
  return map[v] || "feature-lane";
}

export function normalizeExecutor(value, laneType = "") {
  const v = (value || "").trim().toLowerCase();
  if (["codex", "claude"].includes(v)) return v;
  if (["writer", "doc-writer", "docs-writer"].includes(v)) return "codex";
  if (normalizeLaneType(laneType) === "analysis-lane") return "claude";
  if (normalizeLaneType(laneType) === "danger-lane") return "claude";
  return "codex";
}

export function getLLMMode() {
  return (process.env.LLM_MODE || "mock").toLowerCase();
}

// ─── Quota state: persist per-provider exhaustion to disk ───

const _quotaStateFile = () => path.join(automationRoot(), "state", "quota-state.json");
let _quotaCache = null;
let _quotaCacheTs = 0;
const QUOTA_CACHE_TTL = 30_000;

export function getQuotaState() {
  if (Date.now() - _quotaCacheTs < QUOTA_CACHE_TTL && _quotaCache) return _quotaCache;
  try { _quotaCache = JSON.parse(fs.readFileSync(_quotaStateFile(), "utf8")); }
  catch { _quotaCache = {}; }
  _quotaCacheTs = Date.now();
  return _quotaCache;
}

export function setProviderExhausted(provider, ttlMs = 3_600_000) {
  const state = getQuotaState();
  state[provider] = {
    exhausted: true,
    exhaustedAt: new Date().toISOString(),
    resetAt: new Date(Date.now() + ttlMs).toISOString()
  };
  _quotaCache = state;
  _quotaCacheTs = Date.now();
  try {
    fs.mkdirSync(path.dirname(_quotaStateFile()), { recursive: true });
    fs.writeFileSync(_quotaStateFile(), JSON.stringify(state, null, 2));
  } catch {}
}

export function isProviderAvailable(provider) {
  const state = getQuotaState();
  const s = state[provider];
  if (!s || !s.exhausted) return true;
  if (s.resetAt && new Date(s.resetAt) <= new Date()) {
    // Auto-heal: TTL passed
    s.exhausted = false;
    _quotaCache = state;
    try { fs.writeFileSync(_quotaStateFile(), JSON.stringify(state, null, 2)); } catch {}
    return true;
  }
  return false;
}

// --- Executor routing: resolve provider per pipeline step + lane ---

/**
 * Reads executor_routing from project.config.yaml and returns the provider
 * for a given pipeline step and lane type.
 *
 * Pipeline steps: architect, critique, synthesize, execute, followups, pr_draft
 * Providers: openai, gemini, claude
 *
 * @param {string} step - Pipeline step name
 * @param {string} laneType - Lane type (e.g. "feature-lane", "bug-lane")
 * @returns {string} Provider name ("openai" | "gemini" | "claude")
 */
export function getProviderForStep(step, laneType = "feature-lane") {
  const root = repoRoot();
  const configPath = path.join(root, "ai", "project.config.yaml");

  // Defaults if no config found
  const defaultRouting = {
    architect: "openai",
    critique: "gemini",
    synthesize: "openai",
    execute: "codex",
    followups: "openai",
    pr_draft: "openai",
    "propose-followups": "openai"
  };

  if (!fs.existsSync(configPath)) {
    return defaultRouting[step] || "openai";
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const lines = raw.split("\n");

    // Parse executor_routing section
    let routing = {};
    let overrides = {};
    let section = null;     // null | "default" | "overrides"
    let overrideLane = null; // current lane in overrides

    for (const line of lines) {
      if (/^executor_routing\s*:/.test(line)) { section = "top"; continue; }
      if ((section === "top" || section === "default") && /^\s+default\s*:/.test(line)) { section = "default"; continue; }
      if ((section === "top" || section === "default") && /^\s+overrides\s*:/.test(line)) { section = "overrides"; continue; }

      // Default routing entries
      if (section === "default" && /^\s{4}\w/.test(line)) {
        const m = line.match(/^\s{4}(\w[\w-]*):\s*(.+)/);
        if (m) routing[m[1].trim()] = m[2].trim();
      }

      // Override lane header
      if (section === "overrides" && /^\s{4}[\w-]+\s*:/.test(line)) {
        const m = line.match(/^\s{4}([\w-]+)\s*:/);
        if (m) overrideLane = m[1].trim();
      }

      // Override entries
      if (section === "overrides" && overrideLane && /^\s{6}\w/.test(line)) {
        const m = line.match(/^\s{6}(\w[\w-]*):\s*(.+)/);
        if (m) {
          if (!overrides[overrideLane]) overrides[overrideLane] = {};
          overrides[overrideLane][m[1].trim()] = m[2].trim();
        }
      }

      // End of executor_routing block
      if (section && /^\S/.test(line) && !/^executor_routing/.test(line)) {
        break;
      }
    }

    // Normalize step name: "propose-followups" → "followups"
    const normalizedStep = step === "propose-followups" ? "followups" : step;

    // Check lane-specific override first
    const lane = (laneType || "").trim();
    if (overrides[lane] && overrides[lane][normalizedStep]) {
      return overrides[lane][normalizedStep];
    }

    // Then default routing
    if (routing[normalizedStep]) {
      return routing[normalizedStep];
    }

    // Fallback
    return defaultRouting[normalizedStep] || "openai";
  } catch (_) {
    return defaultRouting[step] || "openai";
  }
}

/**
 * Like getProviderForStep but returns {primary, fallbacks} supporting both
 * plain-string config (backward compat) and {primary, fallback:[]} object format.
 */
export function getRoutingForStep(step, laneType = "feature-lane") {
  const root = repoRoot();
  const configPath = path.join(root, "ai", "project.config.yaml");

  const defaults = {
    architect:  { primary: "openai",  fallback: ["gemini"] },
    critique:   { primary: "gemini",  fallback: ["openai"] },
    synthesize: { primary: "openai",  fallback: ["gemini"] },
    execute:    { primary: "codex",   fallback: ["claude"] },
    followups:  { primary: "openai",  fallback: ["gemini"] },
    pr_draft:   { primary: "openai",  fallback: ["gemini"] },
    "propose-followups": { primary: "openai", fallback: ["gemini"] }
  };

  const normalizedStep = step === "propose-followups" ? "followups" : step;

  const toRouting = (val) => {
    if (!val || typeof val === "string") return { primary: val || "openai", fallback: [] };
    // Already {primary, fallback} — normalize fallback key
    const fb = val.fallback || val.fallbacks || [];
    return { primary: val.primary || "openai", fallback: Array.isArray(fb) ? fb : [fb] };
  };

  if (!fs.existsSync(configPath)) return defaults[normalizedStep] || { primary: "openai", fallback: [] };

  try {
    const raw = fs.readFileSync(configPath, "utf8");

    // --- Parse executor_routing section (supports both plain and object YAML) ---
    let routing = {};
    let overrides = {};
    let section = null;
    let overrideLane = null;

    for (const line of raw.split("\n")) {
      if (/^executor_routing\s*:/.test(line)) { section = "top"; continue; }
      if ((section === "top" || section === "default") && /^\s+default\s*:/.test(line)) { section = "default"; continue; }
      if ((section === "top" || section === "default") && /^\s+overrides\s*:/.test(line)) { section = "overrides"; continue; }

      if (section === "default" && /^\s{4}\w/.test(line)) {
        const m = line.match(/^\s{4}(\w[\w-]*):\s*(.+)/);
        if (m) {
          const val = m[2].trim();
          // Detect inline object: { primary: openai, fallback: [gemini] }
          const primM = val.match(/primary:\s*([\w-]+)/);
          const fbM = val.match(/fallback:\s*\[([^\]]*)\]/);
          if (primM) {
            routing[m[1].trim()] = {
              primary: primM[1],
              fallback: fbM ? fbM[1].split(",").map(s => s.trim()).filter(Boolean) : []
            };
          } else {
            routing[m[1].trim()] = val;
          }
        }
      }

      if (section === "overrides" && /^\s{4}[\w-]+\s*:/.test(line)) {
        const m = line.match(/^\s{4}([\w-]+)\s*:/);
        if (m) overrideLane = m[1].trim();
      }
      if (section === "overrides" && overrideLane && /^\s{6}\w/.test(line)) {
        const m = line.match(/^\s{6}(\w[\w-]*):\s*(.+)/);
        if (m) { if (!overrides[overrideLane]) overrides[overrideLane] = {}; overrides[overrideLane][m[1].trim()] = m[2].trim(); }
      }
      if (section && /^\S/.test(line) && !/^executor_routing/.test(line)) break;
    }

    const lane = (laneType || "").trim();
    if (overrides[lane]?.[normalizedStep]) return toRouting(overrides[lane][normalizedStep]);
    if (routing[normalizedStep]) return toRouting(routing[normalizedStep]);
    return defaults[normalizedStep] || { primary: "openai", fallback: [] };
  } catch {
    return defaults[normalizedStep] || { primary: "openai", fallback: [] };
  }
}

/**
 * High-level dispatcher: calls the right LLM based on executor_routing config.
 * Maps provider names to actual API call functions.
 *
 * @param {object} opts - { instructions, input, taskId, step, laneType, prompt }
 *   For Gemini, pass `prompt` (single string) instead of instructions+input.
 * @returns {Promise<string>} LLM response text
 */
export async function callLLMForStep({ instructions, input, taskId, step, laneType, prompt }) {
  const mode = getLLMMode();
  const { primary, fallback: fallbacks = [] } = getRoutingForStep(step, laneType);
  console.log(`[routing] Step="${step}" Lane="${laneType}" → Primary="${primary}" Fallbacks=[${fallbacks.join(",")}] (mode=${mode})`);

  // Mock mode: use primary provider only
  if (mode === "mock") {
    const mp = primary === "codex" ? "openai" : primary;
    switch (mp) {
      case "claude": return await callClaude({ instructions, input, taskId, step });
      case "gemini": {
        const gp = prompt || (instructions ? `${instructions}\n\n---\n\n${input}` : input);
        return await callGemini({ prompt: gp, taskId, step });
      }
      default: return await callOpenAI({ instructions, input, taskId, step });
    }
  }

  // CLI mode: always Claude CLI regardless of provider
  if (mode === "cli") {
    console.log(`[routing] CLI mode → claude CLI`);
    return await callClaudeCLI({ instructions: instructions || "", input: input || prompt || "", taskId, step });
  }

  // API/APP mode: iterate through provider chain with quota fallback
  const chain = [primary, ...fallbacks].filter(p => isProviderAvailable(p));
  if (chain.length === 0) chain.push(primary); // always try primary even if exhausted

  let lastErr;
  for (const provider of chain) {
    try {
      console.log(`[routing] Trying provider "${provider}"`);
      return await _callWithProvider(provider, { instructions, input, prompt, taskId, step });
    } catch (err) {
      lastErr = err;
      const msg = err.message || "";
      const isQuotaErr = /quota exhausted|rate.?limit|free.tier|limit.*0|429|503 Service/i.test(msg);
      if (isQuotaErr) {
        const ttl = /quota exhausted|free.tier|limit.*0/i.test(msg) ? 86_400_000 : 3_600_000;
        console.warn(`[routing] Provider "${provider}" quota/rate error — marking exhausted (${ttl / 3600_000}h), trying fallback`);
        setProviderExhausted(provider, ttl);
        continue;
      }
      throw err; // non-quota errors propagate immediately
    }
  }

  // All providers exhausted → manual queue
  console.warn(`[routing] All providers exhausted for step="${step}" — falling back to manual queue`);
  return await callLLMApp({ instructions, input: input || prompt || "", taskId, step, provider: "manual-fallback", model: "manual" });
}

/** Internal dispatcher: maps provider name to the appropriate call function */
async function _callWithProvider(provider, { instructions, input, prompt, taskId, step }) {
  const i = instructions || "";
  const inp = input || prompt || "";

  switch (provider) {
    case "claude":
      return await callClaudeCLI({ instructions: i, input: inp, taskId, step });

    case "codex":
      try {
        const { execSync: es } = await import("node:child_process");
        es("which codex", { stdio: "ignore" });
        return await callCodexCLI({ instructions: i, input: inp, taskId, step });
      } catch {
        console.log(`[routing] codex CLI not found → fallback to Claude CLI`);
        return await callClaudeCLI({ instructions: i, input: inp, taskId, step });
      }

    case "gemini": {
      const gp = prompt || (instructions ? `${instructions}\n\n---\n\n${inp}` : inp);
      return await callGemini({ prompt: gp, taskId, step });
    }

    case "chatgpt_worker":
      return await callLLMApp({ instructions: i, input: inp, taskId, step, provider: "chatgpt-worker", model: "chatgpt" });

    case "openai":
    default:
      return await callOpenAI({ instructions, input: inp, taskId, step });
  }
}

// --- Mock LLM Support ---

export function getFixturesDir() {
  return path.join(automationRoot(), "test-fixtures");
}

export function loadMockResponse({ taskId, step, provider }) {
  const fixturesDir = getFixturesDir();

  // Try specific fixture first: llm/<step>/<taskId>.md
  const specificPath = path.join(fixturesDir, "llm", step || "generic", `${taskId || "default"}.md`);
  if (fs.existsSync(specificPath)) {
    return fs.readFileSync(specificPath, "utf8");
  }

  // Then try step-level default: llm/<step>/default.md
  const stepDefaultPath = path.join(fixturesDir, "llm", step || "generic", "default.md");
  if (fs.existsSync(stepDefaultPath)) {
    let template = fs.readFileSync(stepDefaultPath, "utf8");
    // Personalize mock output with actual task metadata
    if (taskId) {
      const taskFile = path.join(automationRoot(), "state", "tasks", `${taskId}.json`);
      try {
        const taskData = JSON.parse(fs.readFileSync(taskFile, "utf8"));
        template = template
          .replace(/T-E2E-P-1/g, taskId)
          .replace(/Add greeting section to README/g, taskData.title || taskId)
          .replace(/feature-lane/g, taskData.lane_type || "feature-lane");
      } catch { /* task file not found, use template as-is */ }
    }
    return template;
  }

  // Then try global default: llm/default.md
  const globalDefaultPath = path.join(fixturesDir, "llm", "default.md");
  if (fs.existsSync(globalDefaultPath)) {
    return fs.readFileSync(globalDefaultPath, "utf8");
  }

  // Fallback: generate a minimal deterministic response
  return `# Mock Response\n\nThis is a deterministic mock response for step="${step}", taskId="${taskId}", provider="${provider}".\n\nNo fixture file was found. Create one at:\n- ${specificPath}\n- ${stepDefaultPath}\n- ${globalDefaultPath}\n`;
}

export function estimateTokens(text) {
  // Rough estimation: average English word is ~4 characters, 1 token ~= 4 chars
  return Math.ceil((text || "").length / 4);
}

export function logUsage({ taskId, step, provider, model, inputTokens, outputTokens, durationMs, costUsd, numTurns, cacheReadTokens }) {
  const logDir = path.join(automationRoot(), "state", "usage-log");
  fs.mkdirSync(logDir, { recursive: true });

  const logFile = path.join(logDir, "usage-log.jsonl");
  const entry = {
    timestamp: new Date().toISOString(),
    taskId,
    step,
    provider,
    model,
    inputTokens: inputTokens || 0,
    outputTokens: outputTokens || 0,
    durationMs: durationMs || 0
  };
  // Tool-mode fields (from claude --print --output-format json)
  if (costUsd !== undefined && costUsd !== null) entry.costUsd = costUsd;
  if (numTurns !== undefined && numTurns !== null) entry.numTurns = numTurns;
  if (cacheReadTokens) entry.cacheReadTokens = cacheReadTokens;

  fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomJitter() {
  return 0.5 + Math.random() * 0.5; // 0.5x to 1.5x multiplier
}

export function classifyError(status, error) {
  // Transient: retry with backoff
  if ([408, 429, 500, 502, 503, 504].includes(status)) {
    return "transient";
  }
  // Permanent: don't retry
  if ([400, 401, 403, 404].includes(status)) {
    return "permanent";
  }
  // Unknown: treat as transient
  return "transient";
}

function extractOpenAIText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

export async function callOpenAI({ instructions, input, retries = 3, taskId = null, step = null }) {
  const mode = getLLMMode();

  // Mock mode: return fixture data
  if (mode === "mock") {
    const mockResponse = loadMockResponse({ taskId, step, provider: "openai" });
    console.log(`[MOCK] OpenAI response for ${step}/${taskId} (${mockResponse.length} chars)`);
    if (taskId && step) {
      logUsage({ taskId, step, provider: "openai", model: "mock", inputTokens: estimateTokens(input), outputTokens: estimateTokens(mockResponse), durationMs: 0 });
    }
    return mockResponse;
  }

  // CLI mode: Try Codex CLI first, then OpenAI API if key exists, then Claude CLI fallback.
  if (mode === "cli") {
    // 1. Try Codex CLI (codex exec)
    try {
      const { execSync } = await import("node:child_process");
      execSync("which codex", { stdio: "ignore" });
      console.log(`[CLI] Codex CLI found, using codex exec for ${step}/${taskId}`);
      return await callCodexCLI({ instructions, input, taskId, step });
    } catch {
      // codex not installed
    }

    // 2. Try OpenAI API if key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.trim()) {
      console.log(`[CLI] No codex CLI, but OPENAI_API_KEY found → using API for ${step}/${taskId}`);
      // Fall through to API mode below
    } else {
      // 3. Last resort: Claude CLI
      console.log(`[CLI] No codex CLI, no OPENAI_API_KEY → fallback to Claude CLI for ${step}/${taskId}`);
      return await callClaudeCLI({ instructions, input, taskId, step });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Missing required env var: OPENAI_API_KEY (set it in .env or use LLM_MODE=cli)");
  }
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  // If app mode, write prompt to queue and wait for response
  if (mode === "app") {
    return await callLLMApp({ instructions, input, taskId, step, provider: "openai", model });
  }

  // API mode
  const inputTokens = estimateTokens(input);
  const instructionTokens = estimateTokens(instructions);
  const startMs = Date.now();

  let lastError;
  let lastStatus = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          instructions,
          input
        })
      });

      lastStatus = res.status;
      const data = await res.json();

      if (res.ok) {
        const text = extractOpenAIText(data);
        if (!text) {
          throw new Error("OpenAI API returned no text output");
        }

        const durationMs = Date.now() - startMs;
        const outputTokens = estimateTokens(text);
        if (taskId && step) {
          logUsage({ taskId, step, provider: "openai", model, inputTokens: inputTokens + instructionTokens, outputTokens, durationMs });
        }

        return text;
      }

      lastError = new Error(`OpenAI API error: ${res.status} ${JSON.stringify(data)}`);
      const errorType = classifyError(res.status, lastError);

      if (errorType === "transient" && attempt < retries) {
        const backoffMs = 1500 * attempt * getRandomJitter();
        console.log(`Attempt ${attempt}/${retries} failed, retrying in ${backoffMs.toFixed(0)}ms...`);
        await sleep(backoffMs);
        continue;
      }

      throw lastError;
    } catch (e) {
      lastError = e;
      const isTimeout = e.message.includes("timeout") || e.message.includes("ETIMEDOUT");
      const shouldRetry = isTimeout && attempt < retries;

      if (shouldRetry) {
        const backoffMs = 1500 * attempt * getRandomJitter();
        console.log(`Attempt ${attempt}/${retries} failed (${e.message}), retrying in ${backoffMs.toFixed(0)}ms...`);
        await sleep(backoffMs);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

export async function callGemini({ prompt, retries = 4, taskId = null, step = null }) {
  const mode = getLLMMode();

  // Mock mode: return fixture data
  if (mode === "mock") {
    const mockResponse = loadMockResponse({ taskId, step, provider: "gemini" });
    console.log(`[MOCK] Gemini response for ${step}/${taskId} (${mockResponse.length} chars)`);
    if (taskId && step) {
      logUsage({ taskId, step, provider: "gemini", model: "mock", inputTokens: estimateTokens(prompt), outputTokens: estimateTokens(mockResponse), durationMs: 0 });
    }
    return mockResponse;
  }

  // CLI mode: Gemini has no CLI tool. Use API if key available, else Claude CLI fallback.
  if (mode === "cli") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim()) {
      console.log(`[CLI] Gemini API key found, using API for ${step}/${taskId}`);
      // Fall through to API mode below
    } else {
      console.log(`[CLI] No GEMINI_API_KEY → fallback to Claude CLI for ${step}/${taskId}`);
      return await callClaudeCLI({ instructions: "", input: prompt, taskId, step });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Missing required env var: GEMINI_API_KEY (set it in .env or use LLM_MODE=cli)");
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  // In APP mode, Gemini uses its API directly (only OpenAI/ChatGPT steps go through
  // the manual prompt queue). So APP mode falls through to the API path below.

  // API mode (also used in APP mode for Gemini)
  const inputTokens = estimateTokens(prompt);
  const startMs = Date.now();

  let lastError;
  let lastStatus = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ]
          })
        }
      );

      lastStatus = res.status;
      const data = await res.json();

      if (res.ok) {
        const text = (data.candidates ?? [])
          .flatMap((c) => c.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join("\n")
          .trim();

        if (!text) {
          throw new Error("Gemini API returned no text output");
        }

        const durationMs = Date.now() - startMs;
        const outputTokens = estimateTokens(text);
        if (taskId && step) {
          logUsage({ taskId, step, provider: "gemini", model, inputTokens, outputTokens, durationMs });
        }

        return text;
      }

      lastError = new Error(`Gemini API error: ${res.status} ${JSON.stringify(data)}`);
      const errorType = classifyError(res.status, lastError);

      const is429 = res.status === 429;
      const is503 = res.status === 503;
      const isOverload = is429 || is503;

      // 429 with "limit: 0" means free-tier is fully exhausted — no point retrying
      const isQuotaExhausted = is429 && JSON.stringify(data).includes('"limit":0');
      if (isQuotaExhausted) {
        console.warn(`[GEMINI] Free-tier quota exhausted for model ${model}. No retries.`);
        // In APP mode → fall back to prompt queue (ChatGPT manual)
        if (getLLMMode() === "app") {
          console.warn(`[GEMINI-FALLBACK] Quota exhausted → falling back to prompt queue for ${step}/${taskId}`);
          return await callLLMApp({ instructions: "", input: prompt, taskId, step, provider: "gemini-fallback", model: "manual-chatgpt" });
        }
        throw new Error(`Gemini free-tier quota exhausted. Either upgrade to a paid plan at https://ai.google.dev or switch LLM_MODE=cli to route critique through Claude CLI.`);
      }

      // 503 (overload) — retry with longer backoff
      const maxRetries = is503 ? Math.max(retries, 6) : retries;

      if (errorType === "transient" && attempt < maxRetries) {
        const backoffMs = is503
          ? Math.min(5000 * attempt * attempt * getRandomJitter(), 90000)
          : 2000 * attempt * getRandomJitter();
        console.log(`Attempt ${attempt}/${maxRetries} failed (${res.status}), retrying in ${(backoffMs/1000).toFixed(1)}s...`);
        await sleep(backoffMs);
        continue;
      }

      // If all retries exhausted for 503 in APP mode → fall back to prompt queue
      if (isOverload && getLLMMode() === "app") {
        console.warn(`[GEMINI-FALLBACK] ${res.status} after ${attempt} retries — falling back to prompt queue for ${step}/${taskId}`);
        return await callLLMApp({ instructions: "", input: prompt, taskId, step, provider: "gemini-fallback", model: "manual-chatgpt" });
      }

      throw lastError;
    } catch (e) {
      lastError = e;
      const isTimeout = e.message.includes("timeout") || e.message.includes("ETIMEDOUT");
      const shouldRetry = isTimeout && attempt < retries;

      if (shouldRetry) {
        const backoffMs = 2000 * attempt * getRandomJitter();
        console.log(`Attempt ${attempt}/${retries} failed (${e.message}), retrying in ${backoffMs.toFixed(0)}ms...`);
        await sleep(backoffMs);
        continue;
      }

      // Network-level errors (DNS, connection refused) → fall back to prompt queue in APP mode
      const isNetworkError = e.message.includes("EAI_AGAIN") || e.message.includes("ENOTFOUND") ||
                             e.message.includes("ECONNREFUSED") || e.message.includes("fetch failed");
      if (isNetworkError && getLLMMode() === "app") {
        console.warn(`[GEMINI-FALLBACK] Network error (${e.message.substring(0, 80)}) — falling back to prompt queue for ${step}/${taskId}`);
        return await callLLMApp({ instructions: "", input: prompt, taskId, step, provider: "gemini-fallback", model: "manual" });
      }

      throw lastError;
    }
  }

  throw lastError;
}

/**
 * Discover source files in the repo to provide as context for LLM prompts.
 * @param {number} maxFiles - Max number of files to include
 * @param {number} maxTotalKb - Max total size in KB
 * @returns {string} Concatenated file contents as "[path]\n<content>\n" blocks
 */
export function discoverSourceContext(maxFiles = 15, maxTotalKb = 80) {
  const root = repoRoot();
  const maxBytes = maxTotalKb * 1024;
  const results = [];
  let totalSize = 0;

  // Patterns to scan (relative to repo root)
  const globs = [
    "index.html", "game.html",
    "src/**/*.js", "src/**/*.ts", "src/**/*.mjs",
    "*.js", "*.mjs",
    "automation/scripts/*.mjs"
  ];

  // Dirs/files to skip
  const skipPatterns = [
    "node_modules", ".git", "state/", "test-fixtures/",
    "package-lock.json", ".env"
  ];

  function shouldSkip(relPath) {
    return skipPatterns.some(p => relPath.includes(p));
  }

  function scanDir(dir, base) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxFiles || totalSize >= maxBytes) return;
      const rel = path.join(base, entry.name);
      if (shouldSkip(rel)) continue;
      if (entry.isDirectory()) {
        scanDir(path.join(dir, entry.name), rel);
      } else if (/\.(js|mjs|ts|html|css|json|yaml|yml|md)$/i.test(entry.name)) {
        try {
          const full = path.join(dir, entry.name);
          const stat = fs.statSync(full);
          if (stat.size > 200 * 1024) continue; // skip files > 200KB
          if (totalSize + stat.size > maxBytes) continue;
          const content = fs.readFileSync(full, "utf8");
          results.push({ path: rel, content });
          totalSize += stat.size;
        } catch (_) {}
      }
    }
  }

  // First, add high-priority files if they exist
  const priorityFiles = ["index.html", "game.html", "CLAUDE.md", "AGENTS.md"];
  for (const pf of priorityFiles) {
    if (results.length >= maxFiles || totalSize >= maxBytes) break;
    const full = path.join(root, pf);
    if (fs.existsSync(full)) {
      try {
        const stat = fs.statSync(full);
        if (stat.size <= 200 * 1024 && totalSize + stat.size <= maxBytes) {
          const content = fs.readFileSync(full, "utf8");
          results.push({ path: pf, content });
          totalSize += stat.size;
        }
      } catch (_) {}
    }
  }

  // Then scan src/ and root for additional files
  const dirsToScan = ["src", "lib", "components", "."];
  for (const d of dirsToScan) {
    if (results.length >= maxFiles || totalSize >= maxBytes) break;
    scanDir(path.join(root, d), d === "." ? "" : d);
  }

  return results.map(r => `[${r.path}]\n${r.content}`).join("\n\n");
}

export async function callClaude({ instructions, input, retries = 3, taskId = null, step = null }) {
  const mode = getLLMMode();

  // Mock mode: return fixture data
  if (mode === "mock") {
    const mockResponse = loadMockResponse({ taskId, step, provider: "claude" });
    console.log(`[MOCK] Claude response for ${step}/${taskId} (${mockResponse.length} chars)`);
    if (taskId && step) {
      logUsage({ taskId, step, provider: "claude", model: "mock", inputTokens: estimateTokens(input), outputTokens: estimateTokens(mockResponse), durationMs: 0 });
    }
    return mockResponse;
  }

  // ALWAYS prefer Claude CLI — works in any mode, no API key needed
  console.log(`[CLAUDE] Using Claude CLI for ${step}/${taskId} (mode=${mode})`);
  try {
    return await callClaudeCLI({ instructions, input, taskId, step });
  } catch (cliErr) {
    console.warn(`[CLAUDE] CLI failed: ${cliErr.message} — trying API fallback`);
    // Fall through to API if CLI fails and API key exists
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(`Claude CLI failed and no ANTHROPIC_API_KEY for fallback: ${cliErr.message}`);
    }
    console.log(`[CLAUDE] Falling back to Anthropic API for ${step}/${taskId}`);
  }

  // API fallback (only reached if CLI failed and API key exists)
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  // API mode — call Anthropic Messages API
  const inputTokens = estimateTokens(input);
  const instructionTokens = estimateTokens(instructions);
  const startMs = Date.now();

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const messages = [{ role: "user", content: input }];
      const body = { model, max_tokens: 8192, messages };
      if (instructions && instructions.trim()) {
        body.system = instructions;
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        const text = (data.content ?? [])
          .filter(b => b.type === "text")
          .map(b => b.text)
          .join("\n")
          .trim();

        if (!text) {
          throw new Error("Claude API returned no text output");
        }

        const durationMs = Date.now() - startMs;
        const outputTokens = estimateTokens(text);
        if (taskId && step) {
          logUsage({ taskId, step, provider: "claude", model, inputTokens: inputTokens + instructionTokens, outputTokens, durationMs });
        }

        return text;
      }

      lastError = new Error(`Claude API error: ${res.status} ${JSON.stringify(data)}`);
      const errorType = classifyError(res.status, lastError);

      if (errorType === "transient" && attempt < retries) {
        const backoffMs = 1500 * attempt * getRandomJitter();
        console.log(`[Claude] Attempt ${attempt}/${retries} failed, retrying in ${backoffMs.toFixed(0)}ms...`);
        await sleep(backoffMs);
        continue;
      }

      throw lastError;
    } catch (e) {
      lastError = e;
      const isTimeout = e.message.includes("timeout") || e.message.includes("ETIMEDOUT");
      if (isTimeout && attempt < retries) {
        const backoffMs = 1500 * attempt * getRandomJitter();
        console.log(`[Claude] Attempt ${attempt}/${retries} failed (${e.message}), retrying in ${backoffMs.toFixed(0)}ms...`);
        await sleep(backoffMs);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError;
}

/**
 * Call Claude via Claude Code CLI (claude --print).
 * No API key needed — uses the user's existing Claude Code authentication.
 * Falls back to API mode if CLI is not available.
 */
/**
 * Steps that benefit from Claude having tool access (Read/Edit/Write).
 * Instead of dumping file contents into the prompt, Claude reads and edits files directly.
 * This is cheaper (less output tokens) and more reliable (targeted edits vs full-file reproduction).
 */
const TOOL_ENABLED_STEPS = new Set(["execute", "cowork-test", "diagnose", "generate-fix"]);

/**
 * Call Claude via CLI. Two modes:
 *  1. Tool mode (steps in TOOL_ENABLED_STEPS): --allowed-tools "Read,Edit,Write,Glob,Grep"
 *     Claude reads/edits files directly. Output is a text report, not file contents.
 *  2. Plain mode (all other steps): text-in, text-out, no tool access.
 *
 * Options:
 *  - useTools: boolean — override auto-detection (force tools on/off)
 *  - cwd: string — working directory for Claude (defaults to repoRoot)
 *  - maxBudgetUsd: number — cost cap per call (default $2.00 for tool mode, none for plain)
 *  - allowedTools: string — override default tool list
 */
async function callClaudeCLI({ instructions, input, taskId, step, useTools, cwd: customCwd, maxBudgetUsd, allowedTools }) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  const startMs = Date.now();

  // Build the prompt: combine instructions + input (guard against undefined)
  const fullPrompt = instructions ? `${instructions}\n\n---\n\n${input || ""}` : (input || "");
  if (!fullPrompt.trim()) {
    throw new Error("Claude CLI: empty prompt — both instructions and input are empty");
  }

  // Determine if this step should use tool access
  const enableTools = useTools !== undefined ? useTools : TOOL_ENABLED_STEPS.has(step);
  const workingDir = customCwd || repoRoot();

  // Write prompt to a temp file to avoid shell escaping issues
  const tmpDir = path.join(automationRoot(), "state", "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const promptFile = path.join(tmpDir, `cli-prompt-${taskId || "anon"}-${step || "generic"}.md`);
  fs.writeFileSync(promptFile, fullPrompt);

  if (enableTools) {
    // ═══════════════════════════════════════════════
    // TOOL MODE: Claude reads/edits files directly
    // ═══════════════════════════════════════════════
    const tools = allowedTools || "Read,Edit,Write,Glob,Grep";
    const budget = maxBudgetUsd || 2.00;
    console.log(`[CLI] Calling claude --print +tools for ${step}/${taskId} (prompt: ${fullPrompt.length} chars, tools: ${tools}, budget: $${budget})`);

    try {
      // Build command with tool access, JSON output for structured data, cost cap
      const cmd = `cat "${promptFile}" | claude --print --model "${model}" --output-format json --allowed-tools "${tools}" --permission-mode acceptEdits --max-budget-usd ${budget}`;

      const { stdout: result } = await execFileAsync("bash", ["-c", cmd], {
        cwd: workingDir,
        timeout: 1800000, // 30 min timeout
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env }
      });

      const raw = (result || "").trim();
      if (!raw) {
        throw new Error("Claude CLI returned empty output (tool mode)");
      }

      // Parse JSON output
      let jsonResult;
      try {
        jsonResult = JSON.parse(raw);
      } catch (parseErr) {
        // If JSON parse fails, treat as plain text (graceful degradation)
        console.warn(`[CLI] JSON parse failed for tool mode output, treating as plain text`);
        const durationMs = Date.now() - startMs;
        if (taskId && step) {
          logUsage({ taskId, step, provider: "claude-cli-tools", model, inputTokens: estimateTokens(fullPrompt), outputTokens: estimateTokens(raw), durationMs });
        }
        try { fs.unlinkSync(promptFile); } catch (_) {}
        return raw;
      }

      const text = jsonResult.result || "";
      const durationMs = jsonResult.duration_ms || (Date.now() - startMs);
      const costUsd = jsonResult.total_cost_usd || 0;
      const numTurns = jsonResult.num_turns || 1;
      const permDenials = jsonResult.permission_denials || [];

      // Extract token usage from modelUsage
      let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0;
      if (jsonResult.modelUsage) {
        for (const [_, info] of Object.entries(jsonResult.modelUsage)) {
          inputTokens += info.inputTokens || 0;
          outputTokens += info.outputTokens || 0;
          cacheReadTokens += info.cacheReadInputTokens || 0;
        }
      }

      if (taskId && step) {
        logUsage({ taskId, step, provider: "claude-cli-tools", model, inputTokens, outputTokens, durationMs, costUsd, numTurns, cacheReadTokens });
      }

      if (permDenials.length > 0) {
        console.warn(`[CLI] ${permDenials.length} permission denials:`, permDenials.map(d => d.tool_name).join(", "));
      }

      console.log(`[CLI] Tool mode response (${text.length} chars, ${numTurns} turns, ${durationMs}ms, $${costUsd.toFixed(4)})`);

      // Clean up temp file
      try { fs.unlinkSync(promptFile); } catch (_) {}

      return text;
    } catch (e) {
      try { fs.unlinkSync(promptFile); } catch (_) {}

      // Fallback: if tool mode fails (old CLI version, permission error), try plain mode
      if (e.message?.includes("allowed-tools") || e.message?.includes("permission-mode") || e.message?.includes("ENOENT")) {
        console.warn(`[CLI] Tool mode failed (${e.message.substring(0, 80)}), falling back to plain mode`);
        return callClaudeCLI({ instructions, input, taskId, step, useTools: false });
      }
      throw new Error(`Claude CLI (tool mode) failed: ${e.message}`);
    }
  } else {
    // ═══════════════════════════════════════════════
    // PLAIN MODE: text in, text out, no tools
    // ═══════════════════════════════════════════════
    console.log(`[CLI] Calling claude --print for ${step}/${taskId} (prompt: ${fullPrompt.length} chars)`);

    try {
      const cmd = `cat "${promptFile}" | claude --print --model "${model}" --output-format text`;

      const { stdout: result } = await execFileAsync("bash", ["-c", cmd], {
        cwd: workingDir,
        timeout: 1800000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env }
      });

      const text = (result || "").trim();

      if (!text) {
        throw new Error("Claude CLI returned empty output");
      }

      const durationMs = Date.now() - startMs;
      const inputTokens = estimateTokens(fullPrompt);
      const outputTokens = estimateTokens(text);
      if (taskId && step) {
        logUsage({ taskId, step, provider: "claude-cli", model, inputTokens, outputTokens, durationMs });
      }

      console.log(`[CLI] Response received (${text.length} chars, ${durationMs}ms)`);

      try { fs.unlinkSync(promptFile); } catch (_) {}
      return text;
    } catch (e) {
      try { fs.unlinkSync(promptFile); } catch (_) {}

      if (e.code === "ENOENT") {
        throw new Error(
          "Claude CLI (claude) not found. Install Claude Code or set ANTHROPIC_API_KEY and use LLM_MODE=api"
        );
      }
      throw new Error(`Claude CLI failed: ${e.message}`);
    }
  }
}

/**
 * Call OpenAI Codex via Codex CLI (codex exec).
 * No OPENAI_API_KEY needed — uses the user's existing Codex CLI authentication.
 * Syntax: codex exec "prompt" → streams progress to stderr, final result to stdout.
 */
async function callCodexCLI({ instructions, input, taskId, step }) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync2 = promisify(execFile);

  const startMs = Date.now();
  const fullPrompt = instructions ? `${instructions}\n\n---\n\n${input}` : input;

  if (!fullPrompt.trim()) {
    throw new Error("Codex CLI: empty prompt — both instructions and input are empty");
  }

  // Write prompt to temp file to avoid CLI argument length issues (prompts can be 80KB+)
  const tmpDir = path.join(automationRoot(), "state", "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const promptFile = path.join(tmpDir, `cli-prompt-${taskId || "anon"}-${step || "generic"}-codex.md`);
  fs.writeFileSync(promptFile, fullPrompt);

  console.log(`[CLI] Calling codex exec for ${step}/${taskId} (prompt: ${fullPrompt.length} chars, file: ${promptFile})`);

  try {
    // Async execution with 5-min timeout (shorter than Claude's 15min).
    // If codex hangs on interactive prompts, timeout triggers fallback to Claude CLI.
    const cmd = `cat "${promptFile}" | codex exec --full-auto -`;

    const { stdout: result } = await execFileAsync2("bash", ["-c", cmd], {
      cwd: repoRoot(),
      timeout: 300000, // 5 min timeout — fallback to Claude if codex hangs
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env }
    });

    const text = (result || "").trim();

    if (!text) {
      throw new Error("Codex CLI returned empty output");
    }

    const durationMs = Date.now() - startMs;
    const inputTokens = estimateTokens(fullPrompt);
    const outputTokens = estimateTokens(text);
    if (taskId && step) {
      logUsage({ taskId, step, provider: "codex-cli", model: "codex", inputTokens, outputTokens, durationMs });
    }

    console.log(`[CLI] codex response received (${text.length} chars, ${durationMs}ms)`);

    // Clean up temp file
    try { fs.unlinkSync(promptFile); } catch (_) {}

    return text;
  } catch (e) {
    // Clean up temp file on error
    try { fs.unlinkSync(promptFile); } catch (_) {}

    // Timeout fallback: if codex was killed (hung on interactive prompt), fall back to Claude CLI
    if (e.killed || e.signal === 'SIGTERM') {
      console.warn(`[CLI] Codex timed out after 5min for ${step}/${taskId}, falling back to Claude CLI`);
      return callClaudeCLI({ instructions, input, taskId, step });
    }

    if (e.code === "ENOENT") {
      throw new Error(
        "Codex CLI (codex) not found. Install it (npm i -g @openai/codex) or set OPENAI_API_KEY and use LLM_MODE=api"
      );
    }
    throw new Error(`Codex CLI failed: ${e.message}`);
  }
}

/**
 * Check if a CLI tool is available on the system.
 */
function isCLIAvailable(command) {
  try {
    const { execSync } = require("node:child_process");
    execSync(`which ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function callLLMApp({ instructions, input, taskId, step, provider, model }) {
  const queueDir = path.join(automationRoot(), "state", "prompts-queue");
  fs.mkdirSync(queueDir, { recursive: true });

  const timestamp = Date.now();
  const baseId = taskId && step ? `${timestamp}-${taskId}-${step}` : `${timestamp}-app-prompt`;

  const promptFile = path.join(queueDir, `${baseId}.prompt.md`);
  const metaFile = path.join(queueDir, `${baseId}.meta.json`);
  const responseFile = path.join(queueDir, `${baseId}.response.md`);

  const promptContent = instructions ? `${instructions}\n\n---\n\n${input}` : input;
  fs.writeFileSync(promptFile, promptContent);

  const meta = {
    id: baseId,
    taskId: taskId || null,
    step: step || null,
    provider,
    model,
    status: "pending",
    createdAt: new Date().toISOString(),
    promptFile: path.basename(promptFile),
    responseFile: path.basename(responseFile)
  };
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));

  console.log(`\n[APP MODE] Prompt queued: ${baseId}`);
  console.log(`  Prompt: ${promptFile}`);
  console.log(`  Waiting for response at: ${responseFile}`);

  // Poll for response
  const pollIntervalMs = parseInt(process.env.LLM_POLL_INTERVAL || "2000", 10);
  const timeoutMs = parseInt(process.env.LLM_APP_TIMEOUT || "3600000", 10); // 1 hour default
  const startMs = Date.now();

  while (Date.now() - startMs < timeoutMs) {
    if (fs.existsSync(responseFile)) {
      const response = fs.readFileSync(responseFile, "utf8");

      // Update meta to mark as complete
      meta.status = "completed";
      meta.completedAt = new Date().toISOString();
      fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));

      console.log(`[APP MODE] Response received for: ${baseId}`);

      // Log usage for tracking
      const responseTokens = estimateTokens(response);
      const inputTokens = estimateTokens(promptContent);
      const durationMs = Date.now() - startMs;
      if (taskId && step) {
        logUsage({ taskId, step, provider, model, inputTokens, outputTokens: responseTokens, durationMs });
      }

      return response;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`App mode timeout waiting for response: ${baseId} (${timeoutMs}ms exceeded)`);
}
