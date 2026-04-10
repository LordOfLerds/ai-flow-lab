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
  return process.env.LLM_MODE || "app";
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
    return fs.readFileSync(stepDefaultPath, "utf8");
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

export function logUsage({ taskId, step, provider, model, inputTokens, outputTokens, durationMs }) {
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

  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = requireEnv("OPENAI_MODEL");

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

  const apiKey = requireEnv("GEMINI_API_KEY");
  const model = requireEnv("GEMINI_MODEL");

  // If app mode, write prompt to queue and wait for response
  if (mode === "app") {
    return await callLLMApp({ instructions: "", input: prompt, taskId, step, provider: "gemini", model });
  }

  // API mode
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

      if (errorType === "transient" && attempt < retries) {
        const backoffMs = 2000 * attempt * getRandomJitter();
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
        const backoffMs = 2000 * attempt * getRandomJitter();
        console.log(`Attempt ${attempt}/${retries} failed (${e.message}), retrying in ${backoffMs.toFixed(0)}ms...`);
        await sleep(backoffMs);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
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
