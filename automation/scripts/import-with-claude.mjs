#!/usr/bin/env node
/**
 * import-with-claude.mjs — Auto-import a project using Claude CLI with tools.
 *
 * Uses Claude CLI with Read/Glob/Grep tools to analyze a codebase and generate
 * DOMAIN_MODEL.md, ARCHITECTURE.md, INVARIANTS.md, project.config.yaml.
 *
 * Falls back to analyze-codebase.mjs + prompt queue if Claude CLI is unavailable.
 *
 * Usage:
 *   node import-with-claude.mjs <project-path> [--name "Project Name"]
 */

import fs from "node:fs";
import path from "node:path";
import { execSync, execFile } from "node:child_process";

const BUDGET_USD = 3.0;
const TIMEOUT_MS = 300000; // 5 min

// ─── Claude CLI Detection ───

function hasClaudeCLI() {
  try {
    execSync("which claude", { stdio: "ignore", timeout: 5000 });
    // Check auth
    try {
      const out = execSync("claude auth status --json", { encoding: "utf8", timeout: 10000 });
      if (out.includes('"loggedIn":true') || out.includes('"loggedIn": true')) return true;
    } catch (_) {}
    // Check API key
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()) return true;
    return false;
  } catch (_) {
    return false;
  }
}

// ─── Prompt ───

function buildImportPrompt(projectPath) {
  return `You are a senior software architect. Your job is to analyze a codebase and produce structured documentation.

The project is located at: ${projectPath}

## Instructions

Use your Read, Glob, and Grep tools to thoroughly explore the codebase:

1. **Glob** for source files to understand the project structure (e.g., "**/*.{ts,js,py,go,rs,java}", "**/*.md")
2. **Read** key files: README, package.json/Cargo.toml/go.mod/pyproject.toml, main entry points, config files
3. **Grep** for patterns: API routes, database models/schemas, test files, environment variables
4. **Read** 3-5 representative source files to understand coding style and architecture

Based on your analysis, output EXACTLY these sections with these exact headers:

## OUTPUT: DOMAIN_MODEL
Document the core domain entities, their relationships, and business rules you found in the code.
Use a clear structure: Entities, Relationships, Business Rules.

## OUTPUT: ARCHITECTURE
Document the system architecture: layers, components, data flow, tech stack, key dependencies.
Include a high-level diagram using ASCII art or bullet points.

## OUTPUT: INVARIANTS
Document rules that must never be broken: constraints, validations, security rules, data integrity rules.
These are things that any code change must preserve.

## OUTPUT: AGENTS
Recommend which AI agent should handle which type of work:
- Claude: (what types of tasks)
- OpenAI/ChatGPT: (what types of tasks)
- Gemini: (what types of tasks)

## OUTPUT: FIRST_GOAL
GOAL_TITLE: <a good first goal for this project>
GOAL_DESCRIPTION: <what this goal achieves>
- <task title> | <lane-type: feature-lane/bug-lane/docs-lane> | <description>
- <task title> | <lane-type> | <description>
- <task title> | <lane-type> | <description>

## OUTPUT: PROJECT_CONFIG
name: <project name>
description: <1-line description>
tech_stack: <comma-separated list>
primary_language: <main language>

## OUTPUT: PROJECT_SUMMARY
A 2-3 sentence summary of what this project is and does.`;
}

// ─── Response Parser ───

function parseImportResponse(response) {
  const sections = {};
  const keys = [
    "DOMAIN_MODEL", "ARCHITECTURE", "INVARIANTS", "AGENTS",
    "FIRST_GOAL", "PROJECT_CONFIG", "PROJECT_SUMMARY"
  ];

  for (const key of keys) {
    const header = `## OUTPUT: ${key}`;
    const idx = response.indexOf(header);
    if (idx === -1) continue;

    const contentStart = idx + header.length;
    let contentEnd = response.length;
    for (const otherKey of keys) {
      if (otherKey === key) continue;
      const otherIdx = response.indexOf(`## OUTPUT: ${otherKey}`, contentStart);
      if (otherIdx !== -1 && otherIdx < contentEnd) contentEnd = otherIdx;
    }

    sections[key] = response.substring(contentStart, contentEnd).trim();
  }

  return sections;
}

function parseGoalSection(content) {
  const lines = content.split("\n");
  let title = "", description = "";
  const tasks = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("GOAL_TITLE:")) title = trimmed.replace("GOAL_TITLE:", "").trim();
    else if (trimmed.startsWith("GOAL_DESCRIPTION:")) description = trimmed.replace("GOAL_DESCRIPTION:", "").trim();
    else if (trimmed.startsWith("- ") && trimmed.includes("|")) {
      const parts = trimmed.substring(2).split("|").map(p => p.trim());
      if (parts.length >= 3) {
        tasks.push({ title: parts[0], lane: parts[1], description: parts[2] });
      }
    }
  }

  return { title, description, tasks };
}

