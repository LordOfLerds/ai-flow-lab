import fs from "node:fs";
import path from "node:path";

const [goalId, title, priority = "normal"] = process.argv.slice(2);

if (!goalId || !title) {
  console.error("Usage: node scripts/start-goal.mjs <GOAL_ID> <TITLE> [PRIORITY]");
  process.exit(1);
}

const automationRoot = process.cwd();
const repoRoot = path.resolve(automationRoot, "..");

const goalStateDir = path.join(automationRoot, "state", "goals");
fs.mkdirSync(goalStateDir, { recursive: true });

const goalJsonPath = path.join(goalStateDir, `${goalId}.json`);
const goalMdPath = path.join(repoRoot, "goals", `${goalId}.md`);

const goal = {
  goal_id: goalId,
  title,
  priority,
  state: "NEW",
  first_task_id: "",
  latest_task_id: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

fs.writeFileSync(goalJsonPath, JSON.stringify(goal, null, 2));

if (!fs.existsSync(goalMdPath)) {
  fs.writeFileSync(goalMdPath, `# ${goalId}

## Title
${title}

## Priority
${priority}

## Goal statement
[TBD]

## Constraints
[TBD]

## Non-goals
[TBD]

## Owner notes
[TBD]
`);
}

console.log(`Created ${goalJsonPath}`);
console.log(`Created goals/${goalId}.md`);
