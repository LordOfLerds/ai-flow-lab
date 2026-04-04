import { describe, expect, it } from "vitest";
import { parseStatusFlag, buildDemoTasks } from "../src/index.js";
import { listTasks } from "../src/tasks.js";

describe("cli demo", () => {
  it("parses valid status flags", () => {
    expect(parseStatusFlag(["node", "file", "--status", "open"])).toBe("open");
    expect(parseStatusFlag(["node", "file", "--status", "done"])).toBe("done");
  });

  it("returns undefined when no flag provided", () => {
    expect(parseStatusFlag(["node", "file"])).toBeUndefined();
  });

  it("builds demo tasks with a done item", () => {
    const tasks = buildDemoTasks();
    expect(tasks).toHaveLength(2);
    expect(listTasks(tasks, "done")).toHaveLength(1);
  });
});