function parseProjectConfig(content) {
  const config = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^(\w+):\s*(.+)/);
    if (match) config[match[1]] = match[2].trim();
  }
  return config;
}

// ─── Write Results ───

function writeResults(projectPath, sections) {
  const results = { written: [], goal: null, summary: "" };

  // Write docs
  const docMap = {
    DOMAIN_MODEL: "docs/DOMAIN_MODEL.md",
    ARCHITECTURE: "docs/ARCHITECTURE.md",
    INVARIANTS: "docs/INVARIANTS.md",
    AGENTS: "AGENTS.md"
  };

  for (const [key, relPath] of Object.entries(docMap)) {
    if (!sections[key]) continue;
    const fullPath = path.join(projectPath, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    let content = sections[key];
    if (!content.startsWith("# ")) {
      content = `# ${key.replace(/_/g, " ")}\n\n${content}`;
    }

    fs.writeFileSync(fullPath, content);
    results.written.push(relPath);
    console.log(`  ✓ ${relPath}`);
  }

  // Write project.config.yaml
  if (sections.PROJECT_CONFIG) {
    const config = parseProjectConfig(sections.PROJECT_CONFIG);
    const configPath = path.join(projectPath, "ai", "project.config.yaml");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `# AI Flow Lab — Project Configuration
name: ${config.name || path.basename(projectPath)}
description: "${config.description || ""}"

truth_sources:
  - CLAUDE.md
  - docs/DOMAIN_MODEL.md
  - docs/INVARIANTS.md
  - docs/ARCHITECTURE.md

executor_routing:
  default:
    architect: openai
    critique: gemini
    synthesize: openai
    execute: claude
    merge: git
    propose_followups: openai
    pr_draft: openai

cascade_limits:
  max_depth: 3
  max_followups_per_task: 5
  max_total_tasks: 20
  dedup_threshold: 0.75
`);
    results.written.push("ai/project.config.yaml");
    console.log("  ✓ ai/project.config.yaml");
  }

  // Write goal
  if (sections.FIRST_GOAL) {
    const goalData = parseGoalSection(sections.FIRST_GOAL);
    if (goalData.title) {
      const stateDir = path.join(projectPath, "automation", "state");
      fs.mkdirSync(path.join(stateDir, "goals"), { recursive: true });
      fs.mkdirSync(path.join(stateDir, "tasks"), { recursive: true });

      const goalId = "G-0001";
      const goal = {
        goal_id: goalId,
        title: goalData.title,
        description: goalData.description,
        priority: "high",
        state: "PLANNED",
        created_at: new Date().toISOString(),
        tasks: goalData.tasks
      };
      fs.writeFileSync(
        path.join(stateDir, "goals", `${goalId}.json`),
        JSON.stringify(goal, null, 2)
      );
      results.goal = goal;
      results.written.push(`automation/state/goals/${goalId}.json`);
      console.log(`  ✓ Goal ${goalId}: ${goalData.title} (${goalData.tasks.length} tasks)`);
    }
  }

  // Save summary
  if (sections.PROJECT_SUMMARY) {
    results.summary = sections.PROJECT_SUMMARY;
  }

  // Save raw response
  const rawPath = path.join(projectPath, "ai", "reports", "import-response.md");
  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  fs.writeFileSync(rawPath, Object.entries(sections).map(([k, v]) => `## ${k}\n\n${v}`).join("\n\n---\n\n"));
  results.written.push("ai/reports/import-response.md");

  return results;
}

// ─── Ensure Automation Scaffold ───

function ensureAutomationScaffold(projectPath) {
  const dirs = [
    "automation/state/tasks", "automation/state/goals", "automation/state/proposals",
    "automation/state/prompts-queue", "automation/state/decision_proposals",
    "ai/specs", "ai/reviews", "ai/briefs", "ai/results", "ai/followups",
    "ai/current-state", "ai/reports", "docs", "goals"
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
  }

  // Ensure git
  if (!fs.existsSync(path.join(projectPath, ".git"))) {
    try {
      execSync("git init", { cwd: projectPath, stdio: "pipe" });
      console.log("  ✓ git init");
    } catch (_) {}
  }
}

// ─── Main: Claude CLI Import ───

function execFileAsync(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const proc = execFile(cmd, args, opts, (error, stdout, stderr) => {
      if (error) { error.stdout = stdout; error.stderr = stderr; reject(error); }
      else resolve({ stdout, stderr });
    });
    if (opts.input) {
      proc.stdin.write(opts.input);
      proc.stdin.end();
    }
  });
}

