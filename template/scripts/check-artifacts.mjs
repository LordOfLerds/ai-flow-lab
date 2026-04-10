import fs from "node:fs";
import path from "node:path";

const [taskId] = process.argv.slice(2);

if (!taskId) {
  console.error("Usage: node scripts/check-artifacts.mjs <TASK_ID>");
  process.exit(1);
}

const automationRoot = process.cwd();
const repoRoot = path.resolve(automationRoot, "..");
const taskFile = path.join(automationRoot, "state", "tasks", `${taskId}.json`);

if (!fs.existsSync(taskFile)) {
  console.error(`Task file not found: ${taskFile}`);
  process.exit(1);
}

const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));

const required = [
  ["spec_path", task.spec_path],
  ["review_path", task.review_path],
  ["brief_path", task.brief_path],
];

let ok = true;

for (const [name, rel] of required) {
  if (!rel) {
    console.error(`Missing ${name} in task JSON`);
    ok = false;
    continue;
  }

  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) {
    console.error(`Missing file for ${name}: ${rel}`);
    ok = false;
  } else {
    console.log(`OK ${name}: ${rel}`);
  }
}

if (!ok) process.exit(1);

console.log(`All required artifacts exist for ${taskId}`);
