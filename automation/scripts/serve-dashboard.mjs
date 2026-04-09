import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec, execSync } from "node:child_process";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let automationRoot = path.dirname(__dirname);

// Non-blocking exec wrapper — prevents server from freezing during long step executions
function execAsync(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (error, stdout, stderr) => {
      if (error) { error.stdout = stdout; error.stderr = stderr; reject(error); }
      else resolve({ stdout, stderr });
    });
  });
}
let repoRoot = path.resolve(automationRoot, "..");

// ─── Multi-Project Support ───
import {
  loadRegistry, listProjects, getActiveProject, addProject,
  switchProject, removeProject, ensureCurrentProjectRegistered
} from "./project-registry.mjs";
import { importWithClaude } from "./import-with-claude.mjs";

// Track running cascades to prevent unsafe project switches
let _runningCascades = 0;

function switchToProject(project) {
  if (_runningCascades > 0) {
    throw new Error(`Cannot switch project: ${_runningCascades} cascade(s) still running. Wait for completion or cancel them first.`);
  }
  repoRoot = project.path;
  automationRoot = project.automation_path;
  // Reload .env from new automation root
  dotenv.config({ path: path.join(automationRoot, ".env"), override: true });
  console.log(`[PROJECT] Switched to: ${project.name} (${project.path})`);
}

/**
 * Snapshot current project paths for safe use in long-running async operations.
 * Always call this at the START of a cascade/pipeline to capture paths before any switch.
 */
function captureProjectContext() {
  // Snapshot project-specific env vars alongside paths — protects against process.env mutation on project switch
  const envSnapshot = {};
  const projectEnvKeys = [
    'OPENAI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY',
    'CLAUDE_MODEL', 'GEMINI_MODEL', 'OPENAI_MODEL',
    'LLM_MODE', 'LLM_PROVIDER_ARCHITECT', 'LLM_PROVIDER_CRITIQUE',
    'LLM_PROVIDER_SYNTHESIZE', 'LLM_PROVIDER_EXECUTE', 'LLM_PROVIDER_FOLLOWUPS',
    'LLM_PROVIDER_PR_DRAFT', 'REPO_ROOT', 'AUTOMATION_ROOT'
  ];
  for (const k of projectEnvKeys) {
    if (process.env[k] !== undefined) envSnapshot[k] = process.env[k];
  }
  return {
    repoRoot: repoRoot,
    automationRoot: automationRoot,
    stateDir: path.join(automationRoot, "state"),
    uiDir: path.join(automationRoot, "ui"),
    env: envSnapshot
  };
}

// Helper: build child process env from captured context
function buildChildEnv(ctx) {
  return { ...process.env, ...ctx.env };
}

// Load .env from automation root (where the .env file lives)
dotenv.config({ path: path.join(automationRoot, ".env") });

const PORT = parseInt(process.env.PORT || "3847", 10);

function getStateDir() {
  return path.join(automationRoot, "state");
}

function getUIDir() {
  return path.join(automationRoot, "ui");
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error("Invalid JSON in request body"));
      }
    });
    req.on("error", reject);
  });
}

function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    return null;
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
    return null;
  }
}

function listFilesInDir(dirPath, pattern = null) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs
      .readdirSync(dirPath)
      .filter((f) => !pattern || pattern.test(f))
      .sort();
  } catch (e) {
    return [];
  }
}

function respondJSON(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json", "Cache-Control": "no-store, no-cache", "Pragma": "no-cache" });
  res.end(JSON.stringify(data, null, 2));
}

function respondError(res, statusCode, message) {
  respondJSON(res, statusCode, { error: message });
}

function respondFile(res, filePath, contentType = "text/html") {
  try {
    if (!fs.existsSync(filePath)) {
      respondError(res, 404, "File not found");
      return;
    }
    const content = fs.readFileSync(filePath, "utf8");
    res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store, no-cache", "Pragma": "no-cache" });
    res.end(content);
  } catch (e) {
    respondError(res, 500, `Error reading file: ${e.message}`);
  }
}

