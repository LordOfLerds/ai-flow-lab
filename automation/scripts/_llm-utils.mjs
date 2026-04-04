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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callOpenAI({ instructions, input, retries = 3 }) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = requireEnv("OPENAI_MODEL");

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
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

    const data = await res.json();

    if (res.ok) {
      const text = extractOpenAIText(data);
      if (!text) {
        throw new Error("OpenAI API returned no text output");
      }
      return text;
    }

    lastError = new Error(`OpenAI API error: ${res.status} ${JSON.stringify(data)}`);

    if ((res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503) && attempt < retries) {
      await sleep(1500 * attempt);
      continue;
    }

    throw lastError;
  }

  throw lastError;
}

export async function callGemini({ prompt, retries = 4 }) {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const model = requireEnv("GEMINI_MODEL");

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
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

      return text;
    }

    lastError = new Error(`Gemini API error: ${res.status} ${JSON.stringify(data)}`);

    if ((res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503) && attempt < retries) {
      await sleep(2000 * attempt);
      continue;
    }

    throw lastError;
  }

  throw lastError;
}
