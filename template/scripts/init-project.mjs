#!/usr/bin/env node
/**
 * init-project.mjs — Initialize a new AI Flow Lab project.
 *
 * Modes:
 *   NEW:    Creates a fresh project with generated docs via ChatGPT
 *   IMPORT: Analyzes existing codebase, then generates docs via ChatGPT
 *   CHAT:   Extracts project context from an existing ChatGPT conversation
 *
 * Usage:
 *   node init-project.mjs new    <name> <description>
 *   node init-project.mjs import <path-to-existing-project>
 *   node init-project.mjs chat   <name> [description]
 *
 * In APP mode: writes prompt to queue, waits for response, parses docs.
 * In API mode: sends prompt to OpenAI, parses response, writes docs.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { getLLMMode, callOpenAI, logUsage, estimateTokens } from "./_llm-utils.mjs";

const automationRoot = process.cwd();
const templateDir = path.resolve(automationRoot, "..", "template");

// ─── Prompt loading ───

function loadPromptTemplate(templateName) {
  // Try automation-local first, then template dir
  const paths = [
    path.join(templateDir, "prompts", templateName),
    path.join(automationRoot, "prompts", templateName),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  throw new Error(`Prompt template not found: ${templateName}`);
}

function fillTemplate(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value || "");
  }
  return result;
}

// ─── Response parser ───

function parseBootstrapResponse(response) {
  const docs = {};
  const sections = [
    { key: "DOMAIN_MODEL", file: "docs/DOMAIN_MODEL.md" },
    { key: "ARCHITECTURE", file: "docs/ARCHITECTURE.md" },
    { key: "INVARIANTS", file: "docs/INVARIANTS.md" },
    { key: "AGENTS", file: "AGENTS.md" },
    { key: "FIRST_GOAL", file: null },
    { key: "PROJECT_SUMMARY", file: null },
    { key: "OPEN_QUESTIONS", file: "ai/current-state/open-questions.md" },
    { key: "NEXT_STEPS", file: null },
  ];

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const header = `## OUTPUT: ${s.key}`;
    const idx = response.indexOf(header);
    if (idx === -1) continue;

    // Find content between this header and next OUTPUT header (or end)
    const contentStart = idx + header.length;
    let contentEnd = response.length;
    for (const other of sections) {
      if (other.key === s.key) continue;
      const otherIdx = response.indexOf(`## OUTPUT: ${other.key}`, contentStart);
      if (otherIdx !== -1 && otherIdx < contentEnd) contentEnd = otherIdx;
    }

    const content = response.substring(contentStart, contentEnd).trim();
    docs[s.key] = { content, file: s.file };
  }

  return docs;
}

function parseGoal(goalContent) {
  const lines = goalContent.split("\n");
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

// ─── Write docs to project ───

function writeDocs(projectRoot, docs, projectName) {
  const written = [];

  for (const [key, { content, file }] of Object.entries(docs)) {
    if (!file || !content) continue;
    const fullPath = path.join(projectRoot, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    // Add project-specific header
    let finalContent = content;
    if (content.startsWith("# ") === false && key !== "FIRST_GOAL") {
      finalContent = `# ${key.replace(/_/g, " ")}\n\n${content}`;
    }

    fs.writeFileSync(fullPath, finalContent);
    written.push(file);
    console.log(`  ✓ ${file}`);
  }

  return written;
}

function writeGoal(projectRoot, goalData) {
  if (!goalData.title) return;

  const stateDir = path.join(projectRoot, "automation", "state");
  fs.mkdirSync(path.join(stateDir, "goals"), { recursive: true });

  const goalId = "G-0001";
  const goal = {
    goal_id: goalId,
    title: goalData.title,
    description: goalData.description,
    priority: "high",
    state: "PLANNED",
    created_at: new Date().toISOString(),
    tasks: goalData.tasks.map((t, i) => ({
      title: t.title,
      lane: t.lane,
      description: t.description
    }))
  };

  fs.writeFileSync(
    path.join(stateDir, "goals", `${goalId}.json`),
    JSON.stringify(goal, null, 2)
  );

  // Also write a markdown version
  fs.mkdirSync(path.join(projectRoot, "goals"), { recursive: true });
  let md = `# ${goalData.title}\n\n${goalData.description}\n\n## Tasks\n\n`;
  for (const t of goalData.tasks) {
    md += `- **${t.title}** (${t.lane}): ${t.description}\n`;
  }
  fs.writeFileSync(path.join(projectRoot, "goals", `${goalId}_plan.md`), md);

  console.log(`  ✓ Goal ${goalId}: ${goalData.title}`);
  console.log(`    ${goalData.tasks.length} tasks proposed`);
}

// ─── Mode: NEW ───

async function initNew(projectName, description) {
  console.log(`\n🆕 Initializing new project: ${projectName}\n`);

  // Step 1: Run init-ai-flow.sh if template exists
  const initScript = path.join(templateDir, "init-ai-flow.sh");
  const projectRoot = path.resolve(automationRoot, "..");

  if (fs.existsSync(initScript)) {
    console.log("Running init-ai-flow.sh...");
    try {
      execSync(`bash "${initScript}" "${projectName}"`, { cwd: projectRoot, stdio: "inherit" });
    } catch (e) {
      console.log("  (init script had warnings, continuing...)");
    }
  } else {
    console.log("No init script found, creating directories manually...");
    for (const dir of ["automation/state/tasks", "automation/state/goals", "automation/state/proposals",
      "automation/scripts", "automation/ui", "ai/specs", "ai/reviews", "ai/briefs",
      "ai/results", "ai/followups", "ai/current-state", "docs", "goals"]) {
      fs.mkdirSync(path.join(projectRoot, dir), { recursive: true });
    }
  }

  // Step 2: Generate prompt
  console.log("\nGenerating ChatGPT bootstrap prompt...");
  const template = loadPromptTemplate("project-bootstrap.prompt.md");
  const prompt = fillTemplate(template, {
    PROJECT_NAME: projectName,
    PROJECT_DESCRIPTION: description || `A software project called ${projectName}.`
  });

  // Step 3: Send to LLM or queue
  const mode = getLLMMode();
  console.log(`LLM Mode: ${mode}`);

  if (mode === "app") {
    // Write prompt to queue for manual copy-paste
    const queueDir = path.join(automationRoot, "state", "prompts-queue");
    fs.mkdirSync(queueDir, { recursive: true });
    const id = `init-${Date.now()}`;
    const promptFile = path.join(queueDir, `${id}.prompt.md`);
    const metaFile = path.join(queueDir, `${id}.meta.json`);
    const responseFile = path.join(queueDir, `${id}.response.md`);

    fs.writeFileSync(promptFile, prompt);
    fs.writeFileSync(metaFile, JSON.stringify({
      id, taskId: null, step: "project-bootstrap", provider: "openai",
      status: "pending", createdAt: new Date().toISOString(),
      promptFile: path.basename(promptFile),
      responseFile: path.basename(responseFile)
    }, null, 2));

    // Also save the prompt to a convenient location
    const readyFile = path.join(projectRoot, "CHATGPT_BOOTSTRAP_PROMPT.md");
    fs.writeFileSync(readyFile, prompt);

    console.log(`\n📋 Prompt saved to: CHATGPT_BOOTSTRAP_PROMPT.md`);
    console.log(`   Copy this to ChatGPT, paste the response to:`);
    console.log(`   ${responseFile}`);
    console.log(`\n   Or paste the response into the Dashboard → ChatGPT view.`);
    console.log(`\n⏳ Waiting for response...`);

    // Poll for response
    const pollMs = parseInt(process.env.LLM_POLL_INTERVAL || "3000", 10);
    const timeoutMs = parseInt(process.env.LLM_APP_TIMEOUT || "3600000", 10);
    const startMs = Date.now();

    while (Date.now() - startMs < timeoutMs) {
      if (fs.existsSync(responseFile) && fs.readFileSync(responseFile, "utf8").trim().length > 100) {
        const response = fs.readFileSync(responseFile, "utf8");
        console.log("\n✅ Response received! Parsing...\n");
        return processResponse(projectRoot, projectName, response);
      }
      await new Promise(r => setTimeout(r, pollMs));
    }
    console.error("❌ Timeout waiting for ChatGPT response.");
    process.exit(1);

  } else {
    // API mode: call directly
    console.log("Calling OpenAI API...");
    const response = await callOpenAI({
      instructions: "You are a senior software architect helping set up a new project.",
      input: prompt,
      taskId: "INIT",
      step: "project-bootstrap"
    });
    console.log("\n✅ Response received! Parsing...\n");
    return processResponse(projectRoot, projectName, response);
  }
}

// ─── Mode: IMPORT ───

async function initImport(existingPath) {
  const absPath = path.resolve(existingPath);
  const projectName = path.basename(absPath);
  console.log(`\n📥 Importing existing project: ${projectName}\n`);
  console.log(`   Path: ${absPath}\n`);

  // Step 1: Analyze codebase
  console.log("Analyzing codebase...");
  const analyzeScript = path.join(automationRoot, "scripts", "analyze-codebase.mjs");
  let analysis;
  try {
    const output = execSync(`node "${analyzeScript}" "${absPath}"`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    analysis = JSON.parse(output);
  } catch (e) {
    console.error("Failed to analyze codebase:", e.message);
    process.exit(1);
  }

  console.log(`  ✓ ${analysis.fileCounts.total} files found`);
  console.log(`  ✓ Technologies: ${analysis.detectedTechnologies.join(", ")}`);
  console.log(`  ✓ ${Object.keys(analysis.existingDocs).length} existing docs found`);

  // Step 2: Run init-ai-flow.sh --existing
  const initScript = path.join(templateDir, "init-ai-flow.sh");
  if (fs.existsSync(initScript)) {
    console.log("\nRunning init-ai-flow.sh --existing...");
    try {
      execSync(`bash "${initScript}" --existing`, { cwd: absPath, stdio: "inherit" });
    } catch (e) {
      console.log("  (init script had warnings, continuing...)");
    }
  }

  // Step 3: Generate import prompt
  console.log("\nGenerating ChatGPT import prompt...");
  const template = loadPromptTemplate("project-import.prompt.md");

  const sourceSamplesStr = analysis.sourceSamples.map(s =>
    `### ${s.path} (${s.totalLines} lines)\n\`\`\`\n${s.preview}\n\`\`\``
  ).join("\n\n");

  const existingDocsStr = Object.entries(analysis.existingDocs).map(([name, content]) =>
    `### ${name}\n${content.substring(0, 1000)}${content.length > 1000 ? "\n...(truncated)" : ""}`
  ).join("\n\n") || "No existing documentation found.";

  const pkgInfoStr = Object.entries(analysis.packageInfo).map(([file, info]) => {
    if (typeof info === "string") return `${file}:\n${info}`;
    return `${file}: ${info.name}@${info.version}\n  deps: ${info.dependencies.join(", ")}\n  scripts: ${info.scripts.join(", ")}`;
  }).join("\n") || "No package info found.";

  const prompt = fillTemplate(template, {
    PROJECT_NAME: projectName,
    DIRECTORY_TREE: analysis.directoryTree.substring(0, 3000),
    DETECTED_TECH: analysis.detectedTechnologies.join(", ") || "Unknown",
    PACKAGE_INFO: pkgInfoStr,
    EXISTING_DOCS: existingDocsStr,
    GIT_BRANCHES: (analysis.gitInfo.branches || []).join(", ") || "none",
    RECENT_COMMITS: analysis.gitInfo.recentCommits || "none",
    CONTRIBUTORS: analysis.gitInfo.contributors || "unknown",
    SOURCE_SAMPLES: sourceSamplesStr || "No source files sampled."
  });

  // Step 4: Send to LLM or queue (same logic as NEW)
  const mode = getLLMMode();
  console.log(`LLM Mode: ${mode}`);

  if (mode === "app") {
    const queueDir = path.join(absPath, "automation", "state", "prompts-queue");
    fs.mkdirSync(queueDir, { recursive: true });
    const id = `import-${Date.now()}`;
    const promptFile = path.join(queueDir, `${id}.prompt.md`);
    const metaFile = path.join(queueDir, `${id}.meta.json`);
    const responseFile = path.join(queueDir, `${id}.response.md`);

    fs.writeFileSync(promptFile, prompt);
    fs.writeFileSync(metaFile, JSON.stringify({
      id, taskId: null, step: "project-import", provider: "openai",
      status: "pending", createdAt: new Date().toISOString(),
      promptFile: path.basename(promptFile), responseFile: path.basename(responseFile)
    }, null, 2));

    const readyFile = path.join(absPath, "CHATGPT_IMPORT_PROMPT.md");
    fs.writeFileSync(readyFile, prompt);

    // Also save analysis report
    const reportFile = path.join(absPath, "ai", "reports", "codebase-analysis.json");
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify(analysis, null, 2));

    console.log(`\n📋 Prompt saved to: CHATGPT_IMPORT_PROMPT.md`);
    console.log(`📊 Analysis saved to: ai/reports/codebase-analysis.json`);
    console.log(`   Copy the prompt to ChatGPT, paste the response to:`);
    console.log(`   ${responseFile}`);

    console.log(`\n⏳ Waiting for response...`);
    const pollMs = parseInt(process.env.LLM_POLL_INTERVAL || "3000", 10);
    const timeoutMs = parseInt(process.env.LLM_APP_TIMEOUT || "3600000", 10);
    const startMs = Date.now();

    while (Date.now() - startMs < timeoutMs) {
      if (fs.existsSync(responseFile) && fs.readFileSync(responseFile, "utf8").trim().length > 100) {
        const response = fs.readFileSync(responseFile, "utf8");
        console.log("\n✅ Response received! Parsing...\n");
        return processResponse(absPath, projectName, response);
      }
      await new Promise(r => setTimeout(r, pollMs));
    }
    console.error("❌ Timeout waiting for ChatGPT response.");
    process.exit(1);

  } else {
    console.log("Calling OpenAI API...");
    const response = await callOpenAI({
      instructions: "You are a senior software architect analyzing an existing codebase.",
      input: prompt,
      taskId: "IMPORT",
      step: "project-import"
    });
    console.log("\n✅ Response received! Parsing...\n");
    return processResponse(absPath, projectName, response);
  }
}

// ─── Mode: CHAT (extract from existing ChatGPT conversation) ───

async function initFromChat(projectName, description) {
  console.log(`\n💬 Extracting project context from ChatGPT chat: ${projectName}\n`);

  const projectRoot = path.resolve(automationRoot, "..");
  const template = loadPromptTemplate("chatgpt-chat-extract.prompt.md");
  const prompt = fillTemplate(template, {
    PROJECT_NAME: projectName,
    PROJECT_DESCRIPTION: description || ""
  });

  // This prompt is ALWAYS for manual use — user pastes it into their existing ChatGPT chat
  const readyFile = path.join(projectRoot, "CHATGPT_EXTRACT_PROMPT.md");
  fs.writeFileSync(readyFile, prompt);

  const queueDir = path.join(automationRoot, "state", "prompts-queue");
  fs.mkdirSync(queueDir, { recursive: true });
  const id = `chat-extract-${Date.now()}`;
  const responseFile = path.join(queueDir, `${id}.response.md`);
  fs.writeFileSync(path.join(queueDir, `${id}.meta.json`), JSON.stringify({
    id, taskId: null, step: "chat-extract", provider: "openai",
    status: "pending", createdAt: new Date().toISOString(),
    promptFile: "CHATGPT_EXTRACT_PROMPT.md",
    responseFile: path.basename(responseFile)
  }, null, 2));

  console.log(`📋 Extract prompt saved to: CHATGPT_EXTRACT_PROMPT.md`);
  console.log(`\n👉 Paste this prompt into your EXISTING ChatGPT conversation about ${projectName}.`);
  console.log(`   Then save ChatGPT's response to:`);
  console.log(`   ${responseFile}`);

  console.log(`\n⏳ Waiting for response...`);
  const pollMs = parseInt(process.env.LLM_POLL_INTERVAL || "3000", 10);
  const timeoutMs = parseInt(process.env.LLM_APP_TIMEOUT || "3600000", 10);
  const startMs = Date.now();

  while (Date.now() - startMs < timeoutMs) {
    if (fs.existsSync(responseFile) && fs.readFileSync(responseFile, "utf8").trim().length > 100) {
      const response = fs.readFileSync(responseFile, "utf8");
      console.log("\n✅ Response received! Parsing...\n");
      return processResponse(projectRoot, projectName, response);
    }
    await new Promise(r => setTimeout(r, pollMs));
  }
  console.error("❌ Timeout waiting for ChatGPT response.");
  process.exit(1);
}

// ─── Shared response processing ───

function processResponse(projectRoot, projectName, response) {
  const docs = parseBootstrapResponse(response);

  console.log("Writing documents...");
  const written = writeDocs(projectRoot, docs, projectName);

  // Handle FIRST_GOAL / NEXT_STEPS
  const goalContent = docs.FIRST_GOAL?.content || docs.NEXT_STEPS?.content;
  if (goalContent) {
    console.log("\nCreating initial goal...");
    const goalData = parseGoal(goalContent);
    writeGoal(projectRoot, goalData);
  }

  // Save raw response for reference
  const rawFile = path.join(projectRoot, "ai", "reports", "bootstrap-response.md");
  fs.mkdirSync(path.dirname(rawFile), { recursive: true });
  fs.writeFileSync(rawFile, response);

  console.log(`\n✅ Project ${projectName} initialized!`);
  console.log(`   ${written.length} documents written`);
  console.log(`   Raw response saved to: ai/reports/bootstrap-response.md`);
  console.log(`\n   Next: Start the dashboard with 'cd automation && node scripts/serve-dashboard.mjs'`);
}

// ─── CLI ───

const [,, mode, ...args] = process.argv;

if (!mode || !["new", "import", "chat"].includes(mode)) {
  console.log(`
AI Flow Lab — Project Initialization

Usage:
  node init-project.mjs new    <name> <description>    Create a new project
  node init-project.mjs import <path>                  Import existing codebase
  node init-project.mjs chat   <name> [description]    Extract from ChatGPT chat

Examples:
  node init-project.mjs new "my-app" "A task management app with real-time collaboration"
  node init-project.mjs import /path/to/existing/project
  node init-project.mjs chat "my-app" "We've been discussing a task app in ChatGPT"
`);
  process.exit(1);
}

switch (mode) {
  case "new":
    await initNew(args[0] || "my-project", args.slice(1).join(" "));
    break;
  case "import":
    await initImport(args[0] || ".");
    break;
  case "chat":
    await initFromChat(args[0] || "my-project", args.slice(1).join(" "));
    break;
}
