import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec, execSync } from "node:child_process";

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

    // Load tasks — also check which doc files actually exist on disk
    const tasksDir = path.join(stateDir, "tasks");
    const docFields = ["spec_path", "review_path", "brief_path", "result_path", "followup_path", "pr_draft_path"];
    listFilesInDir(tasksDir, /\.json$/).forEach((file) => {
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
      const validSteps = ['architect', 'critique', 'synthesize', 'propose-followups', 'pr-draft'];
      if (!validSteps.includes(step)) {
        respondError(res, 400, `Invalid step. Valid: ${validSteps.join(', ')}`);
        return;
      }
      const scriptMap = {
        'architect': 'architect-task-api.mjs',
        'critique': 'critique-task-api.mjs',
        'synthesize': 'synthesize-task-api.mjs',
        'propose-followups': 'propose-followups-api.mjs',
        'pr-draft': 'generate-pr-draft.mjs'
      };
      const stateAfterStep = {
        'architect': 'ARCHITECTED',
        'critique': 'CRITIQUED',
        'synthesize': 'SYNTHESIZED',
        'propose-followups': 'FOLLOWUPS_PROPOSED',
        'pr-draft': 'PR_DRAFTED'
      };
      const nextStep = {
        'architect': 'critique',
        'critique': 'synthesize',
        'synthesize': 'propose-followups',
        'propose-followups': 'pr-draft'
      };
      const script = scriptMap[step];
      if (!script) {
        respondError(res, 400, `Step '${step}' cannot be run individually`);
        return;
      }

      // Update runtime_status to running
      const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
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
          exec(`node scripts/${s} ${taskId}`, { cwd: automationRoot, timeout: 60000 }, (err, stdout, stderr) => {
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
                // Auto-git-commit after successful step
                try {
                  const tf2 = readJSON(taskFile);
                  const taskTitle = tf2?.title || taskId;
                  const taskType = (tf2?.lane_type || 'feature-lane').replace('-lane','');
                  const commitMsg = `[${taskId}] [${taskType}] ${stepName}: ${taskTitle}`;
                  execSync(`git add -A && git diff --cached --quiet || git commit -m "${commitMsg.replace(/"/g,'\\"')}"`, { cwd: repoRoot, stdio: 'pipe', timeout: 10000 });
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

      // If autoAdvance, chain next steps
      if (autoAdvance && result.ok) {
        let current = step;
        while (nextStep[current]) {
          const next = nextStep[current];
          console.log(`[PIPELINE] Auto-advancing to ${next}...`);
          // Update current_step
          try {
            const tf = readJSON(taskFile);
            if (tf) { tf.current_step = next; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
          } catch (_) {}
          const r = await runStep(next);
          if (!r.ok) { console.error(`[PIPELINE] Auto-advance stopped at ${next}: ${r.error}`); break; }
          current = next;
        }
      }

      // Mark runtime as done
      try {
        const tf = readJSON(taskFile);
        if (tf) { tf.runtime_status = "QUEUED"; tf.current_step = null; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
      } catch (_) {}

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
  },

  // ===== CASCADE ENGINE: Auto-spawn follow-ups and run recursively =====

  "POST /api/cascade/run-task": async (req, res) => {
    // Run a task through full pipeline, then auto-spawn follow-ups with should_spawn_now=true, and run those too
    try {
      const body = await parseJsonBody(req);
      const { taskId, maxDepth = 3, currentDepth = 0 } = body;
      if (!taskId) { respondError(res, 400, "Missing taskId"); return; }

      respondJSON(res, 202, { success: true, message: `Cascade started for ${taskId} (depth ${currentDepth}/${maxDepth})` });

      // Run in background
      (async () => {
        try {
          console.log(`[CASCADE] Starting ${taskId} (depth ${currentDepth}/${maxDepth})`);
          const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);

          // Run full pipeline
          const steps = ['architect', 'critique', 'synthesize', 'propose-followups', 'pr-draft'];
          const scriptMap = {
            'architect': 'architect-task-api.mjs',
            'critique': 'critique-task-api.mjs',
            'synthesize': 'synthesize-task-api.mjs',
            'propose-followups': 'propose-followups-api.mjs',
            'pr-draft': 'generate-pr-draft.mjs'
          };
          const stateAfterStep = {
            'architect': 'ARCHITECTED',
            'critique': 'CRITIQUED',
            'synthesize': 'SYNTHESIZED',
            'propose-followups': 'FOLLOWUPS_PROPOSED',
            'pr-draft': 'PR_DRAFTED'
          };

          // Update runtime status
          try {
            const tf = readJSON(taskFile);
            if (tf) { tf.runtime_status = "running"; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
          } catch (_) {}

          for (const stepName of steps) {
            const s = scriptMap[stepName];
            console.log(`[CASCADE] ${taskId}: running ${stepName}...`);
            try {
              execSync(`node scripts/${s} ${taskId}`, { cwd: automationRoot, stdio: 'pipe', timeout: 120000 });
              // Advance state
              const tf = readJSON(taskFile);
              if (tf && stateAfterStep[stepName]) {
                tf.state = stateAfterStep[stepName];
                tf.current_step = stepName;
                tf.updated_at = new Date().toISOString();
                fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
              }
              // Auto-git-commit
              try {
                const tf2 = readJSON(taskFile);
                const taskTitle = tf2?.title || taskId;
                const taskType = (tf2?.lane_type || 'feature-lane').replace('-lane','');
                const commitMsg = `[${taskId}] [${taskType}] ${stepName}: ${taskTitle}`;
                execSync(`git add -A && git diff --cached --quiet || git commit -m "${commitMsg.replace(/"/g,'\\"')}"`, { cwd: repoRoot, stdio: 'pipe', timeout: 10000 });
                console.log(`[CASCADE][GIT] Auto-committed: ${commitMsg}`);
              } catch (gitErr) { console.warn(`[CASCADE][GIT] skip:`, gitErr.message?.substring(0,80)); }
            } catch (stepErr) {
              console.error(`[CASCADE] ${taskId}: ${stepName} FAILED:`, stepErr.message?.substring(0,200));
              break;
            }
          }

          // Mark runtime done
          try {
            const tf = readJSON(taskFile);
            if (tf) { tf.runtime_status = "IDLE"; tf.current_step = null; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
          } catch (_) {}

          console.log(`[CASCADE] ${taskId}: pipeline complete → ${readJSON(taskFile)?.state}`);

          // Auto-spawn follow-ups if within depth limit
          if (currentDepth < maxDepth) {
            const proposalsDir = path.join(getStateDir(), "proposals");
            const proposals = listFilesInDir(proposalsDir, /\.json$/)
              .map(f => readJSON(path.join(proposalsDir, f)))
              .filter(p => p && p.parent_task_id === taskId && p.should_spawn_now === true);

            if (proposals.length > 0) {
              console.log(`[CASCADE] ${taskId}: spawning ${proposals.length} follow-up tasks...`);
              for (const proposal of proposals) {
                const newId = nextTaskId();
                try {
                  execSync(`node scripts/spawn-followup-task.mjs ${proposal.proposal_id} ${newId}`, { cwd: automationRoot, stdio: 'pipe' });
                  console.log(`[CASCADE] Spawned ${newId} from ${proposal.proposal_id}`);

                  // Recursively cascade the new task
                  setTimeout(() => {
                    cascadeRunTask(newId, maxDepth, currentDepth + 1);
                  }, 500);
                } catch (spawnErr) {
                  console.error(`[CASCADE] Failed to spawn ${proposal.proposal_id}:`, spawnErr.message?.substring(0,100));
                }
              }
            }
          }
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

      (async () => {
        try {
          console.log(`[CASCADE] Goal ${goalId}: planning...`);

          // Step 1: Plan the goal (decompose into proposals)
          try {
            execSync(`node scripts/plan-goal-api.mjs ${goalId}`, { cwd: automationRoot, stdio: 'pipe', timeout: 120000 });
            console.log(`[CASCADE] Goal ${goalId}: planning complete`);
          } catch (planErr) {
            console.error(`[CASCADE] Goal plan failed:`, planErr.message?.substring(0,200));
            return;
          }

          // Auto-git-commit goal plan
          try {
            execSync(`git add -A && git diff --cached --quiet || git commit -m "goal: plan ${goalId}"`, { cwd: repoRoot, stdio: 'pipe', timeout: 10000 });
          } catch (_) {}

          // Step 2: Find all spawnable proposals for this goal
          const proposalsDir = path.join(getStateDir(), "proposals");
          const goalProposals = listFilesInDir(proposalsDir, /\.json$/)
            .map(f => readJSON(path.join(proposalsDir, f)))
            .filter(p => p && (p.parent_goal_id === goalId || (p.proposal_id && p.proposal_id.startsWith(goalId))));

          console.log(`[CASCADE] Goal ${goalId}: found ${goalProposals.length} proposals`);

          // Step 3: Spawn all proposals as tasks
          const spawnedTaskIds = [];
          for (const proposal of goalProposals) {
            const newId = nextTaskId();
            try {
              execSync(`node scripts/spawn-from-goal-proposal.mjs ${proposal.proposal_id} ${newId}`, { cwd: automationRoot, stdio: 'pipe' });
              // Link task to goal
              const taskFile = path.join(getStateDir(), "tasks", `${newId}.json`);
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
            execSync(`git add -A && git diff --cached --quiet || git commit -m "goal: spawn ${spawnedTaskIds.length} tasks for ${goalId}"`, { cwd: repoRoot, stdio: 'pipe', timeout: 10000 });
          } catch (_) {}

          // Update goal state
          const goalFile = path.join(getStateDir(), "goals", `${goalId}.json`);
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

  "GET /api/cascade/status": (req, res) => {
    // Return cascade status: active tasks, queued, completed
    const tasksDir = path.join(getStateDir(), "tasks");
    const tasks = listFilesInDir(tasksDir, /\.json$/).map(f => readJSON(path.join(tasksDir, f))).filter(Boolean);
    const running = tasks.filter(t => t.runtime_status === 'running');
    const queued = tasks.filter(t => t.state === 'NEW');
    const completed = tasks.filter(t => t.state === 'PR_DRAFTED' || t.state === 'MERGED');
    const proposalsDir = path.join(getStateDir(), "proposals");
    const pendingProposals = listFilesInDir(proposalsDir, /\.json$/)
      .map(f => readJSON(path.join(proposalsDir, f)))
      .filter(p => p && p.should_spawn_now === true);

    respondJSON(res, 200, {
      running: running.map(t => ({ id: t.task_id, step: t.current_step })),
      queued: queued.length,
      completed: completed.length,
      total: tasks.length,
      pending_auto_spawns: pendingProposals.length
    });
  }
};

// ===== CASCADE HELPERS =====

function nextTaskId() {
  const tasksDir = path.join(getStateDir(), "tasks");
  fs.mkdirSync(tasksDir, { recursive: true });
  const existing = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
  let maxNum = 0;
  for (const f of existing) {
    const m = f.match(/T-(\d+)\.json$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return `T-${String(maxNum + 1).padStart(4, '0')}`;
}

async function cascadeRunTask(taskId, maxDepth, currentDepth) {
  const taskFile = path.join(getStateDir(), "tasks", `${taskId}.json`);
  const steps = ['architect', 'critique', 'synthesize', 'propose-followups', 'pr-draft'];
  const scriptMap = {
    'architect': 'architect-task-api.mjs',
    'critique': 'critique-task-api.mjs',
    'synthesize': 'synthesize-task-api.mjs',
    'propose-followups': 'propose-followups-api.mjs',
    'pr-draft': 'generate-pr-draft.mjs'
  };
  const stateAfterStep = {
    'architect': 'ARCHITECTED',
    'critique': 'CRITIQUED',
    'synthesize': 'SYNTHESIZED',
    'propose-followups': 'FOLLOWUPS_PROPOSED',
    'pr-draft': 'PR_DRAFTED'
  };

  try {
    const tf0 = readJSON(taskFile);
    if (tf0) { tf0.runtime_status = "running"; tf0.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf0, null, 2)); }
  } catch (_) {}

  for (const stepName of steps) {
    console.log(`[CASCADE] ${taskId} (d=${currentDepth}): ${stepName}...`);
    try {
      execSync(`node scripts/${scriptMap[stepName]} ${taskId}`, { cwd: automationRoot, stdio: 'pipe', timeout: 120000 });
      const tf = readJSON(taskFile);
      if (tf && stateAfterStep[stepName]) {
        tf.state = stateAfterStep[stepName];
        tf.current_step = stepName;
        tf.updated_at = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2));
      }
      // Auto-git-commit
      try {
        const tf2 = readJSON(taskFile);
        const commitMsg = `[${taskId}] ${stepName}: ${tf2?.title || taskId}`;
        execSync(`git add -A && git diff --cached --quiet || git commit -m "${commitMsg.replace(/"/g,'\\"')}"`, { cwd: repoRoot, stdio: 'pipe', timeout: 10000 });
      } catch (_) {}
    } catch (stepErr) {
      console.error(`[CASCADE] ${taskId}: ${stepName} FAILED:`, stepErr.message?.substring(0,150));
      break;
    }
  }

  // Mark done
  try {
    const tf = readJSON(taskFile);
    if (tf) { tf.runtime_status = "IDLE"; tf.current_step = null; tf.updated_at = new Date().toISOString(); fs.writeFileSync(taskFile, JSON.stringify(tf, null, 2)); }
  } catch (_) {}

  // Auto-spawn follow-ups
  if (currentDepth < maxDepth) {
    const proposalsDir = path.join(getStateDir(), "proposals");
    const followups = listFilesInDir(proposalsDir, /\.json$/)
      .map(f => readJSON(path.join(proposalsDir, f)))
      .filter(p => p && p.parent_task_id === taskId && p.should_spawn_now === true);

    for (const proposal of followups) {
      const newId = nextTaskId();
      try {
        execSync(`node scripts/spawn-followup-task.mjs ${proposal.proposal_id} ${newId}`, { cwd: automationRoot, stdio: 'pipe' });
        console.log(`[CASCADE] Spawned follow-up ${newId} from ${proposal.proposal_id}`);
        await cascadeRunTask(newId, maxDepth, currentDepth + 1);
      } catch (spawnErr) {
        console.error(`[CASCADE] Spawn failed for ${proposal.proposal_id}:`, spawnErr.message?.substring(0,100));
      }
    }
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
