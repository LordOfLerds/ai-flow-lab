import fs from "node:fs";
import path from "node:path";

const [goalId, newState] = process.argv.slice(2);

if (!goalId || !newState) {
  console.error("Usage: node scripts/set-goal-state.mjs <GOAL_ID> <NEW_STATE>");
  process.exit(1);
}

const allowedStates = [
  "NEW",
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED_ON_DECISION",
  "COMPLETE"
];

if (!allowedStates.includes(newState)) {
  console.error(`Invalid state: ${newState}`);
  process.exit(1);
}

const automationRoot = process.cwd();
const file = path.join(automationRoot, "state", "goals", `${goalId}.json`);

if (!fs.existsSync(file)) {
  console.error(`Goal file not found: ${file}`);
  process.exit(1);
}

const goal = JSON.parse(fs.readFileSync(file, "utf8"));
goal.state = newState;
goal.updated_at = new Date().toISOString();

fs.writeFileSync(file, JSON.stringify(goal, null, 2));
console.log(`Updated ${goalId} -> ${newState}`);
