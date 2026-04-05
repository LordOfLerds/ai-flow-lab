import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const automationRoot = path.dirname(__dirname);
const repoRoot = path.resolve(automationRoot, "..");

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
  res.writeHead(statusCode, { "Content-Type": "application/json" });
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
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (e) {
    respondError(res, 500, `Error reading file: ${e.message}`);
  }
}

// API route handlers
const apiRoutes = {
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

    // Load tasks
    const tasksDir = path.join(stateDir, "tasks");
    listFilesInDir(tasksDir, /\.json$/).forEach((file) => {
      const task = readJSON(path.join(tasksDir, file));
      if (task) state.tasks.push(task);
    });

    // Load proposals
    const proposalsDir = path.join(stateDir, "proposals");
    listFilesInDir(proposalsDir, /\.json$/).forEach((file) => {
      const proposal = readJSON(path.join(proposalsDir, file));
      if (proposal) state.proposals.push(proposal);
    });

    // Load decision proposals
    const dpDir = path.join(stateDir, "decision_proposals");
    listFilesInDir(dpDir, /\.json$/).forEach((file) => {
      const dp = readJSON(path.join(dpDir, file));
      if (dp) state.decision_proposals.push(dp);
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
    state.mode = (process.env.LLM_MODE || "api").toUpperCase();

    // Add e2e test result if available
    const e2eResultFile = path.join(stateDir, "e2e-test-result.json");
    state.e2e_test_result = readJSON(e2eResultFile) || null;

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
      listFilesInDir(tasksDir, /\.json$/).forEach((file) => {
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
      goals: path.join(repoRoot, "goals"),
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
      const { taskId, title, laneType, executor } = body;
      if (!taskId || !title) {
        respondError(res, 400, "Missing taskId or title");
        return;
      }
      const result = execSync(
        `node scripts/new-task.mjs "${taskId}" "${laneType || 'feature-lane'}" "${title}" "${executor || 'codex'}"`,
        { cwd: automationRoot, stdio: "pipe" }
      ).toString();
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

  // === INTERVENTION ENDPOINTS ===

  "POST /api/tasks/:taskid/advance": async (req, res, params) => {
    // Manually advance a task to the next pipeline stage
    try {
      const body = await parseJsonBody(req);
      const { targetState } = body;
      const taskId = params.taskid;
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
      if (!fs.existsSync(taskFile)) { respondError(res, 404, "Task not found"); return; }
      const task = readJSON(taskFile);
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
      const editable = ['title', 'executor', 'lane_type', 'state', 'runtime_status', 'branch_name'];
      for (const key of editable) {
        if (body[key] !== undefined) task[key] = body[key];
      }
      task.updated_at = new Date().toISOString();
      fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
      respondJSON(res, 200, { success: true, task });
    } catch (e) { respondError(res, 500, e.message); }
  },

  "POST /api/tasks/:taskid/run-step": async (req, res, params) => {
    // Run a single pipeline step for a task (architect, critique, synthesize, etc.)
    try {
      const body = await parseJsonBody(req);
      const { step } = body;
      const taskId = params.taskid;
      const validSteps = ['architect', 'critique', 'synthesize', 'execute', 'propose-followups', 'pr-draft'];
      if (!validSteps.includes(step)) {
        respondError(res, 400, `Invalid step. Valid: ${validSteps.join(', ')}`);
        return;
      }
      const scriptMap = {
        'architect': 'architect-task-api.mjs',
        'critique': 'critique-task-api.mjs',
        'synthesize': 'synthesize-task-api.mjs',
        'propose-followups': 'propose-followups-api.mjs',
        'pr-draft': 'draft-pr-api.mjs'
      };
      const script = scriptMap[step];
      if (!script) {
        respondError(res, 400, `Step '${step}' cannot be run individually`);
        return;
      }
      // Run async - don't block the response
      const { exec } = require("child_process");
      exec(`node scripts/${script} ${taskId}`, { cwd: automationRoot }, (err, stdout, stderr) => {
        if (err) console.error(`Step ${step} for ${taskId} failed:`, stderr);
        else console.log(`Step ${step} for ${taskId} completed:`, stdout.trim());
      });
      respondJSON(res, 202, { success: true, message: `Step '${step}' started for ${taskId}` });
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
          'propose-followups': `node scripts/propose-followups-api.mjs ${taskId}`,
        };
        cmd = scriptMap[step];
      }
      if (!cmd) { respondError(res, 400, "Invalid step/target combination"); return; }
      const { exec } = require("child_process");
      exec(cmd, { cwd: automationRoot }, (err, stdout, stderr) => {
        if (err) console.error(`Run step failed:`, stderr);
        else console.log(`Run step completed:`, stdout.trim());
      });
      respondJSON(res, 202, { success: true, message: `Running: ${cmd}` });
    } catch (e) { respondError(res, 500, e.message); }
  },

  "GET /api/decisions": (req, res) => {
    const dpDir = path.join(getStateDir(), "decision_proposals");
    const decDir = path.join(getStateDir(), "decisions");

    const proposals = listFilesInDir(dpDir, /\.json$/).map(f => readJSON(path.join(dpDir, f))).filter(Boolean);
    const decisions = listFilesInDir(decDir, /\.json$/).map(f => readJSON(path.join(decDir, f))).filter(Boolean);

    respondJSON(res, 200, { decision_proposals: proposals, decisions });
  }
};

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
  } else {
    // Try to serve static files from ui/
    const filePath = path.join(getUIDir(), pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(getUIDir())) {
      respondError(res, 403, "Forbidden");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
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

      respondFile(res, filePath, contentType);
    } else {
      respondError(res, 404, "Not found");
    }
  }
});

server.listen(PORT, () => {
  console.log(`Dashboard server listening on http://localhost:${PORT}`);
  console.log(`  State dir: ${getStateDir()}`);
  console.log(`  UI dir: ${getUIDir()}`);
});

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  server.close();
  process.exit(0);
});