// API route handlers
const apiRoutes = {
  "GET /api/health": (req, res) => {
    // Diagnostic: check LLM mode, API keys, CLI availability
    const mode = (process.env.LLM_MODE || "mock").toLowerCase();
    const hasOpenAIKey = !!(process.env.OPENAI_API_KEY || "").trim();
    const hasGeminiKey = !!(process.env.GEMINI_API_KEY || "").trim();
    const hasAnthropicKey = !!(process.env.ANTHROPIC_API_KEY || "").trim();
    let hasClaudeCLI = false, claudeVersion = null;
    let hasCodexCLI = false;
    try { execSync("which claude", { stdio: "ignore" }); hasClaudeCLI = true; } catch {}
    try { claudeVersion = execSync("claude --version", { encoding: "utf8", timeout: 5000 }).trim(); } catch {}
    try { execSync("which codex", { stdio: "ignore" }); hasCodexCLI = true; } catch {}

    const claudeReady = hasAnthropicKey || hasClaudeCLI;
    const issues = [];
    if (!hasAnthropicKey && !hasClaudeCLI) issues.push("Claude: no API key AND no CLI — Claude tasks will fail!");
    if (!hasOpenAIKey) issues.push("OpenAI: no API key — OpenAI tasks may fail (unless codex CLI available)");
    if (!hasGeminiKey) issues.push("Gemini: no API key — Gemini tasks will fail");

    respondJSON(res, 200, {
      mode,
      keys: { openai: hasOpenAIKey, gemini: hasGeminiKey, anthropic: hasAnthropicKey },
      cli: { claude: hasClaudeCLI, claudeVersion, codex: hasCodexCLI },
      claudeReady,
      issues
    });
  },

  // ─── Project Management Endpoints ───

  "GET /api/projects": (req, res) => {
    const projects = listProjects();
    const reg = loadRegistry();
    respondJSON(res, 200, {
      projects,
      active_project: reg.active_project,
      current_repo: repoRoot
    });
  },

  "GET /api/projects/active": (req, res) => {
    const active = getActiveProject();
    respondJSON(res, 200, { project: active, current_repo: repoRoot });
  },

  "POST /api/projects/add": async (req, res) => {
    const body = await parseJsonBody(req);
    const { name, path: projectPath, mode: initMode } = body;

    if (!projectPath) {
      respondError(res, 400, "Missing required field: path");
      return;
    }

    // Ensure path exists
    if (!fs.existsSync(projectPath)) {
      respondError(res, 400, `Path does not exist: ${projectPath}`);
      return;
    }

    const result = addProject({
      name: name || path.basename(projectPath),
      projectPath
    });

    if (!result.ok) {
      respondError(res, 409, result.error);
      return;
    }

    // If mode is "new", create automation scaffold
    if (initMode === "new") {
      const dirs = [
        "automation/state/tasks", "automation/state/goals", "automation/state/proposals",
        "automation/state/prompts-queue", "automation/state/decision_proposals",
        "ai/specs", "ai/reviews", "ai/briefs", "ai/results", "ai/followups",
        "ai/current-state", "ai/reports", "docs", "goals"
      ];
      for (const dir of dirs) {
        fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
      }
      // git init
      if (!fs.existsSync(path.join(projectPath, ".git"))) {
        try { execSync("git init", { cwd: projectPath, stdio: "pipe" }); } catch (_) {}
      }
      // default config
      const configPath = path.join(projectPath, "ai", "project.config.yaml");
      if (!fs.existsSync(configPath)) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, `# AI Flow Lab — Project Configuration
name: ${name || path.basename(projectPath)}
description: ""

truth_sources:
  - docs/DOMAIN_MODEL.md
  - docs/INVARIANTS.md
  - docs/ARCHITECTURE.md

executor_routing:
  default:
    architect: openai
    critique: gemini
    synthesize: openai
    execute: claude

cascade_limits:
  max_depth: 3
  max_followups_per_task: 5
  max_total_tasks: 20
`);
      }
    }

    respondJSON(res, 201, result);
  },

  "POST /api/projects/switch": async (req, res) => {
    const body = await parseJsonBody(req);
    const { projectId } = body;

    if (!projectId) {
      respondError(res, 400, "Missing required field: projectId");
      return;
    }

    const result = switchProject(projectId);
    if (!result.ok) {
      respondError(res, 404, result.error);
      return;
    }

    // Update server state — will throw if cascades are running
    try {
      switchToProject(result.project);
    } catch (e) {
      respondError(res, 409, e.message);
      return;
    }

    respondJSON(res, 200, {
      ...result,
      message: `Switched to ${result.project.name}. Dashboard will reload state.`
    });
  },

  "POST /api/projects/remove": async (req, res) => {
    const body = await parseJsonBody(req);
    const { projectId } = body;

    if (!projectId) {
      respondError(res, 400, "Missing required field: projectId");
      return;
    }

    const result = removeProject(projectId);
    if (!result.ok) {
      respondError(res, 404, result.error);
      return;
    }

    respondJSON(res, 200, result);
  },

  "POST /api/projects/import": async (req, res) => {
    const body = await parseJsonBody(req);
    const { path: projectPath, name } = body;

    if (!projectPath) {
      respondError(res, 400, "Missing required field: path");
      return;
    }

    if (!fs.existsSync(projectPath)) {
      respondError(res, 400, `Path does not exist: ${projectPath}`);
      return;
    }

    // Respond immediately — import runs in background
    respondJSON(res, 202, {
      success: true,
      message: `Import started for ${projectPath}. Check /api/projects/import-status for progress.`
    });

    // Run import in background
    (async () => {
      try {
        const result = await importWithClaude(projectPath, { name });
        console.log(`[IMPORT] Done: ${JSON.stringify(result).substring(0, 200)}`);

        // Auto-register project
        if (result.ok) {
          addProject({ name: result.projectName || name || path.basename(projectPath), projectPath });
        }

        // Store result for status endpoint
        const statusFile = path.join(getStateDir(), ".import-status.json");
        fs.writeFileSync(statusFile, JSON.stringify({ ...result, completed_at: new Date().toISOString() }, null, 2));
      } catch (e) {
        console.error(`[IMPORT] Failed:`, e.message);
        const statusFile = path.join(getStateDir(), ".import-status.json");
        fs.writeFileSync(statusFile, JSON.stringify({ ok: false, error: e.message, completed_at: new Date().toISOString() }, null, 2));
      }
    })();
  },

  "GET /api/projects/import-status": (req, res) => {
    const statusFile = path.join(getStateDir(), ".import-status.json");
    if (fs.existsSync(statusFile)) {
      try {
        const status = JSON.parse(fs.readFileSync(statusFile, "utf8"));
        respondJSON(res, 200, status);
      } catch (_) {
        respondJSON(res, 200, { status: "running" });
      }
    } else {
      respondJSON(res, 200, { status: "idle" });
    }
  },

  "GET /api/state": (req, res) => {
    const stateDir = getStateDir();
    const state = {
      goals: [],
      tasks: [],
      proposals: [],
      decision_proposals: [],
      decisions: [],
      pr_drafts: []
    };

    // Load goals
    const goalsDir = path.join(stateDir, "goals");
    listFilesInDir(goalsDir, /\.json$/).forEach((file) => {
      const goal = readJSON(path.join(goalsDir, file));
      if (goal) state.goals.push(goal);
    });

    // Load tasks — also check which doc files actually exist on disk
    const tasksDir = path.join(stateDir, "tasks");
    const docFields = ["spec_path", "review_path", "brief_path", "result_path", "followup_path", "pr_draft_path"];
    listFilesInDir(tasksDir, /^T-\d+\.json$/).forEach((file) => {
      const task = readJSON(path.join(tasksDir, file));
      if (task) {
        // Add docs_exist map so the UI knows which doc links are valid
        task.docs_exist = {};
        docFields.forEach((field) => {
          if (task[field]) {
            const absDocPath = path.resolve(repoRoot, task[field]);
            task.docs_exist[field] = fs.existsSync(absDocPath);
          } else {
            task.docs_exist[field] = false;
          }
        });
        state.tasks.push(task);
      }
    });

    // Load proposals
    const proposalsDir = path.join(stateDir, "proposals");
    listFilesInDir(proposalsDir, /\.json$/).forEach((file) => {
      const proposal = readJSON(path.join(proposalsDir, file));
      if (proposal) state.proposals.push(proposal);
    });

    // Load decision proposals (all — UI filters open/resolved)
    const dpDir = path.join(stateDir, "decision_proposals");
    const seenDPIds = new Set();
    listFilesInDir(dpDir, /\.json$/).forEach((file) => {
      const dp = readJSON(path.join(dpDir, file));
      if (dp && dp.decision_proposal_id && !seenDPIds.has(dp.decision_proposal_id)) {
        seenDPIds.add(dp.decision_proposal_id);
        state.decision_proposals.push(dp);
      }
    });

    // Load decisions
    const decDir = path.join(stateDir, "decisions");
    listFilesInDir(decDir, /\.json$/).forEach((file) => {
      const dec = readJSON(path.join(decDir, file));
      if (dec) state.decisions.push(dec);
    });

    // Load PR drafts
    const prDraftDir = path.join(stateDir, "pr_drafts");
    listFilesInDir(prDraftDir, /\.json$/).forEach((file) => {
      const draft = readJSON(path.join(prDraftDir, file));
      if (draft) state.pr_drafts.push(draft);
    });

    // Add LLM mode
    state.mode = (process.env.LLM_MODE || "mock").toUpperCase();

    // Add e2e test result if available
    const e2eResultFile = path.join(stateDir, "e2e-test-result.json");
    state.e2e_test_result = readJSON(e2eResultFile) || null;

    // Active project info — allows dashboard to detect project switches
    state.active_project = {
      repoRoot: repoRoot,
      automationRoot: automationRoot,
      name: path.basename(repoRoot),
      running_cascades: _runningCascades
    };

    respondJSON(res, 200, state);
  },

  "GET /api/usage": (req, res) => {
    const usageDir = path.join(getStateDir(), "usage-log");
    const logFile = path.join(usageDir, "usage-log.jsonl");

    if (!fs.existsSync(logFile)) {
      respondJSON(res, 200, []);
      return;
    }

    try {
      const lines = fs
        .readFileSync(logFile, "utf8")
        .split("\n")
        .filter((line) => line.trim());

      const entries = lines.map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);

      respondJSON(res, 200, entries);
    } catch (e) {
      respondError(res, 500, `Error reading usage log: ${e.message}`);
    }
  },

  "GET /api/prompts": (req, res) => {
    const queueDir = path.join(getStateDir(), "prompts-queue");
    const prompts = [];

    if (!fs.existsSync(queueDir)) {
      respondJSON(res, 200, prompts);
      return;
    }

    try {
      listFilesInDir(queueDir, /\.meta\.json$/).forEach((file) => {
        const meta = readJSON(path.join(queueDir, file));
        if (meta) {
          const promptFile = path.join(queueDir, meta.promptFile);
          const responseFile = path.join(queueDir, meta.responseFile);

          prompts.push({
            ...meta,
            text: fs.existsSync(promptFile) ? fs.readFileSync(promptFile, "utf8") : "",
            hasPrompt: fs.existsSync(promptFile),
            hasResponse: fs.existsSync(responseFile),
            promptSize: fs.existsSync(promptFile) ? fs.statSync(promptFile).size : 0,
            responseSize: fs.existsSync(responseFile) ? fs.statSync(responseFile).size : 0
          });
        }
      });

      prompts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      respondJSON(res, 200, prompts);
    } catch (e) {
      respondError(res, 500, `Error reading prompts: ${e.message}`);
    }
  },

  "POST /api/prompts/:id/respond": async (req, res, params) => {
    const { id } = params;
    const queueDir = path.join(getStateDir(), "prompts-queue");
    const responseFile = path.join(queueDir, `${id}.response.md`);
    const metaFile = path.join(queueDir, `${id}.meta.json`);

    try {
      const body = await parseJsonBody(req);
      const response = body.response || "";

      // Write response
      fs.writeFileSync(responseFile, response);

      // Update meta
      const meta = readJSON(metaFile);
      if (meta) {
        meta.status = "completed";
        meta.completedAt = new Date().toISOString();
        fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
      }

      respondJSON(res, 200, { success: true, id, responseFile: path.basename(responseFile) });
    } catch (e) {
      respondError(res, 500, `Error responding to prompt: ${e.message}`);
    }
  },

  "POST /api/run/goal": async (req, res) => {
    try {
      const body = await parseJsonBody(req);
      const { goalId, firstTaskId } = body;

      if (!goalId || !firstTaskId) {
        respondError(res, 400, "Missing goalId or firstTaskId");
        return;
      }

      // Spawn background execution
      console.log(`API: Triggering run-goal-first-task for ${goalId}, first task: ${firstTaskId}`);

      try {
        execSync(`node scripts/run-goal-first-task.mjs ${goalId} ${firstTaskId}`, {
          cwd: automationRoot,
          stdio: "pipe"
        });
        respondJSON(res, 202, { success: true, goalId, firstTaskId, message: "Goal execution started" });
      } catch (e) {
        respondError(res, 500, `Failed to start goal execution: ${e.message}`);
      }
    } catch (e) {
      respondError(res, 500, `Error: ${e.message}`);
    }
  },

  "POST /api/run/task": async (req, res) => {
    try {
      const body = await parseJsonBody(req);
      const { taskId } = body;

      if (!taskId) {
        respondError(res, 400, "Missing taskId");
        return;
      }

      // Spawn background execution
      console.log(`API: Triggering run-task for ${taskId}`);

      try {
        execSync(`node scripts/run-task.mjs ${taskId}`, {
          cwd: automationRoot,
          stdio: "pipe"
        });
        respondJSON(res, 202, { success: true, taskId, message: "Task execution started" });
      } catch (e) {
        respondError(res, 500, `Failed to start task execution: ${e.message}`);
      }
    } catch (e) {
      respondError(res, 500, `Error: ${e.message}`);
    }
  },

  "POST /api/decisions/resolve": async (req, res) => {
    try {
      const body = await parseJsonBody(req);
      const { proposalId, selectedOption, rationale } = body;

      if (!proposalId || !selectedOption) {
        respondError(res, 400, "Missing proposalId or selectedOption");
        return;
      }

      const dpDir = path.join(getStateDir(), "decision_proposals");
      const dpFile = path.join(dpDir, `${proposalId}.json`);

      if (!fs.existsSync(dpFile)) {
        respondError(res, 404, `Decision proposal ${proposalId} not found`);
        return;
      }

      const proposal = readJSON(dpFile);
      proposal.status = "resolved";
      proposal.resolved_at = new Date().toISOString();
      fs.writeFileSync(dpFile, JSON.stringify(proposal, null, 2));

      // Create decision record
      const decDir = path.join(getStateDir(), "decisions");
      fs.mkdirSync(decDir, { recursive: true });
      const decFiles = fs.readdirSync(decDir).filter(f => f.endsWith(".json"));
      const decNums = decFiles.map(f => parseInt(f.match(/DEC-(\d+)/)?.[1] || "0", 10)).filter(n => n > 0);
      const nextDec = decNums.length === 0 ? 1 : Math.max(...decNums) + 1;
      const decId = `DEC-${String(nextDec).padStart(4, "0")}`;

      const decision = {
        decision_id: decId,
        decision_proposal_id: proposalId,
        topic: proposal.topic,
        status: "accepted",
        selected_option: selectedOption,
        rationale: rationale || `Resolved from proposal ${proposalId}`,
        scope: proposal.blocking_scope,
        implications: "",
        linked_tasks: [proposal.source_task_id].filter(Boolean),
        linked_goals: [proposal.source_goal_id].filter(Boolean),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      fs.writeFileSync(path.join(decDir, `${decId}.json`), JSON.stringify(decision, null, 2));

      // Write decision markdown
      const docsDecDir = path.join(automationRoot, "..", "docs", "decisions");
      fs.mkdirSync(docsDecDir, { recursive: true });
      const mdContent = `# ${decId}: ${proposal.topic}\n\n` +
        `## Status\nACCEPTED\n\n` +
        `## Decision\n${selectedOption}\n\n` +
        `## Rationale\n${rationale || "Owner decision."}\n\n` +
        `## Date\n${new Date().toISOString()}\n`;
      fs.writeFileSync(path.join(docsDecDir, `${decId}.md`), mdContent);

      // Unblock any tasks waiting on this decision
      const tasksDir = path.join(getStateDir(), "tasks");
      listFilesInDir(tasksDir, /^T-\d+\.json$/).forEach((file) => {
        const task = readJSON(path.join(tasksDir, file));
        if (task && task.state === "BLOCKED_ON_DECISION" && task.open_decisions?.includes(proposalId)) {
          task.open_decisions = task.open_decisions.filter(d => d !== proposalId);
          if (task.open_decisions.length === 0) {
            task.state = "READY_AFTER_DECISION";
            task.runtime_status = "UNBLOCKED";
            delete task.open_decisions;
          }
          task.updated_at = new Date().toISOString();
          fs.writeFileSync(path.join(tasksDir, file), JSON.stringify(task, null, 2));
        }
      });

      // Unblock goals too
      const goalsDir = path.join(getStateDir(), "goals");
      listFilesInDir(goalsDir, /\.json$/).forEach((file) => {
        const goal = readJSON(path.join(goalsDir, file));
        if (goal && goal.state === "BLOCKED_ON_DECISION" && goal.open_decisions?.includes(proposalId)) {
          goal.open_decisions = goal.open_decisions.filter(d => d !== proposalId);
          if (goal.open_decisions.length === 0) {
            goal.state = "PLANNED";
          }
          goal.updated_at = new Date().toISOString();
          fs.writeFileSync(path.join(goalsDir, file), JSON.stringify(goal, null, 2));
        }
      });

      respondJSON(res, 200, { success: true, decisionId: decId, proposalId });
    } catch (e) {
      respondError(res, 500, `Error: ${e.message}`);
    }
  },

  "GET /api/document": (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const relPath = url.searchParams.get("path");
    if (!relPath) {
      respondError(res, 400, "Missing path parameter");
      return;
    }
    const absPath = path.resolve(repoRoot, relPath);
    if (!absPath.startsWith(repoRoot)) {
      respondError(res, 403, "Path traversal not allowed");
      return;
    }
    if (!fs.existsSync(absPath)) {
      respondError(res, 404, "Document not found");
      return;
    }
    try {
      const content = fs.readFileSync(absPath, "utf8");
      respondJSON(res, 200, { path: relPath, content, size: content.length });
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "GET /api/documents": (req, res) => {
    const docs = {};
    const dirs = {
      specs: path.join(repoRoot, "ai", "specs"),
      reviews: path.join(repoRoot, "ai", "reviews"),
      briefs: path.join(repoRoot, "ai", "briefs"),
      results: path.join(repoRoot, "ai", "results"),
      followups: path.join(repoRoot, "ai", "followups"),
      pr_drafts: path.join(repoRoot, "ai", "pr"),
      reports: path.join(repoRoot, "ai", "reports"),
      current_state: path.join(repoRoot, "ai", "current-state"),
      goals: path.join(repoRoot, "goals"),
      project_docs: path.join(repoRoot, "docs"),
      decisions: path.join(repoRoot, "docs", "decisions"),
      adr: path.join(repoRoot, "docs", "ADR")
    };
    for (const [category, dirPath] of Object.entries(dirs)) {
      docs[category] = listFilesInDir(dirPath, /\.(md|json)$/).map(f => ({
        name: f,
        path: path.relative(repoRoot, path.join(dirPath, f)),
        size: fs.existsSync(path.join(dirPath, f)) ? fs.statSync(path.join(dirPath, f)).size : 0
      }));
    }
    respondJSON(res, 200, docs);
  },

  "GET /api/git": (req, res) => {
    try {
      const branch = execSync("git branch --show-current", { cwd: repoRoot, stdio: "pipe" }).toString().trim();
      let branches = [];
      try {
        branches = execSync("git branch -a --format='%(refname:short)|%(objectname:short)|%(committerdate:relative)|%(subject)'", { cwd: repoRoot, stdio: "pipe" })
          .toString().trim().split("\n").filter(Boolean).map(line => {
            const [name, hash, date, ...subjectParts] = line.split("|");
            return { name: name.trim(), hash, date, subject: subjectParts.join("|") };
          });
      } catch {}
      let log = [];
      try {
        log = execSync("git log --oneline -20 --format='%h|%s|%ar'", { cwd: repoRoot, stdio: "pipe" })
          .toString().trim().split("\n").filter(Boolean).map(line => {
            const [hash, ...rest] = line.split("|");
            const date = rest.pop();
            return { hash, subject: rest.join("|"), date };
          });
      } catch {}
      respondJSON(res, 200, { current_branch: branch, branches, log });
    } catch (e) {
      respondJSON(res, 200, { current_branch: "unknown", branches: [], log: [], error: e.message });
    }
  },

  "GET /api/project": (req, res) => {
    const configPath = path.join(repoRoot, "ai", "project.config.yaml");
    let config = "";
    if (fs.existsSync(configPath)) {
      config = fs.readFileSync(configPath, "utf8");
    }
    const name = path.basename(repoRoot);
    respondJSON(res, 200, {
      name,
      root: repoRoot,
      automation_root: automationRoot,
      config,
      has_agents: fs.existsSync(path.join(repoRoot, "AGENTS.md")),
      has_claude: fs.existsSync(path.join(repoRoot, "CLAUDE.md")),
      has_domain_model: fs.existsSync(path.join(repoRoot, "docs", "DOMAIN_MODEL.md")),
      has_invariants: fs.existsSync(path.join(repoRoot, "docs", "INVARIANTS.md")),
      has_architecture: fs.existsSync(path.join(repoRoot, "docs", "ARCHITECTURE.md"))
    });
  },

  "POST /api/tasks/create": async (req, res) => {
    try {
      const body = await parseJsonBody(req);
      const { taskId, title, laneType, executor, description, parentGoalId } = body;
      if (!taskId || !title) {
        respondError(res, 400, "Missing taskId or title");
        return;
      }
      const result = execSync(
        `node scripts/new-task.mjs "${taskId}" "${laneType || 'feature-lane'}" "${title}" "${executor || 'codex'}"`,
        { cwd: automationRoot, stdio: "pipe" }
      ).toString();
      // Patch in description and parentGoalId if provided
      const cleanId = taskId.includes('/') ? taskId.split('/').pop() : taskId;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      const taskFileClean = path.join(getStateDir(), "tasks", `${cleanId}.json`);
      // Try both paths in case taskId is already clean or has prefix
      const actualFile = fs.existsSync(taskFile) ? taskFile : fs.existsSync(taskFileClean) ? taskFileClean : null;
      if (actualFile) {
        const task = readJSON(actualFile);
        if (task) {
          if (description) task.description = description;
          if (parentGoalId) task.parent_goal_id = parentGoalId;
          fs.writeFileSync(actualFile, JSON.stringify(task, null, 2));
        }
      }
      respondJSON(res, 201, { success: true, taskId, message: result.trim() });
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "POST /api/goals/create": async (req, res) => {
    try {
      const body = await parseJsonBody(req);
      const { goalId, title, description, priority } = body;
      if (!goalId || !title) {
        respondError(res, 400, "Missing goalId or title");
        return;
      }
      const goalsDir = path.join(getStateDir(), "goals");
      fs.mkdirSync(goalsDir, { recursive: true });
      const goal = {
        goal_id: goalId,
        title,
        description: description || "",
        priority: priority || "normal",
        state: "NEW",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      fs.writeFileSync(path.join(goalsDir, `${goalId}.json`), JSON.stringify(goal, null, 2));
      // Also create the goal markdown
      const goalsMdDir = path.join(repoRoot, "goals");
      fs.mkdirSync(goalsMdDir, { recursive: true });
      fs.writeFileSync(path.join(goalsMdDir, `${goalId}.md`), `# ${goalId}: ${title}\n\n${description || ""}\n`);
      respondJSON(res, 201, { success: true, goalId });
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "POST /api/chatgpt/queue": async (req, res) => {
    try {
      const body = await parseJsonBody(req);
      const { prompt, taskId, step } = body;
      if (!prompt) {
        respondError(res, 400, "Missing prompt");
        return;
      }
      const queueDir = path.join(getStateDir(), "prompts-queue");
      fs.mkdirSync(queueDir, { recursive: true });
      const id = `prompt-${Date.now()}`;
      const meta = {
        id,
        taskId: taskId || null,
        step: step || "manual",
        status: "pending",
        promptFile: `${id}.prompt.md`,
        responseFile: `${id}.response.md`,
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(path.join(queueDir, `${id}.meta.json`), JSON.stringify(meta, null, 2));
      fs.writeFileSync(path.join(queueDir, `${id}.prompt.md`), prompt);
      respondJSON(res, 201, { success: true, id, message: "Prompt queued" });
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  // === PROJECT ONBOARDING ENDPOINTS ===

  "POST /api/project/init": async (req, res) => {
    // Initialize a new project or import existing
    try {
      const body = await parseJsonBody(req);
      const { mode, name, description, importPath } = body;
      // mode: "new" | "import" | "chat"
      if (!mode || !["new", "import", "chat"].includes(mode)) {
        respondError(res, 400, "mode must be 'new', 'import', or 'chat'");
        return;
      }
      let args = "";
      if (mode === "new") args = `new "${name || "my-project"}" "${description || ""}"`;
      else if (mode === "import") args = `import "${importPath || "."}"`;
      else if (mode === "chat") args = `chat "${name || "my-project"}" "${description || ""}"`;

      // Run async — don't block

      exec(`node scripts/init-project.mjs ${args}`, { cwd: automationRoot }, (err, stdout, stderr) => {
        if (err) console.error(`init-project ${mode} failed:`, stderr);
        else console.log(`init-project ${mode} completed:`, stdout.substring(0, 200));
      });
      respondJSON(res, 202, { success: true, message: `Project ${mode} started` });
    } catch (e) { respondError(res, 500, e.message); }
  },

  "POST /api/project/analyze": async (req, res) => {
    // Analyze a codebase and return the report
    try {
      const body = await parseJsonBody(req);
      const { projectPath } = body;
      if (!projectPath) { respondError(res, 400, "Missing projectPath"); return; }
      const absPath = path.resolve(projectPath);
      if (!fs.existsSync(absPath)) { respondError(res, 404, "Path not found: " + absPath); return; }


      const output = execSync(`node scripts/analyze-codebase.mjs "${absPath}"`, {
        cwd: automationRoot, encoding: "utf8", maxBuffer: 10 * 1024 * 1024
      });
      respondJSON(res, 200, JSON.parse(output));
    } catch (e) { respondError(res, 500, e.message); }
  },

  "POST /api/project/apply-response": async (req, res) => {
    // Parse a ChatGPT bootstrap/import response and write docs
    try {
      const body = await parseJsonBody(req);
      const { response, projectName } = body;
      if (!response) { respondError(res, 400, "Missing response text"); return; }

      // Parse sections from response
      const sections = ["DOMAIN_MODEL", "ARCHITECTURE", "INVARIANTS", "AGENTS", "FIRST_GOAL", "PROJECT_SUMMARY", "OPEN_QUESTIONS", "NEXT_STEPS"];
      const fileMap = {
        DOMAIN_MODEL: "docs/DOMAIN_MODEL.md",
        ARCHITECTURE: "docs/ARCHITECTURE.md",
        INVARIANTS: "docs/INVARIANTS.md",
        AGENTS: "AGENTS.md",
        OPEN_QUESTIONS: "ai/current-state/open-questions.md"
      };

      const written = [];
      for (let i = 0; i < sections.length; i++) {
        const key = sections[i];
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
          const fp = path.join(repoRoot, fileMap[key]);
          fs.mkdirSync(path.dirname(fp), { recursive: true });
          fs.writeFileSync(fp, content);
          written.push(fileMap[key]);
        }
      }

      // Save raw response
      const rawPath = path.join(repoRoot, "ai", "reports", "bootstrap-response.md");
      fs.mkdirSync(path.dirname(rawPath), { recursive: true });
      fs.writeFileSync(rawPath, response);
      written.push("ai/reports/bootstrap-response.md");

      respondJSON(res, 200, { success: true, written });
    } catch (e) { respondError(res, 500, e.message); }
  },

  "GET /api/git/graph": (req, res) => {
    // Return git commit graph for ancestry tree visualization
    try {

      // Get commit graph with parent info
      const logRaw = execSync(
        'git log --all --format="%H|%h|%P|%s|%an|%ai|%D" --max-count=200',
        { cwd: repoRoot, encoding: "utf8" }
      ).trim();

      const commits = [];
      for (const line of logRaw.split("\n")) {
        if (!line.trim()) continue;
        const [hash, short, parents, subject, author, date, refs] = line.split("|");
        commits.push({
          hash, short,
          parents: parents ? parents.split(" ") : [],
          subject, author, date,
          refs: refs ? refs.split(",").map(r => r.trim()).filter(Boolean) : []
        });
      }

      // Get branches with their tip commits
      const branchRaw = execSync(
        'git branch -a --format="%(refname:short)|%(objectname:short)|%(upstream:short)"',
        { cwd: repoRoot, encoding: "utf8" }
      ).trim();
      const branches = [];
      for (const line of branchRaw.split("\n")) {
        if (!line.trim()) continue;
        const [name, commit, upstream] = line.split("|");
        branches.push({ name, commit, upstream: upstream || null });
      }

      // Current branch
      let current = "";
      try { current = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(); } catch {}

      respondJSON(res, 200, { commits, branches, current });
    } catch (e) {
      respondJSON(res, 200, { commits: [], branches: [], current: "", error: e.message });
    }
  },

  // === INTERVENTION ENDPOINTS ===

  "POST /api/tasks/:taskid/advance": async (req, res, params) => {
    // Manually advance a task to the next pipeline stage — with artifact validation
    try {
      const body = await parseJsonBody(req);
      const { targetState } = body;
      const taskId = params.taskid;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      if (!fs.existsSync(taskFile)) { respondError(res, 404, "Task not found"); return; }
      const task = readJSON(taskFile);

      // Guard: check that the required artifact for the current state exists on disk
      const artifactForState = {
        'ARCHITECTED': task.spec_path,
        'CRITIQUED': task.review_path,
        'SYNTHESIZED': task.brief_path,
        'IMPLEMENTING': task.result_path
      };
      const requiredArtifact = artifactForState[task.state];
      if (requiredArtifact) {
        const absPath = path.join(repoRoot, requiredArtifact);
        if (!fs.existsSync(absPath)) {
          respondError(res, 400, `Cannot advance: the artifact for ${task.state} has not been generated yet (${requiredArtifact}). Run the pipeline step first.`);
          return;
        }
      }

      // Guard: don't advance if task is in FAILED state
      if (task.runtime_status === 'FAILED') {
        respondError(res, 400, `Cannot advance: task is in FAILED state (failed at ${task.failed_step || 'unknown step'}). Retry the failed step first.`);
        return;
      }

      if (targetState) task.state = targetState;
      task.updated_at = new Date().toISOString();
      fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
      respondJSON(res, 200, { success: true, task });
    } catch (e) { respondError(res, 500, e.message); }
  },

  "POST /api/tasks/:taskid/edit": async (req, res, params) => {
    // Edit task fields (title, description, executor, lane_type, etc.)
    try {
      const body = await parseJsonBody(req);
      const taskId = params.taskid;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      if (!fs.existsSync(taskFile)) { respondError(res, 404, "Task not found"); return; }
      const task = readJSON(taskFile);
      const editable = ['title', 'executor', 'lane_type', 'state', 'runtime_status', 'branch_name', 'description', 'parent_goal_id'];
      for (const key of editable) {
        if (body[key] !== undefined) task[key] = body[key];
      }
      task.updated_at = new Date().toISOString();
      fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
      respondJSON(res, 200, { success: true, task });
    } catch (e) { respondError(res, 500, e.message); }
  },

  "POST /api/tasks/:taskid/run-step": async (req, res, params) => {
    // Run a single pipeline step for a task — executes synchronously, advances state, optionally chains
    try {
      const body = await parseJsonBody(req);
      const { step, autoAdvance } = body;
      const taskId = params.taskid;
      const validSteps = ['architect', 'critique', 'synthesize', 'execute', 'merge', 'propose-followups', 'pr-draft'];
      if (!validSteps.includes(step)) {
        respondError(res, 400, `Invalid step. Valid: ${validSteps.join(', ')}`);
        return;
      }
      const scriptMap = {
        'architect': 'architect-task-api.mjs',
        'critique': 'critique-task-api.mjs',
        'synthesize': 'synthesize-task-api.mjs',
        'execute': 'execute-task-api.mjs',
        'merge': 'merge-task.mjs',
        'propose-followups': 'propose-followups-api.mjs',
        'pr-draft': 'generate-pr-draft.mjs'
      };
      const stateAfterStep = {
        'architect': 'ARCHITECTED',
        'critique': 'CRITIQUED',
        'synthesize': 'SYNTHESIZED',
        'execute': 'IMPLEMENTING',
        'propose-followups': 'FOLLOWUPS_PROPOSED',
        'pr-draft': 'PR_DRAFTED',
        'merge': 'MERGED'
      };
      const nextStep = {
        'architect': 'critique',
        'critique': 'synthesize',
        'synthesize': 'execute',
        'execute': 'propose-followups',
        'propose-followups': 'pr-draft',
        'pr-draft': 'merge'
      };
      const script = scriptMap[step];
      if (!script) {
        respondError(res, 400, `Step '${step}' cannot be run individually`);
        return;
      }

      // Create git branch if this is the first step
      if (step === 'architect') { createTaskBranch(taskId, _stepRepoRoot); }

      // Capture project context at step start — safe from project switches
      const _stepCtx = captureProjectContext();
      const _stepAutomationRoot = _stepCtx.automationRoot;
      const _stepRepoRoot = _stepCtx.repoRoot;

      // Update runtime_status to running
      const taskFile = path.join(_stepCtx.stateDir, "tasks", `${taskId}.json`);
      if (fs.existsSync(taskFile)) {
        const t = readJSON(taskFile);
        if (t) { t.runtime_status = "running"; t.current_step = step; t.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(t, null, 2)); }
      }

      // Respond immediately to avoid browser timeout, then run in background
      respondJSON(res, 202, { success: true, message: `Step '${step}' started for ${taskId}` });

      // Run step synchronously and chain if autoAdvance
      const runStep = (stepName) => {
        return new Promise((resolve) => {
          const s = scriptMap[stepName];
          if (!s) { resolve({ ok: false, error: `No script for ${stepName}` }); return; }
          console.log(`[PIPELINE] Running ${stepName} for ${taskId}...`);
          exec(`node scripts/${s} ${taskId}`, { cwd: _stepAutomationRoot, timeout: 900000, env: buildChildEnv(_stepCtx) }, (err, stdout, stderr) => {
            if (err) {
              console.error(`[PIPELINE] ${stepName} for ${taskId} FAILED:`, stderr);
              resolve({ ok: false, step: stepName, error: stderr || err.message });
            } else {
              console.log(`[PIPELINE] ${stepName} for ${taskId} OK:`, stdout.trim());
              // Advance state
              try {
                const tf = readJSON(taskFile);
                if (tf && stateAfterStep[stepName]) {
                  tf.state = stateAfterStep[stepName];
                  tf.updated_at = new Date().toISOString();
                  fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
                }
                // Auto-git-commit after successful step (using captured project paths)
                try {
                  const tf2 = readJSON(taskFile);
                  const taskTitle = tf2?.title || taskId;
                  const taskType = (tf2?.lane_type || 'feature-lane').replace('-lane','');
                  const commitMsg = `[${taskId}] [${taskType}] ${stepName}: ${taskTitle}`;
                  execSync(`git add -A && git diff --cached --quiet || git commit -m "${commitMsg.replace(/"/g,'\\"')}"`, { cwd: _stepRepoRoot, stdio: 'pipe', timeout: 10000 });
                  console.log(`[GIT] Auto-committed: ${commitMsg}`);
                } catch (gitErr) { console.warn(`[GIT] Auto-commit skipped:`, gitErr.message?.substring(0,100)); }
              } catch (se) { console.error(`[PIPELINE] State update error:`, se.message); }
              resolve({ ok: true, step: stepName, output: stdout.trim() });
            }
          });
        });
      };

      // Execute current step
      const result = await runStep(step);

      if (!result.ok) {
        // Step failed — write FAILED status with error details
        try {
          const tf = readJSON(taskFile);
          if (tf) {
            tf.runtime_status = "FAILED";
            tf.failed_step = result.step || step;
            tf.last_error = { step: result.step || step, message: (result.error || 'Unknown error').substring(0, 2000), timestamp: new Date().toISOString() };
            tf.current_step = null;
            tf.updated_at = new Date().toISOString();
            fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
          }
        } catch (_) {}
        console.error(`[PIPELINE] ${step} for ${taskId} FAILED. Task marked as FAILED.`);
      } else {
        // If autoAdvance, chain next steps
        if (autoAdvance) {
          let current = step;
          let chainFailed = false;
          while (nextStep[current]) {
            const next = nextStep[current];
            console.log(`[PIPELINE] Auto-advancing to ${next}...`);
            // Update current_step
            try {
              const tf = readJSON(taskFile);
              if (tf) { tf.current_step = next; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
            } catch (_) {}
            const r = await runStep(next);
            if (!r.ok) {
              console.error(`[PIPELINE] Auto-advance stopped at ${next}: ${r.error}`);
              // Write FAILED status for the chained step
              try {
                const tf = readJSON(taskFile);
                if (tf) {
                  tf.runtime_status = "FAILED";
                  tf.failed_step = r.step || next;
                  tf.last_error = { step: r.step || next, message: (r.error || 'Unknown error').substring(0, 2000), timestamp: new Date().toISOString() };
                  tf.current_step = null;
                  tf.updated_at = new Date().toISOString();
                  fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
                }
              } catch (_) {}
              chainFailed = true;
              break;
            }
            current = next;
          }
          if (!chainFailed) {
            // All steps completed — mark as done
            try {
              const tf = readJSON(taskFile);
              if (tf) { tf.runtime_status = "QUEUED"; tf.current_step = null; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
            } catch (_) {}
          }
        } else {
          // Single step completed — mark as done
          try {
            const tf = readJSON(taskFile);
            if (tf) { tf.runtime_status = "QUEUED"; tf.current_step = null; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
          } catch (_) {}
        }
      }

    } catch (e) { respondError(res, 500, e.message); }
  },

  "POST /api/goals/:goalid/edit": async (req, res, params) => {
    try {
      const body = await parseJsonBody(req);
      const goalId = params.goalid;
      const goalFile = path.join(getStateDir(), "goals", `${goalId}.json`);
      if (!fs.existsSync(goalFile)) { respondError(res, 404, "Goal not found"); return; }
      const goal = readJSON(goalFile);
      const editable = ['title', 'description', 'priority', 'state'];
      for (const key of editable) {
        if (body[key] !== undefined) goal[key] = body[key];
      }
      goal.updated_at = new Date().toISOString();
      fs.writeFileSync(goalFile, JSON.stringify(goal, null, 2));
      respondJSON(res, 200, { success: true, goal });
    } catch (e) { respondError(res, 500, e.message); }
  },

  "POST /api/run/step": async (req, res) => {
    // Run a full pipeline step: plan-goal, or run-task with a specific step
    try {
      const body = await parseJsonBody(req);
      const { goalId, taskId, step } = body;
      let cmd = "";
      if (step === "plan-goal" && goalId) {
        cmd = `node scripts/plan-goal-api.mjs ${goalId}`;
      } else if (taskId && step) {
        const scriptMap = {
          'architect': `node scripts/architect-task-api.mjs ${taskId}`,
          'critique': `node scripts/critique-task-api.mjs ${taskId}`,
          'synthesize': `node scripts/synthesize-task-api.mjs ${taskId}`,
          'execute': `node scripts/execute-task-api.mjs ${taskId}`,
          'merge': `node scripts/merge-task.mjs ${taskId}`,
          'propose-followups': `node scripts/propose-followups-api.mjs ${taskId}`,
          'pr-draft': `node scripts/generate-pr-draft.mjs ${taskId}`,
        };
        cmd = scriptMap[step];
      }
      if (!cmd) { respondError(res, 400, "Invalid step/target combination"); return; }

      // Capture context — this exec runs async and must survive project switches
      const _runCtx = captureProjectContext();
      exec(cmd, { cwd: _runCtx.automationRoot }, (err, stdout, stderr) => {
        if (err) console.error(`Run step failed:`, stderr);
        else console.log(`Run step completed:`, stdout.trim());
      });
      respondJSON(res, 202, { success: true, message: `Running: ${cmd}` });
    } catch (e) { respondError(res, 500, e.message); }
  },

  "GET /api/decisions": (req, res) => {
    const dpDir = path.join(getStateDir(), "decision_proposals");
    const decDir = path.join(getStateDir(), "decisions");

    const allProposals = listFilesInDir(dpDir, /\.json$/).map(f => readJSON(path.join(dpDir, f))).filter(Boolean);
    const openProposals = allProposals.filter(p => p.status === "open");
    const resolvedProposals = allProposals.filter(p => p.status === "resolved");
    const decisions = listFilesInDir(decDir, /\.json$/).map(f => readJSON(path.join(decDir, f))).filter(Boolean);

    respondJSON(res, 200, { decision_proposals: openProposals, resolved_proposals: resolvedProposals, decisions });
  },

  // ===== GIT BRANCH & MERGE ENDPOINTS =====

  "POST /api/tasks/:taskid/create-branch": async (req, res, params) => {
    const ok = createTaskBranch(params.taskid);
    respondJSON(res, ok ? 200 : 500, { success: ok, taskId: params.taskid });
  },

  "POST /api/tasks/:taskid/merge": async (req, res, params) => {
    const result = mergeTaskBranch(params.taskid);
    respondJSON(res, result.ok ? 200 : 400, result);
  },

  "POST /api/tasks/merge-batch": async (req, res) => {
    try {
      const body = await parseJsonBody(req);
      const { taskIds } = body;
      if (!taskIds || !taskIds.length) { respondError(res, 400, "Missing taskIds"); return; }
      const results = [];
      for (const tid of taskIds) {
        const r = mergeTaskBranch(tid);
        results.push({ taskId: tid, ...r });
      }
      respondJSON(res, 200, { results });
    } catch (e) { respondError(res, 500, e.message); }
  },

  // ===== CASCADE ENGINE: Auto-spawn follow-ups and run recursively =====

  "POST /api/cascade/run-task": async (req, res) => {
    // Run a task through full pipeline with limits, dedup, and error handling
    try {
      const body = await parseJsonBody(req);
      const { taskId, maxDepth, maxFollowupsPerTask, maxTotalTasks } = body;
      if (!taskId) { respondError(res, 400, "Missing taskId"); return; }

      const cfg = loadCascadeConfig();
      const effectiveDepth = maxDepth ?? cfg.max_depth;
      respondJSON(res, 202, { success: true, message: `Cascade started for ${taskId} (maxDepth=${effectiveDepth}, budget=${maxTotalTasks ?? cfg.max_total_tasks})` });

      // Run in background — delegate to shared cascadeRunTask
      (async () => {
        try {
          // Allow API params to override yaml config
          const ctx = {
            maxDepth: effectiveDepth,
            maxFollowupsPerTask: maxFollowupsPerTask ?? cfg.max_followups_per_task,
            maxTotalTasks: maxTotalTasks ?? cfg.max_total_tasks,
            tasksSpawned: 1,
            errors: []
          };
          await cascadeRunTask(taskId, ctx.maxDepth, 0, ctx);
          if (ctx.errors.length > 0) {
            console.log(`[CASCADE] Completed with ${ctx.errors.length} error(s): ${ctx.errors.map(e => `${e.taskId}/${e.step}`).join(", ")}`);
          }
          console.log(`[CASCADE] Total tasks spawned: ${ctx.tasksSpawned}/${ctx.maxTotalTasks}`);
        } catch (e) {
          console.error(`[CASCADE] Fatal error for ${taskId}:`, e.message);
        }
      })();

    } catch (e) { respondError(res, 500, e.message); }
  },

  "POST /api/cascade/run-goal": async (req, res) => {
    // Decompose a goal into tasks, spawn them all, run them, cascade follow-ups
    try {
      const body = await parseJsonBody(req);
      const { goalId, maxDepth = 3 } = body;
      if (!goalId) { respondError(res, 400, "Missing goalId"); return; }

      respondJSON(res, 202, { success: true, message: `Goal cascade started for ${goalId}` });

      // Capture project context at goal-cascade start — safe from project switches
      const _goalCtx = captureProjectContext();
      const _goalAutomationRoot = _goalCtx.automationRoot;
      const _goalRepoRoot = _goalCtx.repoRoot;
      const _goalStateDir = _goalCtx.stateDir;

      (async () => {
        try {
          console.log(`[CASCADE] Goal ${goalId}: planning...`);

          // Step 1: Plan the goal (decompose into proposals)
          try {
            execSync(`node scripts/plan-goal-api.mjs ${goalId}`, { cwd: _goalAutomationRoot, stdio: 'pipe', timeout: 900000, env: buildChildEnv(_goalCtx) });
            console.log(`[CASCADE] Goal ${goalId}: planning complete`);
          } catch (planErr) {
            console.error(`[CASCADE] Goal plan failed:`, planErr.message?.substring(0,200));
            return;
          }

          // Auto-git-commit goal plan
          try {
            execSync(`git add -A && git diff --cached --quiet || git commit -m "goal: plan ${goalId}"`, { cwd: _goalRepoRoot, stdio: 'pipe', timeout: 10000 });
          } catch (_) {}

          // Step 2: Find all spawnable proposals for this goal
          const proposalsDir = path.join(_goalStateDir, "proposals");
          const goalProposals = listFilesInDir(proposalsDir, /\.json$/)
            .map(f => readJSON(path.join(proposalsDir, f)))
            .filter(p => p && (p.parent_goal_id === goalId || (p.proposal_id && p.proposal_id.startsWith(goalId))));

          console.log(`[CASCADE] Goal ${goalId}: found ${goalProposals.length} proposals`);

          // Step 3: Spawn all proposals as tasks
          const spawnedTaskIds = [];
          for (const proposal of goalProposals) {
            const newId = nextTaskId();
            try {
              execSync(`node scripts/spawn-from-goal-proposal.mjs ${proposal.proposal_id} ${newId}`, { cwd: _goalAutomationRoot, stdio: 'pipe', env: buildChildEnv(_goalCtx) });
              // Link task to goal
              const taskFile = path.join(_goalStateDir, "tasks", `${newId}.json`);
              const task = readJSON(taskFile);
              if (task) {
                task.parent_goal_id = goalId;
                fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
              }
              spawnedTaskIds.push(newId);
              console.log(`[CASCADE] Spawned ${newId} from ${proposal.proposal_id}: "${proposal.title}"`);
            } catch (spawnErr) {
              console.error(`[CASCADE] Failed to spawn ${proposal.proposal_id}:`, spawnErr.message?.substring(0,100));
            }
          }

          // Auto-git-commit spawned tasks
          try {
            execSync(`git add -A && git diff --cached --quiet || git commit -m "goal: spawn ${spawnedTaskIds.length} tasks for ${goalId}"`, { cwd: _goalRepoRoot, stdio: 'pipe', timeout: 10000 });
          } catch (_) {}

          // Update goal state
          const goalFile = path.join(_goalStateDir, "goals", `${goalId}.json`);
          const goal = readJSON(goalFile);
          if (goal) { goal.state = "IN_PROGRESS"; goal.updated_at = new Date().toISOString(); fs.writeFileSync(goalFile, JSON.stringify(goal, null, 2)); }

          // Step 4: Run cascading pipeline on each spawned task (sequentially to avoid resource overload)
          for (const tid of spawnedTaskIds) {
            await cascadeRunTask(tid, maxDepth, 0);
          }

          // Update goal state to DONE if all tasks completed
          const allTasks = spawnedTaskIds.map(id => readJSON(path.join(getStateDir(), "tasks", `${id}.json`)));
          const allDone = allTasks.every(t => t && (t.state === 'PR_DRAFTED' || t.state === 'MERGED'));
          if (allDone && goal) {
            goal.state = "DONE";
            goal.updated_at = new Date().toISOString();
            fs.writeFileSync(goalFile, JSON.stringify(goal, null, 2));
          }

          console.log(`[CASCADE] Goal ${goalId}: cascade complete. ${spawnedTaskIds.length} tasks processed.`);
        } catch (e) {
          console.error(`[CASCADE] Goal cascade fatal:`, e.message);
        }
      })();

    } catch (e) { respondError(res, 500, e.message); }
  },

  // ===== SETTINGS =====

  "GET /api/settings/llm-mode": (req, res) => {
    respondJSON(res, 200, { mode: process.env.LLM_MODE || "mock" });
  },

  "POST /api/settings/llm-mode": async (req, res) => {
    try {
      const body = await parseJsonBody(req);
      const { mode } = body;
      if (!["app", "api", "mock", "cli"].includes(mode)) {
        respondError(res, 400, `Invalid mode. Valid: app, api, mock, cli`);
        return;
      }
      process.env.LLM_MODE = mode;
      console.log(`[SETTINGS] LLM_MODE changed to: ${mode}`);

      // Persist to .env file
      const envPath = path.join(automationRoot, ".env");
      try {
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
        if (/^LLM_MODE=.*/m.test(envContent)) {
          envContent = envContent.replace(/^LLM_MODE=.*/m, `LLM_MODE=${mode}`);
        } else {
          envContent += `\nLLM_MODE=${mode}\n`;
        }
        fs.writeFileSync(envPath, envContent);
        console.log(`[SETTINGS] Persisted LLM_MODE=${mode} to .env`);
      } catch (e) {
        console.warn(`[SETTINGS] Could not persist to .env: ${e.message}`);
      }

      respondJSON(res, 200, { success: true, mode });
    } catch (e) { respondError(res, 500, e.message); }
  },

  "GET /api/cascade/status": (req, res) => {
    const tasksDir = path.join(getStateDir(), "tasks");
    const tasks = listFilesInDir(tasksDir, /^T-\d+\.json$/).map(f => readJSON(path.join(tasksDir, f))).filter(Boolean);
    const running = tasks.filter(t => t.runtime_status === 'running');
    const failed = tasks.filter(t => t.runtime_status === 'FAILED');
    const queued = tasks.filter(t => t.state === 'NEW');
    const completed = tasks.filter(t => t.state === 'PR_DRAFTED' || t.state === 'MERGED');
    const proposalsDir = path.join(getStateDir(), "proposals");
    const pendingProposals = listFilesInDir(proposalsDir, /\.json$/)
      .map(f => readJSON(path.join(proposalsDir, f)))
      .filter(p => p && p.should_spawn_now === true);

    respondJSON(res, 200, {
      running: running.map(t => ({ id: t.task_id, step: t.current_step })),
      failed: failed.map(t => ({ id: t.task_id, step: t.failed_step, error: t.last_error?.message?.substring(0, 100) })),
      queued: queued.length,
      completed: completed.length,
      total: tasks.length,
      pending_auto_spawns: pendingProposals.length,
      cascade_config: loadCascadeConfig()
    });
  },

  // ===== PROPOSALS: List & Manual Spawn =====

  "GET /api/proposals": (req, res) => {
    const proposalsDir = path.join(getStateDir(), "proposals");
    const all = listFilesInDir(proposalsDir, /\.json$/)
      .map(f => readJSON(path.join(proposalsDir, f)))
      .filter(Boolean);

    // Optional filter by parent_task_id via query param
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parentId = url.searchParams.get("parent");
    const filtered = parentId ? all.filter(p => p.parent_task_id === parentId) : all;

    // Enrich: check if already spawned (a task with matching parent_task_id + similar title exists)
    const tasksDir = path.join(getStateDir(), "tasks");
    const existingTasks = listFilesInDir(tasksDir, /\.json$/)
      .map(f => readJSON(path.join(tasksDir, f)))
      .filter(Boolean);

    const enriched = filtered.map(p => {
      const spawned = existingTasks.find(t =>
        t.parent_task_id === p.parent_task_id &&
        t.title && p.title &&
        t.title.toLowerCase().includes(p.title.toLowerCase().substring(0, 30))
      );
      return { ...p, spawned_as: spawned ? spawned.task_id : null };
    });

    respondJSON(res, 200, { proposals: enriched });
  },

  "POST /api/proposals/:id/spawn": async (req, res, params) => {
    try {
      const proposalId = params.id;
      const proposalsDir = path.join(getStateDir(), "proposals");
      const proposalFile = path.join(proposalsDir, `${proposalId}.json`);
      const proposal = readJSON(proposalFile);
      if (!proposal) { respondError(res, 404, `Proposal ${proposalId} not found`); return; }

      // Dedup check: prevent spawning if a task with a very similar title already exists
      const tasksDir = path.join(getStateDir(), "tasks");
      const existingTasks = listFilesInDir(tasksDir, /\.json$/)
        .map(f => readJSON(path.join(tasksDir, f)))
        .filter(Boolean);
      const dupResult = isDuplicate(
        proposal.title,
        proposal.smallest_safe_scope || proposal.rationale || '',
        proposal.written_files || [],
        existingTasks
      );
      if (dupResult) {
        respondJSON(res, 409, {
          success: false,
          error: `Duplicate detected: "${proposal.title}" overlaps with ${dupResult.taskId} (${dupResult.reason}). Not spawning.`,
          duplicate_of: dupResult.taskId
        });
        return;
      }

      // Generate next task ID
      const newId = nextTaskId();

      // Use the existing spawn script
      try {
        execSync(`node scripts/spawn-followup-task.mjs ${proposalId} ${newId}`, {
          cwd: automationRoot,
          stdio: 'pipe',
          timeout: 15000
        });
      } catch (spawnErr) {
        respondError(res, 500, `Spawn failed: ${spawnErr.message?.substring(0, 200)}`);
        return;
      }

      respondJSON(res, 201, {
        success: true,
        task_id: newId,
        proposal_id: proposalId,
        title: proposal.title,
        message: `Spawned task ${newId} from proposal ${proposalId}`
      });
    } catch (e) { respondError(res, 500, e.message); }
  },

  // Phase 11C: Retry from failed step
  "POST /api/tasks/:id/diagnose": async (req, res, params) => {
    try {
      const taskId = params.id;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      const task = readJSON(taskFile);
      if (!task) { respondError(res, 404, `Task ${taskId} not found`); return; }
      if (!task.last_error) {
        respondError(res, 400, `Task ${taskId} has no error to diagnose`); return;
      }
      const stepName = task.last_error.step || task.failed_step || "unknown";
      const errMsg = task.last_error.message || "Unknown error";
      const diagnosis = await diagnoseStepError(taskId, stepName, errMsg);
      // Write diagnosis to task
      const tf = readJSON(taskFile);
      if (tf && tf.last_error) {
        tf.last_error.diagnosis = diagnosis;
        tf.updated_at = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
      }
      respondJSON(res, 200, { ok: true, taskId, diagnosis });
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "POST /api/tasks/:id/generate-fix": async (req, res, params) => {
    try {
      const taskId = params.id;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      const task = readJSON(taskFile);
      if (!task) { respondError(res, 404, `Task ${taskId} not found`); return; }
      if (!task.last_error) {
        respondError(res, 400, `Task ${taskId} has no error to fix`); return;
      }
      const stepName = task.last_error.step || task.failed_step || "unknown";
      const errMsg = task.last_error.message || "Unknown error";
      const fixProposal = await generateStepFix(taskId, stepName, errMsg);
      if (!fixProposal) {
        respondError(res, 500, "Fix generation failed or returned empty"); return;
      }
      // Store reference in task
      const tf = readJSON(taskFile);
      if (tf) {
        tf.last_error.proposed_fix_id = fixProposal.id;
        tf.updated_at = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
      }
      respondJSON(res, 200, { ok: true, taskId, fix: fixProposal });
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "POST /api/tasks/:id/apply-fix": async (req, res, params) => {
    try {
      const taskId = params.id;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      const task = readJSON(taskFile);
      if (!task) { respondError(res, 404, `Task ${taskId} not found`); return; }
      const fixId = task.last_error?.proposed_fix_id;
      if (!fixId) {
        respondError(res, 400, `No proposed fix for ${taskId}. Generate one first.`); return;
      }
      const fixFile = path.join(getStateDir(), "fixes", `${fixId}.json`);
      const fix = readJSON(fixFile);
      if (!fix || fix.status !== "pending") {
        respondError(res, 400, `Fix ${fixId} not found or already ${fix?.status}`); return;
      }

      // Apply fix using Claude CLI (safer than manual patch parsing)
      const applyPrompt = `You are applying a pre-approved code fix to a repository.

Here is the fix to apply:
${fix.content}

INSTRUCTIONS:
1. Read the files mentioned in the fix
2. Apply ONLY the changes described above
3. Do NOT add any extra changes or refactoring
4. Output a summary of what you changed

Apply the fix now.`;

      const tmpDir = path.join(getStateDir(), "tmp");
      fs.mkdirSync(tmpDir, { recursive: true });
      const applyFile = path.join(tmpDir, `apply-${fixId}.md`);
      fs.writeFileSync(applyFile, applyPrompt);

      // Capture context — this handler is async and must survive project switches
      const _fixCtx = captureProjectContext();
      const model = process.env.CLAUDE_MODEL || "sonnet";
      // Tool-enabled: Claude can Read/Edit files directly to apply the fix
      const cmd = `cat "${applyFile}" | claude --print --model "${model}" --output-format json --allowed-tools "Read,Edit,Write,Glob,Grep,Bash(git:*)" --permission-mode acceptEdits --max-budget-usd 1.00`;
      const { stdout } = await execAsync(cmd, {
        cwd: _fixCtx.repoRoot,
        timeout: 180000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env }
      });
      try { fs.unlinkSync(applyFile); } catch (_) {}

      // Parse JSON output (tool mode) or use raw text
      let applyOutput = (stdout || "").trim();
      try {
        const jsonResult = JSON.parse(applyOutput);
        applyOutput = jsonResult.result || applyOutput;
      } catch (_) { /* plain text output, use as-is */ }

      // Mark fix as applied
      fix.status = "applied";
      fix.applied_at = new Date().toISOString();
      fix.apply_output = applyOutput.substring(0, 2000);
      fs.writeFileSync(fixFile, JSON.stringify(fix, null, 2));

      // Git commit the fix (using captured context)
      try {
        const commitMsg = `[${taskId}] auto-fix: ${fix.content.match(/## Summary\n(.+)/)?.[1] || 'applied auto-fix'}`;
        await execAsync(`git add -A && git diff --cached --quiet || git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, {
          cwd: _fixCtx.repoRoot, timeout: 15000
        });
      } catch (_) {}

      // Update task — clear error, set to retryable state
      const tf = readJSON(taskFile);
      if (tf) {
        tf.last_error.fix_applied = true;
        tf.last_error.fix_applied_at = new Date().toISOString();
        tf.updated_at = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
      }

      // Auto-restart: schedule a graceful server restart after response is sent
      const shouldRestart = fix.content.includes("restart server") || fix.content.includes("serve-dashboard");

      respondJSON(res, 200, {
        ok: true, taskId, fixId,
        apply_output: fix.apply_output,
        needs_restart: shouldRestart,
        message: shouldRestart
          ? "Fix applied and committed. Server restart recommended — restarting in 2s..."
          : "Fix applied and committed. You can now retry the failed step."
      });

      // Trigger restart if needed (after response sent)
      if (shouldRestart) {
        setTimeout(() => {
          console.log("[AUTO-FIX] Restarting server after fix applied...");
          process.exit(0); // Assumes process manager (nodemon/pm2) will restart
        }, 2000);
      }
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "POST /api/tasks/:id/reject-fix": async (req, res, params) => {
    try {
      const taskId = params.id;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      const task = readJSON(taskFile);
      if (!task) { respondError(res, 404, `Task ${taskId} not found`); return; }
      const fixId = task.last_error?.proposed_fix_id;
      if (!fixId) { respondError(res, 400, `No proposed fix for ${taskId}`); return; }
      const fixFile = path.join(getStateDir(), "fixes", `${fixId}.json`);
      const fix = readJSON(fixFile);
      if (fix) {
        fix.status = "rejected";
        fix.rejected_at = new Date().toISOString();
        fs.writeFileSync(fixFile, JSON.stringify(fix, null, 2));
      }
      // Clear reference from task
      const tf = readJSON(taskFile);
      if (tf && tf.last_error) {
        delete tf.last_error.proposed_fix_id;
        tf.updated_at = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
      }
      respondJSON(res, 200, { ok: true, taskId, fixId, message: "Fix rejected." });
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "GET /api/tasks/:id/fix": async (req, res, params) => {
    try {
      const taskId = params.id;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      const task = readJSON(taskFile);
      if (!task) { respondError(res, 404, `Task ${taskId} not found`); return; }
      const fixId = task.last_error?.proposed_fix_id;
      if (!fixId) { respondJSON(res, 200, { ok: true, fix: null }); return; }
      const fixFile = path.join(getStateDir(), "fixes", `${fixId}.json`);
      const fix = readJSON(fixFile);
      respondJSON(res, 200, { ok: true, fix: fix || null });
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "POST /api/tasks/:id/guardrail-decision": async (req, res, params) => {
    try {
      const taskId = params.id;
      const body = await parseJsonBody(req);
      const { action, proposalId } = body; // action: accept | restore | test
      if (!action || !['accept', 'restore', 'test'].includes(action)) {
        respondError(res, 400, `Invalid action: ${action}. Must be accept, restore, or test.`); return;
      }
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      const task = readJSON(taskFile);
      if (!task) { respondError(res, 404, `Task ${taskId} not found`); return; }

      // Resolve the proposal if provided
      if (proposalId) {
        const propFile = path.join(getStateDir(), "proposals", `${proposalId}.json`);
        const prop = readJSON(propFile);
        if (prop) {
          prop.status = "resolved";
          prop.resolution = action;
          prop.resolved_at = new Date().toISOString();
          fs.writeFileSync(propFile, JSON.stringify(prop, null, 2));
        }
      }

      if (action === 'accept') {
        // Accept changes — continue to merge
        task.state = 'IMPLEMENTED';
        task.runtime_status = 'IDLE';
        task.guardrail_result.user_decision = 'accepted';
        task.updated_at = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
        respondJSON(res, 200, { ok: true, taskId, action, message: 'Changes accepted. Task ready for merge — retry to continue pipeline.' });
      } else if (action === 'restore') {
        // Restore snapshot and fail the task
        const snapshotFile = task.snapshot_path
          ? path.join(repoRoot, task.snapshot_path)
          : path.join(getStateDir(), 'snapshots', `${taskId}-snapshot.json`);
        let restoredCount = 0;
        try {
          const snap = readJSON(snapshotFile);
          if (snap) {
            for (const [filePath, data] of Object.entries(snap)) {
              if (data.content) {
                fs.writeFileSync(path.join(repoRoot, filePath), data.content, 'utf8');
                restoredCount++;
              }
            }
          }
        } catch (restoreErr) {
          console.error(`[GUARDRAIL] Restore failed:`, restoreErr.message);
        }
        task.state = 'SYNTHESIZED'; // Reset to pre-execute state so retry re-runs execute
        task.runtime_status = 'FAILED';
        task.failed_step = 'execute';
        task.guardrail_result.user_decision = 'restored';
        task.last_error = { step: 'execute', message: `User chose to restore snapshot (${restoredCount} files restored)`, timestamp: new Date().toISOString() };
        task.updated_at = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
        respondJSON(res, 200, { ok: true, taskId, action, restoredCount, message: `Snapshot restored (${restoredCount} files). Task set to FAILED — retry to re-execute.` });
      } else if (action === 'test') {
        // Run Cowork test — launch async, respond immediately
        task.state = 'COWORK_TESTING';
        task.runtime_status = 'running';
        task.current_step = 'cowork-test';
        task.guardrail_result.user_decision = 'test_requested';
        task.updated_at = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
        respondJSON(res, 200, { ok: true, taskId, action, message: 'Cowork test launched. Check dashboard for results.' });

        // Fire-and-forget: run cowork-test.mjs in background (captured context)
        const _testCtx = captureProjectContext();
        execAsync(`node scripts/cowork-test.mjs ${taskId}`, { cwd: _testCtx.automationRoot, timeout: 300000, maxBuffer: 10 * 1024 * 1024 })
          .then(() => {
            console.log(`[GUARDRAIL-DECISION] Cowork test completed for ${taskId}`);
            const tfDone = readJSON(taskFile);
            if (tfDone) {
              if (tfDone.state === 'TEST_FAILED') {
                tfDone.runtime_status = 'FAILED';
              } else {
                tfDone.runtime_status = 'IDLE';
              }
              tfDone.updated_at = new Date().toISOString();
              fs.writeFileSync(taskFile, JSON.stringify(tfDone, null, 2));
            }
          })
          .catch(err => {
            console.error(`[GUARDRAIL-DECISION] Cowork test error for ${taskId}:`, err.message?.substring(0, 500));
            const tfErr = readJSON(taskFile);
            if (tfErr) {
              tfErr.state = 'TEST_FAILED';
              tfErr.failed_step = 'cowork-test';
              tfErr.runtime_status = 'FAILED';
              tfErr.last_error = { step: 'cowork-test', message: err.message?.substring(0, 2000), timestamp: new Date().toISOString() };
              tfErr.updated_at = new Date().toISOString();
              fs.writeFileSync(taskFile, JSON.stringify(tfErr, null, 2));
            }
          });
      }
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "POST /api/tasks/:id/cancel": async (req, res, params) => {
    try {
      const taskId = params.id;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      const task = readJSON(taskFile);
      if (!task) { respondError(res, 404, `Task ${taskId} not found`); return; }

      const wasRunning = task.runtime_status === "running";
      const previousStep = task.current_step || "unknown";

      // Set task to FAILED with cancel reason
      task.runtime_status = "FAILED";
      task.failed_step = task.current_step || task.failed_step || "cancelled";
      task.last_error = {
        step: previousStep,
        message: `Task cancelled by user at step '${previousStep}'`,
        timestamp: new Date().toISOString()
      };
      task.updated_at = new Date().toISOString();
      fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

      // Try to kill any running child processes for this task
      if (wasRunning) {
        try {
          const { execSync } = await import("node:child_process");
          // Find and kill claude --print processes that match this task's prompt file
          const promptFile = `cli-prompt-${taskId}`;
          const pids = execSync(`ps aux | grep "${promptFile}" | grep -v grep | awk '{print $2}'`, { encoding: 'utf8', timeout: 5000 }).trim();
          if (pids) {
            for (const pid of pids.split('\n').filter(Boolean)) {
              try { process.kill(parseInt(pid), 'SIGTERM'); } catch (_) {}
            }
            console.log(`[CANCEL] ${taskId}: killed ${pids.split('\n').length} processes`);
          }
        } catch (_) {
          // Process kill is best-effort
        }
      }

      console.log(`[CANCEL] ${taskId}: cancelled at step '${previousStep}' (was ${wasRunning ? 'running' : 'idle'})`);
      respondJSON(res, 200, { ok: true, taskId, message: `Task ${taskId} cancelled at step '${previousStep}'`, wasRunning });
    } catch (e) {
      respondError(res, 500, e.message);
    }
  },

  "POST /api/tasks/:id/retry": async (req, res, params) => {
    try {
      const taskId = params.id;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      const task = readJSON(taskFile);
      if (!task) { respondError(res, 404, `Task ${taskId} not found`); return; }
      if (task.runtime_status !== "FAILED") {
        respondError(res, 400, `Task ${taskId} is not in FAILED state (runtime_status=${task.runtime_status})`); return;
      }

      // Derive the correct step to retry from — use deriveFailedStep for robustness
      const steps = ['architect', 'critique', 'synthesize', 'execute', 'propose-followups', 'pr-draft', 'merge'];
      let failedStep = task.failed_step;
      if (!failedStep || !steps.includes(failedStep)) {
        failedStep = deriveFailedStep(task);
        console.log(`[RETRY] ${taskId}: failed_step was '${task.failed_step}', derived '${failedStep}' from state '${task.state}'`);
      }

      const startIdx = steps.indexOf(failedStep);
      if (startIdx < 0) {
        respondError(res, 400, `Cannot determine which step to retry for ${taskId} (state=${task.state}, failed_step=${task.failed_step})`);
        return;
      }

      // Clear error, set running
      task.runtime_status = "running";
      task.last_error = null;
      task.failed_step = null;
      task.updated_at = new Date().toISOString();
      fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

      respondJSON(res, 202, { success: true, message: `Retrying ${taskId} from step '${failedStep}'` });

      // Run cascade from the failed step onward (in background)
      // Capture project context at retry start — safe from project switches
      const _retryCtx = captureProjectContext();
      const _retryAutomationRoot = _retryCtx.automationRoot;
      const _retryStateDir = _retryCtx.stateDir;
      (async () => {
        const scriptMap = {
          'architect': 'architect-task-api.mjs', 'critique': 'critique-task-api.mjs',
          'synthesize': 'synthesize-task-api.mjs', 'execute': 'execute-task-api.mjs',
          'merge': 'merge-task.mjs', 'propose-followups': 'propose-followups-api.mjs',
          'pr-draft': 'generate-pr-draft.mjs'
        };
        const stateAfterStep = {
          'architect': 'ARCHITECTED', 'critique': 'CRITIQUED', 'synthesize': 'SYNTHESIZED',
          'execute': 'IMPLEMENTING', 'propose-followups': 'FOLLOWUPS_PROPOSED',
          'pr-draft': 'PR_DRAFTED', 'merge': 'MERGED'
        };

        for (let i = startIdx; i < steps.length; i++) {
          const stepName = steps[i];
          console.log(`[RETRY] ${taskId}: ${stepName}...`);
          // Update current_step for UI tracking
          try {
            const tfc = readJSON(taskFile);
            if (tfc) { tfc.current_step = stepName; tfc.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tfc, null, 2)); }
          } catch (_) {}
          try {
            await execAsync(`node scripts/${scriptMap[stepName]} ${taskId}`, { cwd: _retryAutomationRoot, timeout: 1800000, maxBuffer: 10 * 1024 * 1024, env: buildChildEnv(_retryCtx) });
            const tf = readJSON(taskFile);
            if (tf && stateAfterStep[stepName]) {
              tf.state = stateAfterStep[stepName]; tf.current_step = stepName;
              tf.last_error = null; tf.failed_step = null;
              tf.updated_at = new Date().toISOString();
              fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
            }
            // Check guardrail after execute step — same as main cascade
            if (stepName === 'execute') {
              const tfg = readJSON(taskFile);
              const guardrail = tfg?.guardrail_result;
              if (guardrail && guardrail.level !== 'green') {
                console.log(`[RETRY] ${taskId}: guardrail=${guardrail.level.toUpperCase()} after execute`);
                if (guardrail.level === 'red') {
                  console.log(`[RETRY] ${taskId}: 🔴 RED — pausing for user decision`);
                  tfg.state = 'BLOCKED_ON_DECISION';
                  tfg.runtime_status = 'IDLE';
                  tfg.current_step = 'guardrail-review';
                  tfg.updated_at = new Date().toISOString();
                  fs.writeFileSync(taskFile, JSON.stringify(tfg, null, 2));
                  return; // Stop retry cascade — user must decide
                } else if (guardrail.level === 'yellow') {
                  console.log(`[RETRY] ${taskId}: ⚠️  YELLOW — routing to Cowork test`);
                  tfg.state = 'COWORK_TESTING';
                  tfg.runtime_status = 'IDLE';
                  tfg.updated_at = new Date().toISOString();
                  fs.writeFileSync(taskFile, JSON.stringify(tfg, null, 2));
                  // Continue to merge after yellow (Cowork test is async)
                }
              }
            }
          } catch (stepErr) {
            // Combine stderr + message + signal for maximum diagnostic info
            const parts = [stepErr.stderr, stepErr.stdout, stepErr.message].filter(Boolean);
            const raw = parts.join("\n---\n").trim();
            const signal = stepErr.killed ? ` [KILLED signal=${stepErr.signal || 'SIGTERM'} — likely timeout]` : "";
            const errMsg = (raw + signal || "Unknown error").substring(0, 2000);
            console.error(`[RETRY] ${taskId}: ${stepName} FAILED again:`, errMsg.substring(0, 500));
            const tf = readJSON(taskFile);
            if (tf) {
              tf.runtime_status = "FAILED"; tf.failed_step = stepName;
              tf.last_error = { step: stepName, message: errMsg, timestamp: new Date().toISOString() };
              tf.updated_at = new Date().toISOString();
              fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
            }
            // Auto-diagnosis on retry failure
            try {
              const diagnosis = await diagnoseStepError(taskId, stepName, errMsg);
              const tf2 = readJSON(taskFile);
              if (tf2 && tf2.last_error) {
                tf2.last_error.diagnosis = diagnosis;
                tf2.updated_at = new Date().toISOString();
                fs.writeFileSync(taskFile, JSON.stringify(tf2, null, 2));
              }
            } catch (_diagErr) {
              console.error(`[RETRY] Diagnosis failed for ${taskId}:`, _diagErr.message?.substring(0, 100));
            }
            return;
          }
        }
        // Success
        const tf = readJSON(taskFile);
        if (tf) { tf.runtime_status = "IDLE"; tf.current_step = null; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
        console.log(`[RETRY] ${taskId}: retry complete → ${readJSON(taskFile)?.state}`);

        // Spawn follow-ups (same logic as cascadeRunTask — prevents missed follow-ups on retry)
        try {
          const proposalsDir = path.join(_retryStateDir, "proposals");
          if (fs.existsSync(proposalsDir)) {
            const allProposals = listFilesInDir(proposalsDir, /\.json$/)
              .map(f => readJSON(path.join(proposalsDir, f)))
              .filter(p => p && p.parent_task_id === taskId && p.should_spawn_now === true);

            if (allProposals.length > 0) {
              const cfg = loadCascadeConfig();
              const tasksDir2 = path.join(_retryStateDir, "tasks");
              const existingTasks = listFilesInDir(tasksDir2, /^T-\d+\.json$/)
                .map(f => readJSON(path.join(tasksDir2, f))).filter(Boolean);

              let spawnable = allProposals.filter(p => !isDuplicateTitle(p.title, existingTasks));
              spawnable = spawnable.slice(0, cfg.max_followups_per_task);

              for (const proposal of spawnable) {
                const newId = nextTaskId();
                try {
                  execSync(`node scripts/spawn-followup-task.mjs ${proposal.proposal_id} ${newId}`, {
                    cwd: _retryAutomationRoot, stdio: 'pipe', timeout: 15000
                  });
                  console.log(`[RETRY] Spawned follow-up ${newId} from ${proposal.proposal_id}`);
                } catch (spawnErr) {
                  console.error(`[RETRY] Spawn failed for ${proposal.proposal_id}:`, spawnErr.message?.substring(0, 100));
                }
              }
            }
          }
        } catch (fErr) {
          console.error(`[RETRY] Follow-up spawn error:`, fErr.message);
        }
      })();
    } catch (e) { respondError(res, 500, e.message); }
  },

  // Phase 11D: Error log per task
  "GET /api/tasks/:id/errors": (req, res, params) => {
    const errLogFile = path.join(getStateDir(), "tasks", `${params.id}.errors.json`);
    const errors = readJSON(errLogFile) || [];
    respondJSON(res, 200, { taskId: params.id, errors });
  },

  // Phase 3: Cowork Tests — list all test results
  "GET /api/cowork-tests": (req, res) => {
    const tests = [];
    // 1. Collect from tasks that have test_result
    const tasksDir = path.join(getStateDir(), "tasks");
    if (fs.existsSync(tasksDir)) {
      for (const f of fs.readdirSync(tasksDir).filter(f => f.endsWith('.json') && !f.includes('errors'))) {
        const t = readJSON(path.join(tasksDir, f));
        if (t && t.test_result) {
          tests.push({
            task_id: t.task_id,
            title: t.title || t.task_id,
            state: t.state,
            lane_type: t.lane_type,
            result: t.test_result.result,
            summary: t.test_result.summary,
            checks: t.test_result.checks || [],
            regressions: t.test_result.regressions || [],
            created_bugs: t.test_result.created_bugs || [],
            tested_at: t.test_result.tested_at || t.updated_at,
            prompt_file: `CT-${t.task_id}.prompt.md`,
            result_file: `CT-${t.task_id}.result.json`
          });
        }
      }
    }
    // 2. Also check cowork-tests/ dir for result files not yet in tasks
    const ctDir = path.join(getStateDir(), "cowork-tests");
    if (fs.existsSync(ctDir)) {
      for (const f of fs.readdirSync(ctDir).filter(f => f.endsWith('.result.json'))) {
        const taskId = f.replace('CT-', '').replace('.result.json', '');
        if (!tests.find(t => t.task_id === taskId)) {
          const r = readJSON(path.join(ctDir, f));
          if (r) {
            tests.push({
              task_id: taskId,
              title: taskId,
              state: 'unknown',
              result: r.result,
              summary: r.summary,
              checks: r.checks || [],
              regressions: r.regressions || [],
              created_bugs: r.created_bugs || [],
              tested_at: r.tested_at,
              prompt_file: `CT-${taskId}.prompt.md`,
              result_file: f
            });
          }
        }
      }
    }
    // Sort newest first
    tests.sort((a, b) => new Date(b.tested_at || 0) - new Date(a.tested_at || 0));
    respondJSON(res, 200, { tests });
  }
};

// ===== GIT BRANCH HELPERS =====

function createTaskBranch(taskId, _repoRootOverride) {
  const _repo = _repoRootOverride || repoRoot;
  const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
  const task = readJSON(taskFile);
  if (!task || !task.branch_name) return false;
  try {
    // Check if branch already exists
    const existing = execSync(`git branch --list "${task.branch_name}"`, { cwd: _repo, encoding: 'utf8' }).trim();
    if (existing) { console.log(`[GIT] Branch ${task.branch_name} already exists`); return true; }
    // Create branch from current HEAD
    execSync(`git branch "${task.branch_name}"`, { cwd: _repo, stdio: 'pipe' });
    console.log(`[GIT] Created branch: ${task.branch_name}`);
    return true;
  } catch (e) {
    console.warn(`[GIT] Branch creation failed for ${taskId}:`, e.message?.substring(0, 100));
    return false;
  }
}

function mergeTaskBranch(taskId, _repoRootOverride) {
  const _repo = _repoRootOverride || repoRoot;
  const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
  const task = readJSON(taskFile);
  if (!task || !task.branch_name) return { ok: false, error: 'No branch_name' };
  try {
    const currentBranch = execSync('git branch --show-current', { cwd: _repo, encoding: 'utf8' }).trim();
    // Only merge if we're on main
    if (currentBranch !== 'main') {
      return { ok: false, error: `Not on main (currently on ${currentBranch})` };
    }
    // Check branch exists
    const exists = execSync(`git branch --list "${task.branch_name}"`, { cwd: _repo, encoding: 'utf8' }).trim();
    if (!exists) return { ok: false, error: `Branch ${task.branch_name} does not exist` };
    // Merge with --no-ff for clear history
    const mergeMsg = `merge: ${taskId} — ${task.title || taskId}`;
    execSync(`git merge --no-ff "${task.branch_name}" -m "${mergeMsg.replace(/"/g, '\\"')}"`, { cwd: _repo, stdio: 'pipe' });
    // Update task state
    task.state = 'MERGED';
    task.updated_at = new Date().toISOString();
    fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
    // Optionally delete the branch
    try { execSync(`git branch -d "${task.branch_name}"`, { cwd: _repo, stdio: 'pipe' }); } catch (_) {}
    console.log(`[GIT] Merged ${task.branch_name} → main`);
    return { ok: true };
  } catch (e) {
    console.warn(`[GIT] Merge failed for ${taskId}:`, e.message?.substring(0, 150));
    return { ok: false, error: e.message?.substring(0, 150) };
  }
}

// ===== CASCADE HELPERS =====

// Atomic counter file for task IDs — prevents BUG-013 (duplicate IDs on concurrent creation)
const TASK_COUNTER_FILE = () => path.join(getStateDir(), ".task-counter");

function nextTaskId() {
  const tasksDir = path.join(getStateDir(), "tasks");
  fs.mkdirSync(tasksDir, { recursive: true });

  // Try atomic counter file first (fast path)
  const counterFile = TASK_COUNTER_FILE();
  let nextNum;
  try {
    // Read current counter, increment atomically via rename
    const lockFile = counterFile + ".lock";
    const maxRetries = 10;
    let locked = false;
    for (let i = 0; i < maxRetries; i++) {
      try {
        // O_EXCL ensures only one process creates the lock file
        fs.writeFileSync(lockFile, String(process.pid), { flag: 'wx' });
        locked = true;
        break;
      } catch (e) {
        if (e.code === 'EEXIST') {
          // Check for stale lock (older than 5 seconds)
          try {
            const stat = fs.statSync(lockFile);
            if (Date.now() - stat.mtimeMs > 5000) {
              fs.unlinkSync(lockFile);
              continue;
            }
          } catch (_) {}
          // Wait 50ms and retry
          const start = Date.now();
          while (Date.now() - start < 50) { /* spin */ }
          continue;
        }
        throw e;
      }
    }
    if (!locked) {
      // Fallback to scan-based approach if lock acquisition fails
      throw new Error("Could not acquire lock");
    }

    try {
      let currentMax = 0;
      if (fs.existsSync(counterFile)) {
        currentMax = parseInt(fs.readFileSync(counterFile, "utf8").trim(), 10) || 0;
      }
      // Also scan directory in case counter is stale
      const existing = fs.readdirSync(tasksDir).filter(f => /^T-\d+\.json$/.test(f));
      for (const f of existing) {
        const m = f.match(/T-(\d+)\.json$/);
        if (m) currentMax = Math.max(currentMax, parseInt(m[1], 10));
      }
      // Also check archived
      const archivedDir = path.join(tasksDir, "archived");
      if (fs.existsSync(archivedDir)) {
        const archived = fs.readdirSync(archivedDir).filter(f => /^T-\d+\.json$/.test(f));
        for (const f of archived) {
          const m = f.match(/T-(\d+)\.json$/);
          if (m) currentMax = Math.max(currentMax, parseInt(m[1], 10));
        }
      }

      nextNum = currentMax + 1;
      fs.writeFileSync(counterFile, String(nextNum));
    } finally {
      try { fs.unlinkSync(lockFile); } catch (_) {}
    }
  } catch (_) {
    // Fallback: scan-based (original logic)
    const existing = fs.readdirSync(tasksDir).filter(f => /^T-\d+\.json$/.test(f));
    let maxNum = 0;
    for (const f of existing) {
      const m = f.match(/T-(\d+)\.json$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    nextNum = maxNum + 1;
    while (fs.existsSync(path.join(tasksDir, `T-${String(nextNum).padStart(4, '0')}.json`))) {
      nextNum++;
    }
  }
  return `T-${String(nextNum).padStart(4, '0')}`;
}

// ===== GEMINI API FALLBACK FOR DIAGNOSIS/FIX =====
async function callGeminiDirect(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) throw new Error("No GEMINI_API_KEY available");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-04-17";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 4096 } });
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${JSON.stringify(data).substring(0, 300)}`);
  return (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

let _claudeCliAvailable = null;
function hasClaudeCLI() {
  // Cache the result — CLI auth status doesn't change during server lifetime
  if (_claudeCliAvailable !== null) return _claudeCliAvailable;
  // Check 1: API key set explicitly
  const key = process.env.ANTHROPIC_API_KEY;
  if (key && key.trim()) { _claudeCliAvailable = true; return true; }
  // Check 2: OAuth/session login (claude auth status)
  try {
    const result = execSync('claude auth status 2>&1', { timeout: 5000, stdio: 'pipe' }).toString();
    const parsed = JSON.parse(result);
    if (parsed.loggedIn) { _claudeCliAvailable = true; return true; }
  } catch (_) {}
  _claudeCliAvailable = false;
  return false;
}

// ===== AUTO-DIAGNOSIS: Claude CLI / Gemini API error analysis =====
async function diagnoseStepError(taskId, stepName, errMsg) {
  try {
    const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
    const task = readJSON(taskFile);
    if (!task) return "(task not found for diagnosis)";

    // Build context for Claude
    const contextParts = [`Task: ${taskId} — ${task.title || "(untitled)"}`];
    contextParts.push(`Step: ${stepName}`);
    contextParts.push(`Lane: ${task.lane_type || "unknown"}`);
    contextParts.push(`State before failure: ${task.state || "unknown"}`);
    contextParts.push(`Error:\n${errMsg}`);

    // Include relevant artifact if available
    const artifactMap = {
      "architect": task.spec_path,
      "critique": task.review_path,
      "synthesize": task.brief_path,
      "execute": task.brief_path,
      "merge": task.result_path,
      "propose-followups": task.result_path,
      "pr-draft": task.followup_path
    };
    const artifactRel = artifactMap[stepName];
    if (artifactRel) {
      const artifactAbs = path.join(repoRoot, artifactRel);
      if (fs.existsSync(artifactAbs)) {
        const content = fs.readFileSync(artifactAbs, "utf8").substring(0, 3000);
        contextParts.push(`\nRelevant artifact (${artifactRel}):\n${content}`);
      }
    }

    // Load AI Flow Lab docs context for better diagnosis
    let docsContext = "";
    const docsToLoad = [
      path.join(automationRoot, "docs/dev/ARCHITECTURE.md"),
      path.join(automationRoot, "docs/dev/PIPELINE.md"),
      path.join(automationRoot, "docs/internal/KNOWN_BUGS.md")
    ];
    for (const docPath of docsToLoad) {
      try {
        if (fs.existsSync(docPath)) {
          const content = fs.readFileSync(docPath, "utf8").substring(0, 1500);
          docsContext += `\n[${path.relative(repoRoot, docPath)}]:\n${content}\n`;
        }
      } catch (_) {}
    }

    const prompt = `You are a pipeline-failure diagnostician for the AI Flow Lab automated code development system.

A pipeline step has failed. Analyze the error and produce a concise diagnosis.
Always reference the AI Flow Lab documentation when diagnosing issues.

${contextParts.join("\n")}
${docsContext ? `\nRelevant AI Flow Lab documentation:\n${docsContext}` : ""}

Respond with EXACTLY this format (no extra sections):
## Root Cause
One-sentence root cause.

## Details
2-4 sentences explaining what went wrong and why. Reference relevant docs sections.

## Suggested Fix
1-3 concrete action items to resolve this.`;

    let diagnosis;
    if (hasClaudeCLI()) {
      // Use Claude CLI
      const tmpDir = path.join(getStateDir(), "tmp");
      fs.mkdirSync(tmpDir, { recursive: true });
      const promptFile = path.join(tmpDir, `diag-${taskId}-${Date.now()}.md`);
      fs.writeFileSync(promptFile, prompt);
      const model = process.env.CLAUDE_MODEL || "sonnet";
      // Tool-enabled: Claude can Read source files to understand the error context
      const cmd = `cat "${promptFile}" | claude --print --model "${model}" --output-format json --allowed-tools "Read,Glob,Grep" --permission-mode acceptEdits --max-budget-usd 0.50`;
      const { stdout } = await execAsync(cmd, {
        cwd: repoRoot,
        timeout: 120000,
        maxBuffer: 5 * 1024 * 1024,
        env: { ...process.env }
      });
      try { fs.unlinkSync(promptFile); } catch (_) {}
      const rawDiag = (stdout || "").trim();
      try { diagnosis = JSON.parse(rawDiag).result || rawDiag; } catch (_) { diagnosis = rawDiag; }
    } else {
      // Fallback to Gemini API
      console.log(`[DIAGNOSIS] No ANTHROPIC_API_KEY — using Gemini API fallback`);
      diagnosis = await callGeminiDirect(prompt);
    }
    if (!diagnosis) return "(diagnosis returned empty)";

    console.log(`[DIAGNOSIS] ${taskId}/${stepName}: diagnosis generated (${diagnosis.length} chars)`);
    return diagnosis;
  } catch (diagErr) {
    console.error(`[DIAGNOSIS] Failed for ${taskId}/${stepName}:`, diagErr.message?.substring(0, 200));
    return `(auto-diagnosis failed: ${diagErr.message?.substring(0, 150)})`;
  }
}

// ===== AUTO-FIX: Claude CLI generates a fix for pipeline errors =====
async function generateStepFix(taskId, stepName, errMsg) {
  try {
    const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
    const task = readJSON(taskFile);
    if (!task) return null;

    // Build rich context
    const contextParts = [`Task: ${taskId} — ${task.title || "(untitled)"}`];
    contextParts.push(`Step: ${stepName}`);
    contextParts.push(`Lane: ${task.lane_type || "unknown"}`);
    contextParts.push(`State: ${task.state || "unknown"}`);
    contextParts.push(`Error:\n${errMsg}`);

    // Include diagnosis if available
    if (task.last_error?.diagnosis) {
      contextParts.push(`\nPrevious diagnosis:\n${task.last_error.diagnosis}`);
    }

    // Include the failing script source (first 150 lines)
    const scriptMap = {
      "architect": "architect-task-api.mjs",
      "critique": "critique-task-api.mjs",
      "synthesize": "synthesize-task-api.mjs",
      "execute": "execute-task-api.mjs",
      "bootstrap": "prepare-worktree.mjs",
      "propose-followups": "propose-followups-api.mjs",
      "pr-draft": "generate-pr-draft.mjs",
      "merge": "merge-task.mjs"
    };
    const scriptName = scriptMap[stepName];
    if (scriptName) {
      const scriptPath = path.join(automationRoot, "scripts", scriptName);
      if (fs.existsSync(scriptPath)) {
        const src = fs.readFileSync(scriptPath, "utf8");
        const lines = src.split("\n").slice(0, 200).join("\n");
        contextParts.push(`\nFailing script (${scriptName}, first 200 lines):\n\`\`\`javascript\n${lines}\n\`\`\``);
      }
    }

    // Include relevant artifact
    const artifactMap = {
      "architect": task.spec_path,
      "critique": task.review_path,
      "synthesize": task.brief_path,
      "execute": task.brief_path,
      "merge": task.result_path,
      "propose-followups": task.result_path,
      "pr-draft": task.followup_path
    };
    const artifactRel = artifactMap[stepName];
    if (artifactRel) {
      const artifactAbs = path.join(repoRoot, artifactRel);
      if (fs.existsSync(artifactAbs)) {
        const content = fs.readFileSync(artifactAbs, "utf8").substring(0, 2000);
        contextParts.push(`\nRelevant artifact (${artifactRel}):\n${content}`);
      }
    }

    // Load AI Flow Lab docs context
    let docsCtx = "";
    const fixDocs = [
      path.join(automationRoot, "docs/dev/ARCHITECTURE.md"),
      path.join(automationRoot, "docs/dev/PIPELINE.md"),
      path.join(automationRoot, "docs/internal/KNOWN_BUGS.md")
    ];
    for (const dp of fixDocs) {
      try {
        if (fs.existsSync(dp)) docsCtx += `\n[${path.relative(repoRoot, dp)}]:\n${fs.readFileSync(dp, "utf8").substring(0, 1500)}\n`;
      } catch (_) {}
    }

    const prompt = `You are a senior software engineer fixing a bug in the AI Flow Lab automated code pipeline.
Always reference the AI Flow Lab documentation when proposing fixes.

A pipeline step has failed. Generate a CONCRETE fix.

${contextParts.join("\n")}
${docsCtx ? `\nAI Flow Lab documentation:\n${docsCtx}` : ""}

IMPORTANT RULES:
- Only fix the immediate error. Do not refactor unrelated code.
- If the fix involves editing files, output exact file paths and the changes.
- If the fix involves re-running a step or changing task state, say so.
- Be minimal and safe.

Respond with EXACTLY this format:
## Summary
One-sentence description of the fix.

## Risk Level
LOW / MEDIUM / HIGH

## Changes
For each file that needs changing:
### FILE: <relative-path-from-repo-root>
\`\`\`diff
- old line
+ new line
\`\`\`

## Post-Fix Actions
List any actions needed after applying (e.g. "retry from step X", "restart server").`;

    let fix;
    if (hasClaudeCLI()) {
      const tmpDir = path.join(getStateDir(), "tmp");
      fs.mkdirSync(tmpDir, { recursive: true });
      const promptFile = path.join(tmpDir, `fix-${taskId}-${Date.now()}.md`);
      fs.writeFileSync(promptFile, prompt);
      const model = process.env.CLAUDE_MODEL || "sonnet";
      // Tool-enabled: Claude can Read files to understand context and generate better fixes
      const cmd = `cat "${promptFile}" | claude --print --model "${model}" --output-format json --allowed-tools "Read,Glob,Grep" --permission-mode acceptEdits --max-budget-usd 1.00`;
      const { stdout } = await execAsync(cmd, {
        cwd: repoRoot,
        timeout: 180000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env }
      });
      try { fs.unlinkSync(promptFile); } catch (_) {}
      const rawFix = (stdout || "").trim();
      try { fix = JSON.parse(rawFix).result || rawFix; } catch (_) { fix = rawFix; }
    } else {
      console.log(`[AUTO-FIX] No ANTHROPIC_API_KEY — using Gemini API fallback`);
      fix = await callGeminiDirect(prompt);
    }
    if (!fix) return null;

    console.log(`[AUTO-FIX] ${taskId}/${stepName}: fix generated (${fix.length} chars)`);

    // Parse risk level
    const riskMatch = fix.match(/## Risk Level\s*\n\s*(LOW|MEDIUM|HIGH)/i);
    const risk = riskMatch ? riskMatch[1].toUpperCase() : "UNKNOWN";

    // Store fix proposal
    const fixProposal = {
      id: `fix-${taskId}-${Date.now()}`,
      taskId,
      step: stepName,
      risk,
      content: fix,
      generated_at: new Date().toISOString(),
      status: "pending" // pending | applied | rejected
    };

    // Save to fixes directory
    const fixesDir = path.join(getStateDir(), "fixes");
    fs.mkdirSync(fixesDir, { recursive: true });
    fs.writeFileSync(path.join(fixesDir, `${fixProposal.id}.json`), JSON.stringify(fixProposal, null, 2));

    return fixProposal;
  } catch (fixErr) {
    console.error(`[AUTO-FIX] Failed for ${taskId}/${stepName}:`, fixErr.message?.substring(0, 200));
    return null;
  }
}

// ===== CASCADE CONFIG =====
function loadCascadeConfig() {
  try {
    const configPath = path.join(repoRoot, "ai", "project.config.yaml");
    if (!fs.existsSync(configPath)) return { max_depth: 3, max_followups_per_task: 2, max_total_tasks: 8 };
    const raw = fs.readFileSync(configPath, "utf8");
    const depth = raw.match(/max_depth:\s*(\d+)/)?.[1];
    const perTask = raw.match(/max_followups_per_task:\s*(\d+)/)?.[1];
    const total = raw.match(/max_total_tasks:\s*(\d+)/)?.[1];
    return {
      max_depth: depth ? parseInt(depth) : 3,
      max_followups_per_task: perTask ? parseInt(perTask) : 2,
      max_total_tasks: total ? parseInt(total) : 8
    };
  } catch (_) { return { max_depth: 3, max_followups_per_task: 2, max_total_tasks: 8 }; }
}

// ===== DEDUP: Title similarity =====
function wordTokens(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
}
function jaccardSimilarity(a, b) {
  const setA = new Set(wordTokens(a));
  const setB = new Set(wordTokens(b));
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
function fileSetOverlap(filesA, filesB) {
  if (!filesA || !filesB || filesA.length === 0 || filesB.length === 0) return 0;
  const setA = new Set(filesA.map(f => f.replace(/^.*\//, ''))); // basename only
  const setB = new Set(filesB.map(f => f.replace(/^.*\//, '')));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  return intersection / Math.min(setA.size, setB.size); // overlap ratio vs smaller set
}

function isDuplicate(proposalTitle, proposalScope, proposalFiles, existingTasks) {
  for (const t of existingTasks) {
    // 1. Title similarity (original check)
    const titleSim = jaccardSimilarity(proposalTitle, t.title);
    if (titleSim > 0.75) {
      return { taskId: t.task_id, reason: `title similarity ${(titleSim*100).toFixed(0)}%` };
    }
    // 2. Scope similarity (description/scope overlap)
    if (proposalScope && t.description) {
      const scopeSim = jaccardSimilarity(proposalScope, t.description);
      if (scopeSim > 0.6) {
        return { taskId: t.task_id, reason: `scope similarity ${(scopeSim*100).toFixed(0)}%` };
      }
    }
    // 3. Written files overlap (>50% shared files)
    const fileOverlap = fileSetOverlap(proposalFiles, t.written_files);
    if (fileOverlap > 0.5) {
      return { taskId: t.task_id, reason: `file overlap ${(fileOverlap*100).toFixed(0)}%` };
    }
  }
  return null;
}

// Backwards-compatible wrapper
function isDuplicateTitle(proposalTitle, existingTasks) {
  const result = isDuplicate(proposalTitle, null, null, existingTasks);
  return result ? result.taskId : null;
}

async function cascadeRunTask(taskId, maxDepth, currentDepth, cascadeCtx = null) {
  // Initialize cascade context (shared across recursive calls)
  const isRootCall = !cascadeCtx;
  if (isRootCall) {
    const cfg = loadCascadeConfig();
    cascadeCtx = {
      maxDepth: maxDepth ?? cfg.max_depth,
      maxFollowupsPerTask: cfg.max_followups_per_task,
      maxTotalTasks: cfg.max_total_tasks,
      tasksSpawned: 1, // count root task
      errors: [],
      // Capture project paths at cascade start — safe from project switches
      projectCtx: captureProjectContext()
    };
    _runningCascades++;
    console.log(`[CASCADE] Started (${_runningCascades} running). Project: ${cascadeCtx.projectCtx.repoRoot}`);
  }

  // Use captured project paths for all operations in this cascade
  const _stateDir = cascadeCtx.projectCtx.stateDir;
  const _automationRoot = cascadeCtx.projectCtx.automationRoot;
  const _repoRoot = cascadeCtx.projectCtx.repoRoot;

  const taskFile = path.join(_stateDir, "tasks", `${taskId}.json`);
  const steps = ['architect', 'critique', 'synthesize', 'execute', 'propose-followups', 'pr-draft', 'merge'];
  const scriptMap = {
    'architect': 'architect-task-api.mjs',
    'critique': 'critique-task-api.mjs',
    'synthesize': 'synthesize-task-api.mjs',
    'execute': 'execute-task-api.mjs',
    'propose-followups': 'propose-followups-api.mjs',
    'pr-draft': 'generate-pr-draft.mjs',
    'merge': 'merge-task.mjs'
  };
  const stateAfterStep = {
    'architect': 'ARCHITECTED',
    'critique': 'CRITIQUED',
    'synthesize': 'SYNTHESIZED',
    'execute': 'IMPLEMENTING',
    'propose-followups': 'FOLLOWUPS_PROPOSED',
    'pr-draft': 'PR_DRAFTED',
    'merge': 'MERGED'
  };

  try { // try/finally ensures _runningCascades always decrements

  // Create git branch for this task before pipeline starts
  createTaskBranch(taskId, _repoRoot);

  // Mark running
  try {
    const tf0 = readJSON(taskFile);
    if (tf0) { tf0.runtime_status = "running"; tf0.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf0, null, 2)); }
  } catch (_) {}

  let failedStep = null;

  // Skip already-completed steps based on current task state
  // (e.g. if state=SYNTHESIZED, skip architect/critique/synthesize and start at execute)
  let startIdx = 0;
  {
    const tf1 = readJSON(taskFile);
    if (tf1 && tf1.state && tf1.state !== 'NEW') {
      const nextStep = STATE_TO_NEXT_STEP[tf1.state];
      if (nextStep) {
        const idx = steps.indexOf(nextStep);
        if (idx > 0) {
          startIdx = idx;
          console.log(`[CASCADE] ${taskId}: state=${tf1.state}, skipping to step "${nextStep}" (index ${idx})`);
        }
      }
    }
  }

  for (let _si = startIdx; _si < steps.length; _si++) {
    const stepName = steps[_si];
    console.log(`[CASCADE] ${taskId} (d=${currentDepth}): ${stepName}...`);
    // Update current_step for UI tracking
    try {
      const tfc = readJSON(taskFile);
      if (tfc) { tfc.current_step = stepName; tfc.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tfc, null, 2)); }
    } catch (_) {}
    try {
      await execAsync(`node scripts/${scriptMap[stepName]} ${taskId}`, { cwd: _automationRoot, timeout: 1800000, maxBuffer: 10 * 1024 * 1024, env: buildChildEnv(cascadeCtx.projectCtx) });
      const tf = readJSON(taskFile);
      if (tf && stateAfterStep[stepName]) {
        tf.state = stateAfterStep[stepName];
        tf.current_step = stepName;
        tf.last_error = null; // clear any previous error
        tf.failed_step = null;
        tf.updated_at = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
      }
      // Auto-git-commit (using captured project paths)
      try {
        const tf2 = readJSON(taskFile);
        const commitMsg = `[${taskId}] ${stepName}: ${tf2?.title || taskId}`;
        await execAsync(`git add -A && git diff --cached --quiet || git commit -m "${commitMsg.replace(/"/g,'\\"')}"`, { cwd: _repoRoot, timeout: 10000 });
      } catch (_) {}

      // ===== GUARDRAIL ROUTING (after execute step) =====
      if (stepName === 'execute') {
        const tfg = readJSON(taskFile);
        const guardrail = tfg?.guardrail_result;
        if (guardrail && guardrail.level !== 'green') {
          console.log(`[CASCADE] ${taskId}: guardrail=${guardrail.level.toUpperCase()} (${guardrail.issues?.length || 0} issues)`);

          if (guardrail.level === 'red') {
            // RED: Pause pipeline, create Decision Proposal
            console.log(`[CASCADE] ${taskId}: 🔴 RED — pausing for user decision`);
            tfg.state = 'BLOCKED_ON_DECISION';
            tfg.runtime_status = 'IDLE';
            tfg.current_step = 'guardrail-review';
            tfg.updated_at = new Date().toISOString();
            fs.writeFileSync(taskFile, JSON.stringify(tfg, null, 2));

            // Create Decision Proposal
            try {
              const proposalsDir = path.join(_stateDir, "proposals");
              fs.mkdirSync(proposalsDir, { recursive: true });
              const dpId = `DP-GR-${taskId}-${Date.now()}`;
              const dp = {
                decision_proposal_id: dpId,
                topic: `Executor output review: ${taskId}`,
                type: 'guardrail_review',
                task_id: taskId,
                severity: 'red',
                issues: guardrail.issues,
                options: [
                  { id: 'accept', label: 'Accept Changes', action: 'continue_to_merge' },
                  { id: 'restore', label: 'Restore Snapshot', action: 'restore_and_fail' },
                  { id: 'test', label: 'Run Cowork Test', action: 'run_cowork_test' }
                ],
                status: 'open',
                created_at: new Date().toISOString()
              };
              fs.writeFileSync(path.join(proposalsDir, `${dpId}.json`), JSON.stringify(dp, null, 2));
              console.log(`[CASCADE] ${taskId}: Created Decision Proposal ${dpId}`);
            } catch (dpErr) {
              console.error(`[CASCADE] Failed to create Decision Proposal:`, dpErr.message);
            }

            // Stop cascade — user must decide
            break;
          }

          if (guardrail.level === 'yellow') {
            // YELLOW: Run Cowork test
            console.log(`[CASCADE] ${taskId}: ⚠️ YELLOW — running Cowork test`);
            tfg.state = 'COWORK_TESTING';
            tfg.current_step = 'cowork-test';
            tfg.updated_at = new Date().toISOString();
            fs.writeFileSync(taskFile, JSON.stringify(tfg, null, 2));

            try {
              await execAsync(`node scripts/cowork-test.mjs ${taskId}`, { cwd: _automationRoot, timeout: 300000, maxBuffer: 10 * 1024 * 1024 });
              // cowork-test.mjs sets task state to TESTED or TEST_FAILED
              const tfAfterTest = readJSON(taskFile);
              if (tfAfterTest && tfAfterTest.state === 'TEST_FAILED') {
                console.log(`[CASCADE] ${taskId}: Cowork test FAILED — stopping cascade`);
                tfAfterTest.runtime_status = 'FAILED';
                tfAfterTest.updated_at = new Date().toISOString();
                fs.writeFileSync(taskFile, JSON.stringify(tfAfterTest, null, 2));
                failedStep = 'cowork-test';
                break;
              }
              console.log(`[CASCADE] ${taskId}: Cowork test PASSED — continuing to merge`);
            } catch (testErr) {
              console.error(`[CASCADE] ${taskId}: Cowork test execution error:`, testErr.message?.substring(0, 500));
              const tfErr = readJSON(taskFile);
              if (tfErr) {
                tfErr.state = 'TEST_FAILED';
                tfErr.failed_step = 'cowork-test';
                tfErr.runtime_status = 'FAILED';
                tfErr.last_error = { step: 'cowork-test', message: testErr.message?.substring(0, 2000), timestamp: new Date().toISOString() };
                tfErr.updated_at = new Date().toISOString();
                fs.writeFileSync(taskFile, JSON.stringify(tfErr, null, 2));
              }
              failedStep = 'cowork-test';
              break;
            }
          }
        }
      }
    } catch (stepErr) {
      const parts = [stepErr.stderr, stepErr.stdout, stepErr.message].filter(Boolean);
      const raw = parts.join("\n---\n").trim();
      const signal = stepErr.killed ? ` [KILLED signal=${stepErr.signal || 'SIGTERM'} — likely timeout]` : "";
      const errMsg = (raw + signal || "Unknown error").substring(0, 2000);
      console.error(`[CASCADE] ${taskId}: ${stepName} FAILED:`, errMsg.substring(0, 500));
      failedStep = stepName;

      // Phase 11: Write error state to task JSON
      try {
        const tf = readJSON(taskFile);
        if (tf) {
          tf.runtime_status = "FAILED";
          tf.failed_step = stepName;
          tf.last_error = { step: stepName, message: errMsg, timestamp: new Date().toISOString() };
          tf.updated_at = new Date().toISOString();
          fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
        }
      } catch (_) {}

      // Auto-diagnosis: run Claude CLI to analyze the failure
      try {
        const diagnosis = await diagnoseStepError(taskId, stepName, errMsg);
        const tf2 = readJSON(taskFile);
        if (tf2 && tf2.last_error) {
          tf2.last_error.diagnosis = diagnosis;
          tf2.updated_at = new Date().toISOString();
          fs.writeFileSync(taskFile, JSON.stringify(tf2, null, 2));
        }
      } catch (_diagErr) {
        console.error(`[CASCADE] Diagnosis failed for ${taskId}:`, _diagErr.message?.substring(0, 100));
      }

      // Append to error log
      try {
        const errLogFile = path.join(_stateDir, "tasks", `${taskId}.errors.json`);
        const errLog = readJSON(errLogFile) || [];
        errLog.push({ step: stepName, message: errMsg, timestamp: new Date().toISOString(), depth: currentDepth });
        fs.writeFileSync(errLogFile, JSON.stringify(errLog, null, 2));
      } catch (_) {}

      cascadeCtx.errors.push({ taskId, step: stepName, message: errMsg });
      break; // stop pipeline for this task
    }
  }

  // Mark done (only if no failure)
  if (!failedStep) {
    try {
      const tf = readJSON(taskFile);
      if (tf) { tf.runtime_status = "IDLE"; tf.current_step = null; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
    } catch (_) {}

    console.log(`[CASCADE] ${taskId}: pipeline complete → ${readJSON(taskFile)?.state}`);
  }

  } finally {
    // Decrement cascade counter when root call finishes — ALWAYS, even on exception
    if (isRootCall) {
      _runningCascades = Math.max(0, _runningCascades - 1);
      console.log(`[CASCADE] Finished ${taskId} (${_runningCascades} still running)`);
    }
  }

  // Auto-spawn follow-ups (with limits + dedup)
  if (!failedStep && currentDepth < cascadeCtx.maxDepth) {
    const proposalsDir = path.join(_stateDir, "proposals");
    const allProposals = listFilesInDir(proposalsDir, /\.json$/)
      .map(f => readJSON(path.join(proposalsDir, f)))
      .filter(p => p && p.parent_task_id === taskId && p.should_spawn_now === true);

    if (allProposals.length === 0) return;

    // Load all existing tasks for dedup check
    const tasksDir = path.join(_stateDir, "tasks");
    const existingTasks = listFilesInDir(tasksDir, /^T-\d+\.json$/)
      .map(f => readJSON(path.join(tasksDir, f)))
      .filter(Boolean);

    // Phase 10: Apply limits
    let spawnable = [];
    for (const proposal of allProposals) {
      // Dedup check (Phase 4B) — enhanced: title + scope + written_files
      const dupResult = isDuplicate(
        proposal.title,
        proposal.smallest_safe_scope || proposal.rationale || '',
        proposal.written_files || [],
        existingTasks
      );
      if (dupResult) {
        console.log(`[CASCADE] Skipping "${proposal.title}" — duplicate of ${dupResult.taskId} (${dupResult.reason})`);
        continue;
      }
      spawnable.push(proposal);
    }

    // Per-task limit
    if (spawnable.length > cascadeCtx.maxFollowupsPerTask) {
      console.log(`[CASCADE] Limiting follow-ups: ${spawnable.length} → ${cascadeCtx.maxFollowupsPerTask} (maxFollowupsPerTask)`);
      spawnable = spawnable.slice(0, cascadeCtx.maxFollowupsPerTask);
    }

    // Total budget check
    const budgetRemaining = cascadeCtx.maxTotalTasks - cascadeCtx.tasksSpawned;
    if (spawnable.length > budgetRemaining) {
      console.log(`[CASCADE] Budget limit: ${spawnable.length} → ${budgetRemaining} (${cascadeCtx.tasksSpawned}/${cascadeCtx.maxTotalTasks} used)`);
      spawnable = spawnable.slice(0, Math.max(0, budgetRemaining));
    }

    if (spawnable.length > 0) {
      console.log(`[CASCADE] ${taskId}: spawning ${spawnable.length} follow-ups (budget: ${cascadeCtx.tasksSpawned}/${cascadeCtx.maxTotalTasks})...`);
    }

    for (const proposal of spawnable) {
      const newId = nextTaskId();
      cascadeCtx.tasksSpawned++;
      try {
        execSync(`node scripts/spawn-followup-task.mjs ${proposal.proposal_id} ${newId}`, { cwd: _automationRoot, stdio: 'pipe' });
        console.log(`[CASCADE] Spawned follow-up ${newId} from ${proposal.proposal_id}`);
        // Add to existingTasks so subsequent dedup checks see it
        existingTasks.push({ task_id: newId, title: proposal.title });
        await cascadeRunTask(newId, cascadeCtx.maxDepth, currentDepth + 1, cascadeCtx);
      } catch (spawnErr) {
        console.error(`[CASCADE] Spawn failed for ${proposal.proposal_id}:`, spawnErr.message?.substring(0, 100));
      }
    }
  } else if (!failedStep && currentDepth >= cascadeCtx.maxDepth) {
    console.log(`[CASCADE] ${taskId}: max depth reached (${currentDepth}/${cascadeCtx.maxDepth}), not spawning follow-ups`);
  }
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API routes
  if (pathname.startsWith("/api/")) {
    try {
      // Check for exact route matches
      let handled = false;

      for (const [route, handler] of Object.entries(apiRoutes)) {
        const [method, path_pattern] = route.split(" ");

        if (req.method !== method) continue;

        // Exact match
        if (path_pattern === pathname) {
          await handler(req, res, {});
          handled = true;
          break;
        }

        // Pattern match (e.g., /api/prompts/:id/respond)
        const pattern = path_pattern.replace(/:[a-z]+/g, "([^/]+)");
        const regex = new RegExp(`^${pattern}$`);
        const match = pathname.match(regex);

        if (match) {
          const paramNames = (path_pattern.match(/:[a-z]+/g) || []).map((p) => p.slice(1));
          const params = {};
          paramNames.forEach((name, idx) => {
            params[name] = match[idx + 1];
          });

          await handler(req, res, params);
          handled = true;
          break;
        }
      }

      if (!handled) {
        respondError(res, 404, "API route not found");
      }
    } catch (e) {
      console.error("API error:", e);
      respondError(res, 500, `Server error: ${e.message}`);
    }
  } else if (pathname === "/" || pathname === "/index.html") {
    // Serve dashboard
    const dashboardPath = path.join(getUIDir(), "dashboard.html");
    respondFile(res, dashboardPath, "text/html");
  } else if (pathname === "/game" || pathname === "/game.html") {
    // Serve the game from ui/game.html (the actual game code)
    // Fallback to repo root index.html for backwards compatibility
    const uiGamePath = path.join(getUIDir(), "game.html");
    const repoGamePath = path.join(repoRoot, "index.html");
    const gamePath = fs.existsSync(uiGamePath) ? uiGamePath : repoGamePath;
    if (fs.existsSync(gamePath)) {
      respondFile(res, gamePath, "text/html");
    } else {
      respondError(res, 404, "Game file not found (checked ui/game.html and repo root index.html)");
    }
  } else {
    // Try to serve static files from ui/
    const filePath = path.join(getUIDir(), pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(getUIDir())) {
      respondError(res, 403, "Forbidden");
      return;
    }

    // Also check repo root for game assets (e.g. auth-state.js loaded by index.html)
    const repoFilePath = path.join(repoRoot, pathname);
    const resolvedPath = (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) ? filePath :
                         (repoFilePath.startsWith(repoRoot) && fs.existsSync(repoFilePath) && fs.statSync(repoFilePath).isFile()) ? repoFilePath : null;

    if (resolvedPath) {
      const ext = path.extname(resolvedPath).toLowerCase();
      const contentType =
        ext === ".html" ? "text/html" :
        ext === ".css" ? "text/css" :
        ext === ".js" ? "text/javascript" :
        ext === ".json" ? "application/json" :
        ext === ".png" ? "image/png" :
        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
        ext === ".gif" ? "image/gif" :
        ext === ".svg" ? "image/svg+xml" :
        "application/octet-stream";

      respondFile(res, resolvedPath, contentType);
    } else {
      respondError(res, 404, "Not found");
    }
  }
});

// ===== HELPER: Derive the next pipeline step from task state =====
// Used by startup cleanup and retry to figure out which step to resume from.
const PIPELINE_STEPS = ['architect', 'critique', 'synthesize', 'execute', 'propose-followups', 'pr-draft', 'merge'];
const STATE_TO_NEXT_STEP = {
  'NEW': 'architect',
  'ARCHITECTED': 'critique',
  'CRITIQUED': 'synthesize',
  'SYNTHESIZED': 'execute',
  'IMPLEMENTING': 'propose-followups',
  'IMPLEMENTED': 'propose-followups',   // execute done → followups before merge
  'EXECUTED': 'propose-followups',
  'TESTED': 'propose-followups',
  'COWORK_TESTING': 'propose-followups', // resume after test → followups
  'TEST_FAILED': 'execute',             // retry from execute
  'BLOCKED_ON_DECISION': null,          // blocked — no auto-advance
  'FOLLOWUPS_PROPOSED': 'pr-draft',
  'PR_DRAFTED': 'merge',               // merge is now last step
  'MERGED': null                        // pipeline complete
};
function deriveFailedStep(task) {
  const stateNext = task.state && STATE_TO_NEXT_STEP[task.state];

  // KEY FIX: If current_step already completed (state reflects its success),
  // the real failed step is the NEXT one, not current_step.
  // Example: state=SYNTHESIZED, current_step="synthesize" → synthesize is DONE,
  //          the step that failed (or never ran) is "execute".
  if (task.current_step && stateNext) {
    const csIdx = PIPELINE_STEPS.indexOf(task.current_step);
    const snIdx = PIPELINE_STEPS.indexOf(stateNext);
    if (snIdx > csIdx) {
      console.log(`[deriveFailedStep] current_step="${task.current_step}" already completed (state=${task.state}) → resuming from "${stateNext}"`);
      return stateNext;
    }
  }

  // 1. If current_step is a known pipeline step and NOT completed, it's the failing step
  if (task.current_step && PIPELINE_STEPS.includes(task.current_step)) return task.current_step;
  // 2. If failed_step is a known pipeline step, use it
  if (task.failed_step && PIPELINE_STEPS.includes(task.failed_step)) return task.failed_step;
  // 3. Derive from task.state → next step that should have run
  if (stateNext) return stateNext;
  // 4. Fallback: start from beginning
  return 'architect';
}

// ===== STARTUP: Clean stale runtime_status =====
// When the server starts, no task can legitimately be "running" because the
// server process (and all its child step-processes) just started fresh.
// Any task stuck as "running" is a leftover from a previous crash/timeout.
(function cleanStaleStatus() {
  const tasksDir = path.join(getStateDir(), "tasks");
  if (!fs.existsSync(tasksDir)) return;
  const files = fs.readdirSync(tasksDir).filter(f => /^T-[\w-]+\.json$/.test(f));
  let fixedRunning = 0;
  let fixedTerminal = 0;
  for (const f of files) {
    const filePath = path.join(tasksDir, f);
    const tf = readJSON(filePath);
    if (!tf) continue;

    let changed = false;

    // Case 1: Task is "running" but no process is alive (server just started).
    // Reset to FAILED so the user sees "Retry" button with context about what failed.
    // Exception: if the task already reached a terminal state, reset to IDLE instead.
    if (tf.runtime_status === "running") {
      const terminalStates = ["PR_DRAFTED", "MERGED"];
      if (terminalStates.includes(tf.state)) {
        // Completed task with stale running status → clean up silently
        tf.runtime_status = "IDLE";
        tf.last_error = null;
        tf.current_step = null;
        fixedTerminal++;
      } else {
        // Mid-pipeline task that was interrupted → mark as FAILED so user can retry
        tf.runtime_status = "FAILED";
        tf.failed_step = deriveFailedStep(tf);
        tf.last_error = {
          step: tf.failed_step,
          message: "Server restarted while this task was running. The step was interrupted (likely timeout or crash). Use Retry to resume.",
          timestamp: new Date().toISOString()
        };
        tf.current_step = null;
        fixedRunning++;
      }
      tf.updated_at = new Date().toISOString();
      changed = true;
    }

    // Case 2: Completed tasks stuck in QUEUED → normalize to IDLE
    if (tf.runtime_status === "QUEUED" && ["PR_DRAFTED", "MERGED"].includes(tf.state)) {
      tf.runtime_status = "IDLE";
      tf.updated_at = new Date().toISOString();
      changed = true;
      fixedTerminal++;
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(tf, null, 2));
    }
  }

  // Also clean up orphaned filesystem lock files
  const locksDir = path.join(getStateDir(), "locks", "tasks");
  if (fs.existsSync(locksDir)) {
    let locksRemoved = 0;
    try {
      for (const lockFile of fs.readdirSync(locksDir).filter(f => f.endsWith(".lock"))) {
        fs.unlinkSync(path.join(locksDir, lockFile));
        locksRemoved++;
      }
    } catch (_) {}
    if (locksRemoved > 0) console.log(`[STARTUP] Removed ${locksRemoved} stale task lock file(s)`);
  }
  const branchLocksDir = path.join(getStateDir(), "locks", "branches");
  if (fs.existsSync(branchLocksDir)) {
    let locksRemoved = 0;
    try {
      for (const lockFile of fs.readdirSync(branchLocksDir).filter(f => f.endsWith(".lock"))) {
        fs.unlinkSync(path.join(branchLocksDir, lockFile));
        locksRemoved++;
      }
    } catch (_) {}
    if (locksRemoved > 0) console.log(`[STARTUP] Removed ${locksRemoved} stale branch lock file(s)`);
  }

  // Clean up orphaned CLI temp files from interrupted execSync calls
  const tmpDir = path.join(getStateDir(), "tmp");
  if (fs.existsSync(tmpDir)) {
    let tmpCleaned = 0;
    try {
      for (const f of fs.readdirSync(tmpDir).filter(f => f.startsWith("cli-prompt-"))) {
        try { fs.unlinkSync(path.join(tmpDir, f)); tmpCleaned++; } catch (_) {}
      }
    } catch (_) {}
    if (tmpCleaned > 0) console.log(`[STARTUP] Cleaned ${tmpCleaned} orphaned CLI temp file(s)`);
  }

  if (fixedRunning > 0) console.log(`[STARTUP] Recovered ${fixedRunning} interrupted task(s) → FAILED (retryable)`);
  if (fixedTerminal > 0) console.log(`[STARTUP] Cleaned ${fixedTerminal} completed task(s) with stale status → IDLE`);
})();

// ===== STARTUP: Load and log LLM mode =====
const llmMode = process.env.LLM_MODE || "mock";
console.log(`[STARTUP] LLM_MODE = ${llmMode}`);
if (llmMode === "cli") {
  // Check which CLIs are available
  let hasCodexCLI = false, hasClaudeCLI = false;
  try { execSync("which codex", { stdio: "ignore" }); hasCodexCLI = true; } catch {}
  try { execSync("which claude", { stdio: "ignore" }); hasClaudeCLI = true; } catch {}
  console.log(`[STARTUP] CLI mode enabled`);
  console.log(`[STARTUP]   claude CLI: ${hasClaudeCLI ? "✓ found" : "✗ not found"}`);
  console.log(`[STARTUP]   codex  CLI: ${hasCodexCLI ? "✓ found" : "✗ not found"}`);
  console.log(`[STARTUP]   OpenAI tasks → ${hasCodexCLI ? "codex exec" : process.env.OPENAI_API_KEY ? "OpenAI API (key set)" : hasClaudeCLI ? "Claude CLI fallback" : "NO EXECUTOR"}`);
  console.log(`[STARTUP]   Claude tasks → ${hasClaudeCLI ? "claude --print" : process.env.ANTHROPIC_API_KEY ? "Anthropic API (key set)" : "NO EXECUTOR"}`);
  console.log(`[STARTUP]   Gemini tasks → ${process.env.GEMINI_API_KEY ? "Gemini API (key set)" : hasClaudeCLI ? "Claude CLI fallback" : "NO EXECUTOR"}`);
} else {
  console.log(`[STARTUP] OPENAI_API_KEY = ${process.env.OPENAI_API_KEY ? "set" : "MISSING"}`);
  console.log(`[STARTUP] GEMINI_API_KEY = ${process.env.GEMINI_API_KEY ? "set" : "MISSING"}`);
  console.log(`[STARTUP] ANTHROPIC_API_KEY = ${process.env.ANTHROPIC_API_KEY ? "set" : "MISSING"}`);
}

server.listen(PORT, () => {
  console.log(`Dashboard server listening on http://localhost:${PORT}`);
  console.log(`  State dir: ${getStateDir()}`);
  console.log(`  UI dir: ${getUIDir()}`);

  // Auto-register current project in multi-project registry
  try {
    const registered = ensureCurrentProjectRegistered(repoRoot, automationRoot);
    if (registered) {
      console.log(`  Project: ${registered.name} (${registered.id})`);
    }
  } catch (e) {
    console.warn(`  [REGISTRY] Auto-register failed: ${e.message}`);
  }
});

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  server.close();
  process.exit(0);
});
