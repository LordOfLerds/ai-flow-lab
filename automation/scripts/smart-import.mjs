#!/usr/bin/env node
/**
 * smart-import.mjs — Claude+ChatGPT Tandem Import Assistant
 *
 * Flow:
 *   1. Run analyze-codebase.mjs → get JSON report
 *   2. Claude CLI analyzes code → generates draft docs + gap questions
 *   3. Generate targeted ChatGPT prompt with Claude's drafts + gaps
 *   4. ChatGPT response parsed via parseBootstrapResponse()
 *
 * Usage:
 *   node smart-import.mjs analyze  <project-path>    — Step 1+2: Claude analysis
 *   node smart-import.mjs prompt   <project-path>    — Step 3: Generate ChatGPT prompt
 *   node smart-import.mjs apply    <project-path>    — Step 4: Apply ChatGPT response
 *   node smart-import.mjs extract-goals <project-path> — Extract goals from chat
 *
 * The dashboard calls these steps sequentially via API endpoints.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { automationRoot } from "./_llm-utils.mjs";

const execFileAsync = promisify(execFile);

const autoRoot = automationRoot();
const templateDir = path.resolve(autoRoot, "..", "template");
const scriptsDir = path.join(autoRoot, "scripts");

// ─── Utilities ───

function loadPromptTemplate(name) {
  const paths = [
    path.join(templateDir, "prompts", name),
    path.join(autoRoot, "prompts", name),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  throw new Error(`Prompt template not found: ${name}`);
}

function fillTemplate(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value || "");
  }
  return result;
}

// ─── Step 1+2: Claude Analysis ───

async function analyzeWithClaude(projectPath) {
  const absPath = path.resolve(projectPath);
  const projectName = path.basename(absPath);

  console.log(`\n🔍 Smart Import — Step 1: Analyzing codebase...`);

  // Run analyze-codebase.mjs
  let analysis;
  try {
    const output = execSync(`node "${scriptsDir}/analyze-codebase.mjs" "${absPath}"`, {
      encoding: "utf8", maxBuffer: 10 * 1024 * 1024
    });
    analysis = JSON.parse(output);
  } catch (e) {
    throw new Error(`Codebase analysis failed: ${e.message}`);
  }

  console.log(`  ✓ ${analysis.fileCounts.total} files, ${analysis.detectedTechnologies.join(", ")}`);

  // Build Claude prompt for draft docs + gap questions
  const claudePrompt = buildClaudeAnalysisPrompt(projectName, analysis);

  console.log(`\n🤖 Smart Import — Step 2: Claude analyzing code (this may take 1-3 min)...`);

  // Run Claude CLI
  const promptFile = path.join(autoRoot, "state", "smart-import-claude-prompt.md");
  fs.mkdirSync(path.dirname(promptFile), { recursive: true });
  fs.writeFileSync(promptFile, claudePrompt);

  try {
    const cmd = `cat "${promptFile}" | claude --print --model "claude-sonnet-4-20250514" --tools "" 2>&1`;
    const { stdout } = await execFileAsync("bash", ["-c", cmd], {
      cwd: absPath,
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env }
    });

    const claudeOutput = (stdout || "").trim();
    if (!claudeOutput || claudeOutput.length < 100) {
      throw new Error("Claude returned no useful output. Check API key and model availability.");
    }
    console.log(`  ✓ Claude analysis complete (${claudeOutput.length} chars)`);

    // Save results
    const resultFile = path.join(autoRoot, "state", "smart-import-claude-result.json");
    const result = {
      projectName,
      projectPath: absPath,
      analysis,
      claudeDrafts: claudeOutput,
      analyzedAt: new Date().toISOString()
    };
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));

    console.log(`  ✓ Saved to state/smart-import-claude-result.json`);
    return result;

  } catch (err) {
    throw new Error(`Claude analysis failed: ${err.message}`);
  }
}

function buildClaudeAnalysisPrompt(projectName, analysis) {
  const parts = [];

  parts.push(`# Smart Import — Code Analysis for "${projectName}"`);
  parts.push(`\nYou are analyzing this codebase to produce draft documentation. You have Read, Glob, and Grep tools — USE THEM to inspect actual source files, not just the summaries below.`);

  parts.push(`\n## Codebase Summary`);
  parts.push(`- ${analysis.fileCounts.total} files`);
  parts.push(`- Technologies: ${analysis.detectedTechnologies.join(", ")}`);

  parts.push(`\n## Directory Structure\n\`\`\`\n${analysis.directoryTree.substring(0, 2000)}\n\`\`\``);

  if (Object.keys(analysis.existingDocs).length > 0) {
    parts.push(`\n## Existing Documentation`);
    for (const [name, content] of Object.entries(analysis.existingDocs)) {
      parts.push(`### ${name}\n${content.substring(0, 1000)}`);
    }
  }

  if (analysis.sourceSamples.length > 0) {
    parts.push(`\n## Source Samples`);
    for (const s of analysis.sourceSamples.slice(0, 3)) {
      parts.push(`### ${s.path} (${s.totalLines} lines)\n\`\`\`\n${s.preview.substring(0, 600)}\n\`\`\``);
    }
  }

  parts.push(`\n## Your Task\n
Use your tools to read key source files (models, routes, config, main entry points). Then output:

### SECTION: DRAFT_DOMAIN_MODEL
A draft domain model based on what you find in the code (entities, types, relationships).

### SECTION: DRAFT_ARCHITECTURE
A draft architecture doc based on the actual code structure.

### SECTION: DRAFT_INVARIANTS
Any invariants or constraints you can infer from validations, guards, types.

### SECTION: GAP_QUESTIONS
A numbered list of 5-15 specific questions that you CANNOT answer from code alone. These should be about:
- Business rules and domain logic not visible in code
- User stories and workflows
- Deployment environment and infrastructure
- Naming conventions and terminology
- Compliance, security, or legal requirements
- Performance requirements and SLAs
- Third-party service configurations
- Target audience and user personas

Format each question as:
1. **<short topic>**: <specific question>

Focus on questions whose answers would most improve the documentation quality.

### SECTION: CODE_SUMMARY
A 3-5 sentence summary of what this project does, based on your code analysis. This will be shown to the user to confirm accuracy.`);

  return parts.join("\n");
}

// ─── Step 3: Generate ChatGPT Prompt ───

function generateChatGPTPrompt(projectPath) {
  const resultFile = path.join(autoRoot, "state", "smart-import-claude-result.json");
  if (!fs.existsSync(resultFile)) {
    throw new Error("No Claude analysis found. Run 'analyze' step first.");
  }

  const result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
  const claudeOutput = result.claudeDrafts;

  // Parse Claude's sections — supports both ## SECTION: and ### SECTION:
  const sections = {};
  const sectionKeys = ["DRAFT_DOMAIN_MODEL", "DRAFT_ARCHITECTURE", "DRAFT_INVARIANTS", "GAP_QUESTIONS", "CODE_SUMMARY"];
  for (const key of sectionKeys) {
    // Match ##, ###, or #### followed by SECTION:
    const re = new RegExp(`#{2,4}\\s*SECTION:\\s*${key}`, "i");
    const m = claudeOutput.match(re);
    if (!m) continue;
    const idx = claudeOutput.indexOf(m[0]);
    const start = idx + m[0].length;
    let end = claudeOutput.length;
    for (const other of sectionKeys) {
      if (other === key) continue;
      const ore = new RegExp(`#{2,4}\\s*SECTION:\\s*${other}`, "i");
      const om = claudeOutput.substring(start).match(ore);
      if (om) {
        const oi = start + claudeOutput.substring(start).indexOf(om[0]);
        if (oi < end) end = oi;
      }
    }
    sections[key] = claudeOutput.substring(start, end).trim();
  }

  // Build analysis summary
  const analysis = result.analysis;
  const codeSummary = [
    `**${result.projectName}** — ${analysis.fileCounts.total} files`,
    `Technologies: ${analysis.detectedTechnologies.join(", ")}`,
    sections.CODE_SUMMARY || ""
  ].join("\n");

  // Build draft docs block
  const draftDocs = [
    sections.DRAFT_DOMAIN_MODEL ? `### Domain Model (draft)\n${sections.DRAFT_DOMAIN_MODEL}` : "",
    sections.DRAFT_ARCHITECTURE ? `### Architecture (draft)\n${sections.DRAFT_ARCHITECTURE}` : "",
    sections.DRAFT_INVARIANTS ? `### Invariants (draft)\n${sections.DRAFT_INVARIANTS}` : "",
  ].filter(Boolean).join("\n\n---\n\n");

  // Generate ChatGPT prompt from template
  const template = loadPromptTemplate("smart-import-chatgpt.prompt.md");
  const prompt = fillTemplate(template, {
    PROJECT_NAME: result.projectName,
    CODE_ANALYSIS_SUMMARY: codeSummary,
    CLAUDE_DRAFT_DOCS: draftDocs || "(Claude could not generate drafts — please create from scratch)",
    GAP_QUESTIONS: sections.GAP_QUESTIONS || "(No specific questions — please provide general domain context)"
  });

  // Save prompt
  const absPath = path.resolve(projectPath || result.projectPath);
  const promptFile = path.join(absPath, "CHATGPT_SMART_IMPORT_PROMPT.md");
  fs.writeFileSync(promptFile, prompt);

  // Also save to prompts queue for dashboard
  const queueDir = path.join(autoRoot, "state", "prompts-queue");
  fs.mkdirSync(queueDir, { recursive: true });
  const id = `smart-import-${Date.now()}`;
  const queuePromptFile = path.join(queueDir, `${id}.prompt.md`);
  const metaFile = path.join(queueDir, `${id}.meta.json`);
  const responseFile = path.join(queueDir, `${id}.response.md`);

  fs.writeFileSync(queuePromptFile, prompt);
  fs.writeFileSync(metaFile, JSON.stringify({
    id, taskId: null, step: "smart-import", provider: "openai",
    status: "pending", createdAt: new Date().toISOString(),
    promptFile: path.basename(queuePromptFile),
    responseFile: path.basename(responseFile),
    projectPath: absPath,
    projectName: result.projectName
  }, null, 2));

  console.log(`\n📋 ChatGPT prompt saved to: CHATGPT_SMART_IMPORT_PROMPT.md`);
  console.log(`   Also queued in dashboard as: ${id}`);

  return {
    promptFile: promptFile,
    responseFile: responseFile,
    queueId: id,
    prompt,
    codeSummary: sections.CODE_SUMMARY || "",
    gapQuestions: sections.GAP_QUESTIONS || "",
    draftDocs
  };
}

// ─── Step 4: Apply ChatGPT Response ───

function applyResponse(projectPath, response) {
  const absPath = path.resolve(projectPath);
  const projectName = path.basename(absPath);

  // Reuse the same parser from init-project.mjs
  const sections = ["DOMAIN_MODEL", "ARCHITECTURE", "INVARIANTS", "AGENTS", "FIRST_GOAL", "OPEN_QUESTIONS"];
  const fileMap = {
    DOMAIN_MODEL: "docs/DOMAIN_MODEL.md",
    ARCHITECTURE: "docs/ARCHITECTURE.md",
    INVARIANTS: "docs/INVARIANTS.md",
    AGENTS: "AGENTS.md",
    OPEN_QUESTIONS: "ai/current-state/open-questions.md"
  };

  const written = [];
  for (const key of sections) {
    const header = `## OUTPUT: ${key}`;
    const idx = response.indexOf(header);
    if (idx === -1) continue;
    const start = idx + header.length;
    let end = response.length;
    for (const other of sections) {
      if (other === key) continue;
      const oi = response.indexOf(`## OUTPUT: ${other}`, start);
      if (oi !== -1 && oi < end) end = oi;
    }
    const content = response.substring(start, end).trim();
    if (fileMap[key] && content) {
      const fp = path.join(absPath, fileMap[key]);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, content);
      written.push(fileMap[key]);
      console.log(`  ✓ ${fileMap[key]}`);
    }
  }

  // Handle FIRST_GOAL
  const goalHeader = "## OUTPUT: FIRST_GOAL";
  const goalIdx = response.indexOf(goalHeader);
  if (goalIdx !== -1) {
    const goalStart = goalIdx + goalHeader.length;
    let goalEnd = response.length;
    for (const other of sections) {
      if (other === "FIRST_GOAL") continue;
      const oi = response.indexOf(`## OUTPUT: ${other}`, goalStart);
      if (oi !== -1 && oi < goalEnd) goalEnd = oi;
    }
    const goalContent = response.substring(goalStart, goalEnd).trim();
    if (goalContent) {
      const goalData = parseGoalFromText(goalContent);
      if (goalData.title) {
        writeGoalToState(absPath, goalData);
        written.push("goal created");
      }
    }
  }

  // Save raw response
  const rawPath = path.join(absPath, "ai", "reports", "smart-import-response.md");
  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  fs.writeFileSync(rawPath, response);
  written.push("ai/reports/smart-import-response.md");

  console.log(`\n✅ Smart import complete! ${written.length} items written.`);
  return { written };
}

// ─── Goal Extraction from Chat ───

function extractGoalsFromChat(projectPath, chatText) {
  const absPath = path.resolve(projectPath);

  // Parse goals from structured chat output
  const goals = [];
  const goalRegex = /## GOAL:\s*(.+)/g;
  let match;
  while ((match = goalRegex.exec(chatText)) !== null) {
    const title = match[1].trim();
    const startIdx = match.index + match[0].length;
    let endIdx = chatText.indexOf("## GOAL:", startIdx);
    if (endIdx === -1) endIdx = chatText.length;
    const block = chatText.substring(startIdx, endIdx).trim();

    // Parse description and tasks
    const descMatch = block.match(/^([\s\S]*?)(?:###\s*TASKS:|$)/);
    const description = descMatch ? descMatch[1].trim() : "";
    const tasks = [];
    const taskRegex = /^-\s+(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)/gm;
    let taskMatch;
    while ((taskMatch = taskRegex.exec(block)) !== null) {
      tasks.push({ title: taskMatch[1].trim(), lane: taskMatch[2].trim(), description: taskMatch[3].trim() });
    }

    goals.push({ title, description, tasks });
  }

  if (goals.length === 0) {
    console.log("No goals found in the expected format. Trying fallback parsing...");
    // Fallback: treat the whole text as one goal extraction request
    const goalData = parseGoalFromText(chatText);
    if (goalData.title) goals.push(goalData);
  }

  // Write goals
  const stateDir = path.join(absPath, "automation", "state");
  fs.mkdirSync(path.join(stateDir, "goals"), { recursive: true });

  // Find next goal ID
  const goalsDir = path.join(stateDir, "goals");
  const existingIds = fs.readdirSync(goalsDir)
    .filter(f => f.match(/^G-\d+\.json$/))
    .map(f => parseInt(f.match(/^G-(\d+)/)[1]))
    .sort((a, b) => b - a);
  let nextNum = (existingIds[0] || 0) + 1;

  const created = [];
  for (const g of goals) {
    const goalId = `G-${String(nextNum++).padStart(4, "0")}`;
    const goal = {
      goal_id: goalId,
      title: g.title,
      description: g.description,
      priority: "medium",
      state: "PLANNED",
      created_at: new Date().toISOString(),
      tasks: g.tasks
    };
    fs.writeFileSync(path.join(goalsDir, `${goalId}.json`), JSON.stringify(goal, null, 2));
    console.log(`  ✓ ${goalId}: ${g.title} (${g.tasks.length} tasks)`);
    created.push({ goalId, title: g.title, taskCount: g.tasks.length });
  }

  console.log(`\n✅ Extracted ${created.length} goal(s) from chat.`);
  return { goals: created };
}

// ─── Helpers ───

function parseGoalFromText(text) {
  const lines = text.split("\n");
  let title = "", description = "";
  const tasks = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("GOAL_TITLE:")) title = t.replace("GOAL_TITLE:", "").trim();
    else if (t.startsWith("GOAL_DESCRIPTION:")) description = t.replace("GOAL_DESCRIPTION:", "").trim();
    else if (t.startsWith("- ") && t.includes("|")) {
      const parts = t.substring(2).split("|").map(p => p.trim());
      if (parts.length >= 3) tasks.push({ title: parts[0], lane: parts[1], description: parts[2] });
    }
  }
  return { title, description, tasks };
}

function writeGoalToState(projectRoot, goalData) {
  const stateDir = path.join(projectRoot, "automation", "state");
  fs.mkdirSync(path.join(stateDir, "goals"), { recursive: true });

  const goalsDir = path.join(stateDir, "goals");
  const existingIds = fs.readdirSync(goalsDir)
    .filter(f => f.match(/^G-\d+\.json$/))
    .map(f => parseInt(f.match(/^G-(\d+)/)[1]))
    .sort((a, b) => b - a);
  const nextNum = (existingIds[0] || 0) + 1;
  const goalId = `G-${String(nextNum).padStart(4, "0")}`;

  const goal = {
    goal_id: goalId,
    title: goalData.title,
    description: goalData.description,
    priority: "high",
    state: "PLANNED",
    created_at: new Date().toISOString(),
    tasks: goalData.tasks
  };

  fs.writeFileSync(path.join(goalsDir, `${goalId}.json`), JSON.stringify(goal, null, 2));
  console.log(`  ✓ Goal ${goalId}: ${goalData.title}`);
}

// ─── CLI ───

const [,, mode, ...args] = process.argv;

switch (mode) {
  case "analyze":
    await analyzeWithClaude(args[0] || ".");
    break;
  case "prompt":
    generateChatGPTPrompt(args[0]);
    break;
  case "apply": {
    const projectPath = args[0] || ".";
    // Read response from stdin or file
    let response = "";
    if (args[1] && fs.existsSync(args[1])) {
      response = fs.readFileSync(args[1], "utf8");
    } else {
      // Try to find latest response in queue
      const queueDir = path.join(autoRoot, "state", "prompts-queue");
      const metas = fs.readdirSync(queueDir)
        .filter(f => f.startsWith("smart-import") && f.endsWith(".meta.json"))
        .sort().reverse();
      if (metas.length > 0) {
        const meta = JSON.parse(fs.readFileSync(path.join(queueDir, metas[0]), "utf8"));
        const respFile = path.join(queueDir, meta.responseFile);
        if (fs.existsSync(respFile)) {
          response = fs.readFileSync(respFile, "utf8");
        }
      }
    }
    if (!response.trim()) {
      console.error("No response found. Provide a response file or paste into the dashboard queue.");
      process.exit(1);
    }
    applyResponse(projectPath, response);
    break;
  }
  case "extract-goals": {
    const projectPath = args[0] || ".";
    let chatText = "";
    if (args[1] && fs.existsSync(args[1])) {
      chatText = fs.readFileSync(args[1], "utf8");
    } else {
      console.error("Usage: smart-import.mjs extract-goals <project-path> <chat-text-file>");
      process.exit(1);
    }
    extractGoalsFromChat(projectPath, chatText);
    break;
  }
  default:
    console.log(`
AI Flow Lab — Smart Import (Claude+ChatGPT Tandem)

Usage:
  node smart-import.mjs analyze  <path>               Claude analyzes codebase
  node smart-import.mjs prompt   <path>               Generate ChatGPT prompt
  node smart-import.mjs apply    <path> [response.md]  Apply ChatGPT response
  node smart-import.mjs extract-goals <path> <chat.md> Extract goals from chat
`);
}
