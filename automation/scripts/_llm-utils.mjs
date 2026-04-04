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

export async function callOpenAI({ instructions, input }) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = requireEnv("OPENAI_MODEL");

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

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} ${JSON.stringify(data)}`);
  }

  const text = extractOpenAIText(data);
  if (!text) {
    throw new Error("OpenAI API returned no text output");
  }

  return text;
}

export async function callGemini({ prompt }) {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const model = requireEnv("GEMINI_MODEL");

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

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${JSON.stringify(data)}`);
  }

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