export async function importWithClaude(projectPath, options = {}) {
  const absPath = path.resolve(projectPath);
  const projectName = options.name || path.basename(absPath);

  console.log(`\n📥 Importing project: ${projectName}`);
  console.log(`   Path: ${absPath}\n`);

  // Ensure scaffold
  console.log("Creating automation scaffold...");
  ensureAutomationScaffold(absPath);

  const useCLI = hasClaudeCLI();
  console.log(`Import method: ${useCLI ? "Claude CLI (with tools)" : "Fallback (analyze + prompt queue)"}\n`);

  if (useCLI) {
    // Claude CLI with tools
    const prompt = buildImportPrompt(absPath);
    console.log("Running Claude CLI analysis (this may take 1-3 minutes)...");

    try {
      const result = await execFileAsync("claude", [
        "--print",
        "--output-format", "text",
        "--allowed-tools", "Read,Glob,Grep",
        "--permission-mode", "acceptEdits",
        "--max-budget-usd", String(BUDGET_USD)
      ], {
        input: prompt,
        cwd: absPath,
        timeout: TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        encoding: "utf8"
      });

      const response = result.stdout;
      if (!response || response.length < 200) {
        throw new Error("Claude CLI returned insufficient output");
      }

      console.log(`\n✅ Analysis complete (${(response.length / 1024).toFixed(1)}KB output)\n`);
      console.log("Writing documentation...");

      const sections = parseImportResponse(response);
      const results = writeResults(absPath, sections);

      return {
        ok: true,
        method: "claude-cli",
        projectName,
        projectPath: absPath,
        ...results
      };

    } catch (e) {
      console.error(`\n⚠️  Claude CLI failed: ${e.message?.substring(0, 100)}`);
      console.log("Falling back to analyze + prompt queue...\n");
      return importFallback(absPath, projectName);
    }

  } else {
    return importFallback(absPath, projectName);
  }
}

// ─── Fallback: analyze-codebase + prompt queue ───

async function importFallback(absPath, projectName) {
  // Use existing init-project.mjs import logic
  console.log("Running codebase analysis...");
  const analyzeScript = path.join(path.dirname(new URL(import.meta.url).pathname), "analyze-codebase.mjs");

  let analysis;
  try {
    const output = execSync(`node "${analyzeScript}" "${absPath}"`, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000
    });
    analysis = JSON.parse(output);
  } catch (e) {
    return {
      ok: false,
      method: "fallback",
      error: `Codebase analysis failed: ${e.message?.substring(0, 200)}`
    };
  }

  console.log(`  ✓ ${analysis.fileCounts?.total || "?"} files found`);
  console.log(`  ✓ Technologies: ${(analysis.detectedTechnologies || []).join(", ")}`);

  // Save analysis report
  const reportPath = path.join(absPath, "ai", "reports", "codebase-analysis.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

  // Write prompt to queue for manual handling
  const queueDir = path.join(absPath, "automation", "state", "prompts-queue");
  fs.mkdirSync(queueDir, { recursive: true });

  const id = `import-${Date.now()}`;
  const prompt = buildImportPrompt(absPath);

  fs.writeFileSync(path.join(queueDir, `${id}.prompt.md`), prompt);
  fs.writeFileSync(path.join(queueDir, `${id}.meta.json`), JSON.stringify({
    id,
    taskId: null,
    step: "project-import",
    provider: "openai",
    status: "pending",
    createdAt: new Date().toISOString(),
    promptFile: `${id}.prompt.md`,
    responseFile: `${id}.response.md`
  }, null, 2));

  // Also save convenient prompt file
  const readyFile = path.join(absPath, "CHATGPT_IMPORT_PROMPT.md");
  fs.writeFileSync(readyFile, prompt);

  return {
    ok: true,
    method: "prompt-queue",
    projectName,
    projectPath: absPath,
    written: ["ai/reports/codebase-analysis.json", "CHATGPT_IMPORT_PROMPT.md"],
    promptId: id,
    message: "Prompt written to queue. Paste into ChatGPT and submit response in Dashboard."
  };
}

// ─── CLI ───

if (process.argv[1] && process.argv[1].endsWith("import-with-claude.mjs")) {
  const args = process.argv.slice(2);
  let projectPath = ".";
  let name = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) {
      name = args[++i];
    } else if (!args[i].startsWith("-")) {
      projectPath = args[i];
    }
  }

  const result = await importWithClaude(projectPath, { name });
  console.log("\n" + JSON.stringify(result, null, 2));
}
