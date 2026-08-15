import fs from "node:fs";
import path from "node:path";
import { automationRoot, repoRoot } from "./_llm-utils.mjs";

const [decisionId, topic, status = "accepted"] = process.argv.slice(2);

if (!decisionId || !topic) {
  console.error("Usage: node scripts/capture-decision.mjs <DECISION_ID> <TOPIC> [STATUS]");
  process.exit(1);
}

const autoRoot = automationRoot();
const _repoRoot = repoRoot();

const decisionStateDir = path.join(autoRoot, "state", "decisions");
fs.mkdirSync(decisionStateDir, { recursive: true });

const jsonPath = path.join(decisionStateDir, `${decisionId}.json`);
const mdPath = path.join(_repoRoot, "decisions", `${decisionId}.md`);

const decision = {
  decision_id: decisionId,
  topic,
  status,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

fs.writeFileSync(jsonPath, JSON.stringify(decision, null, 2));

if (!fs.existsSync(mdPath)) {
  fs.writeFileSync(mdPath, `# ${decisionId}

## Topic
${topic}

## Status
${status}

## Decision
[TBD]

## Scope
[TBD]

## Implications
[TBD]

## Follow-up tasks
[TBD]
`);
}

console.log(`Created ${jsonPath}`);
console.log(`Created decisions/${decisionId}.md`);
