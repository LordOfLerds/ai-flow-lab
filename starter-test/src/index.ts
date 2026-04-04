import {
  createTask,
  listTasks,
  markDone,
  Task,
  TaskStatus,
} from "./tasks.js";

export function buildDemoTasks(): Task[] {
  let tasks: Task[] = [];
  tasks = createTask(tasks, "Learn workflow");
  tasks = createTask(tasks, "Test feature lane");
  tasks = markDone(tasks, 1);
  return tasks;
}

export function parseStatusFlag(argv: string[]): TaskStatus | undefined {
  const statusIndex = argv.indexOf("--status");
  if (statusIndex === -1) return undefined;

  const candidate = argv[statusIndex + 1];
  if (candidate === "open" || candidate === "done") {
    return candidate;
  }

  throw new Error(
    `--status expects "open" or "done" but received "${candidate ?? ""}"`,
  );
}

export function runDemo(argv: string[] = process.argv): void {
  const tasks = buildDemoTasks();
  const requestedStatus = parseStatusFlag(argv);

  console.log("ALL", listTasks(tasks));
  console.log("DONE", listTasks(tasks, "done"));

  if (requestedStatus) {
    console.log(
      `FILTERED(${requestedStatus.toUpperCase()})`,
      listTasks(tasks, requestedStatus),
    );
  }
}

if (import.meta.main) {
  try {
    runDemo(process.argv);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown CLI demo error";
    console.error(message);
    process.exit(1);
  }
}
