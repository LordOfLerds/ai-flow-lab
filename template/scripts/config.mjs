import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

function automationRoot() {
  return process.cwd();
}

function repoRoot() {
  return path.resolve(process.cwd(), "..");
}

function loadProjectConfig() {
  // Try to load from project.config.yaml (not implemented yet, but prepared)
  // For now, use environment variables and defaults

  const projectName = process.env.PROJECT_NAME || "ai-flow-lab";
  const llmMode = process.env.LLM_MODE || "app";

  return {
    projectName,
    llmMode,
    pollIntervalMs: parseInt(process.env.LLM_POLL_INTERVAL || "2000", 10),
    maxRetries: parseInt(process.env.LLM_MAX_RETRIES || "4", 10),
    truthDocs: [
      "docs/DOMAIN_MODEL.md",
      "docs/INVARIANTS.md",
      "docs/ARCHITECTURE.md",
      "AGENTS.md"
    ]
  };
}

export const PROJECT_CONFIG = loadProjectConfig();

export function getTruthDocContent() {
  const root = repoRoot();
  const docs = {};

  for (const docPath of PROJECT_CONFIG.truthDocs) {
    const absPath = path.join(root, docPath);
    if (fs.existsSync(absPath)) {
      try {
        docs[docPath] = fs.readFileSync(absPath, "utf8");
      } catch (e) {
        console.warn(`Failed to read truth doc: ${docPath}`);
        docs[docPath] = "";
      }
    }
  }

  return docs;
}

export function formatTruthDocs() {
  const docs = getTruthDocContent();
  const parts = [];

  for (const [docPath, content] of Object.entries(docs)) {
    if (content) {
      parts.push(`[${docPath}]\n${content}`);
    }
  }

  return parts.join("\n\n");
}
