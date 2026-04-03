import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const automationRoot = process.cwd();
const repoRoot = path.resolve(automationRoot, "..");

function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

const server = new Server(
  {
    name: "repo-context",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_truth_docs",
        description: "Read DOMAIN_MODEL, INVARIANTS, ARCHITECTURE",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "read_task",
        description: "Read one task JSON from automation/state/tasks",
        inputSchema: {
          type: "object",
          properties: {
            task_id: { type: "string" }
          },
          required: ["task_id"],
          additionalProperties: false
        }
      },
      {
        name: "list_active_tasks",
        description: "List all task JSON files",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "set_runtime_status",
        description: "Update runtime_status for a task",
        inputSchema: {
          type: "object",
          properties: {
            task_id: { type: "string" },
            runtime_status: {
              type: "string",
              enum: ["QUEUED", "RUNNING", "BLOCKED", "READY_FOR_PR", "STALE", "SUPERSEDED", "DONE"]
            }
          },
          required: ["task_id", "runtime_status"],
          additionalProperties: false
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "read_truth_docs") {
    const domain = readFileSafe(path.join(repoRoot, "docs", "DOMAIN_MODEL.md"));
    const invariants = readFileSafe(path.join(repoRoot, "docs", "INVARIANTS.md"));
    const architecture = readFileSafe(path.join(repoRoot, "docs", "ARCHITECTURE.md"));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ domain, invariants, architecture }, null, 2)
        }
      ]
    };
  }

  if (name === "read_task") {
    const schema = z.object({ task_id: z.string() });
    const parsed = schema.parse(args);
    const taskPath = path.join(automationRoot, "state", "tasks", `${parsed.task_id}.json`);
    const text = readFileSafe(taskPath);

    return {
      content: [{ type: "text", text }]
    };
  }

  if (name === "list_active_tasks") {
    const dir = path.join(automationRoot, "state", "tasks");
    const files: string[] = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f: string) => f.endsWith(".json"))
      : [];

    const tasks = files.map((f: string) => {
      const text = readFileSafe(path.join(dir, f));
      try {
        return JSON.parse(text);
      } catch {
        return { file: f, error: "invalid json" };
      }
    });

    return {
      content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }]
    };
  }

  if (name === "set_runtime_status") {
    const schema = z.object({
      task_id: z.string(),
      runtime_status: z.enum(["QUEUED", "RUNNING", "BLOCKED", "READY_FOR_PR", "STALE", "SUPERSEDED", "DONE"])
    });
    const parsed = schema.parse(args);
    const taskPath = path.join(automationRoot, "state", "tasks", `${parsed.task_id}.json`);
    const raw = readFileSafe(taskPath);

    if (!raw) {
      throw new Error(`Task not found: ${parsed.task_id}`);
    }

    const task = JSON.parse(raw);
    task.runtime_status = parsed.runtime_status;
    task.updated_at = new Date().toISOString();
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

    return {
      content: [{ type: "text", text: `Updated ${parsed.task_id} -> ${parsed.runtime_status}` }]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
