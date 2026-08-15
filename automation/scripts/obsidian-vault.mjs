#!/usr/bin/env node
/**
 * obsidian-vault.mjs — Bootstrap Obsidian vault + add frontmatter to existing docs
 *
 * Usage: node obsidian-vault.mjs [project-path]
 *
 * Creates minimal .obsidian/ config, adds YAML frontmatter to all existing
 * markdown docs, and adds [[wikilinks]] between related documents.
 */

import fs from "node:fs";
import path from "node:path";

const projectPath = path.resolve(process.argv[2] || path.resolve(process.cwd(), ".."));

// ─── Obsidian Config ───

function bootstrapObsidianConfig(root) {
  const obsDir = path.join(root, ".obsidian");
  fs.mkdirSync(obsDir, { recursive: true });

  // app.json — minimal settings
  const appConfig = {
    showLineNumber: true,
    strictLineBreaks: false,
    readableLineLength: true,
    defaultViewMode: "source"
  };
  fs.writeFileSync(path.join(obsDir, "app.json"), JSON.stringify(appConfig, null, 2));

  // appearance.json — dark theme
  const appearance = { theme: "obsidian" };
  fs.writeFileSync(path.join(obsDir, "appearance.json"), JSON.stringify(appearance, null, 2));

  // workspace.json — empty
  fs.writeFileSync(path.join(obsDir, "workspace.json"), JSON.stringify({}, null, 2));

  console.log(`  ✓ .obsidian/ config created`);
}

// ─── Frontmatter Injection ───

function hasFrontmatter(content) {
  return content.trimStart().startsWith('---');
}

function addFrontmatter(content, metadata) {
  if (hasFrontmatter(content)) return content;
  const fm = Object.entries(metadata)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`;
      return `${k}: ${v}`;
    })
    .join('\n');
  return `---\n${fm}\n---\n\n${content}`;
}

function inferDocType(relPath) {
  const lower = relPath.toLowerCase();
  if (lower.includes('spec')) return 'spec';
  if (lower.includes('review')) return 'review';
  if (lower.includes('brief')) return 'brief';
  if (lower.includes('result') || lower.includes('report')) return 'result';
  if (lower.includes('followup')) return 'followup';
  if (lower.includes('pr_draft') || lower.includes('pr-draft')) return 'pr-draft';
  if (lower.includes('domain_model') || lower.includes('domain-model')) return 'domain-model';
  if (lower.includes('architecture')) return 'architecture';
  if (lower.includes('invariant')) return 'invariants';
  if (lower.includes('agent')) return 'agents';
  return 'document';
}

function extractTaskId(relPath) {
  const m = relPath.match(/T-\d{4}/);
  return m ? m[0] : '';
}

function extractGoalId(relPath) {
  const m = relPath.match(/G-\d{4}/);
  return m ? m[0] : '';
}

function processExistingDocs(root) {
  const docDirs = ['docs', 'ai/specs', 'ai/reviews', 'ai/briefs', 'ai/results', 'ai/followups', 'ai/pr', 'goals', 'knowledge', 'knowledge/decisions', 'knowledge/learnings', 'knowledge/context', 'automation/docs/user', 'automation/docs/dev', 'automation/docs/internal'];
  const rootFiles = ['CLAUDE.md', 'AGENTS.md', 'README.md'];
  let count = 0;

  for (const dir of docDirs) {
    const absDir = path.join(root, dir);
    if (!fs.existsSync(absDir)) continue;
    const files = fs.readdirSync(absDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const absFile = path.join(absDir, file);
      const relPath = path.join(dir, file);
      const content = fs.readFileSync(absFile, 'utf8');
      if (hasFrontmatter(content)) continue;

      const type = inferDocType(relPath);
      const taskId = extractTaskId(file);
      const goalId = extractGoalId(file);
      const metadata = {
        type,
        task_id: taskId,
        goal_id: goalId,
        created: new Date().toISOString().split('T')[0],
        tags: `[ai-flow-lab, ${type}]`
      };

      const updated = addFrontmatter(content, metadata);
      fs.writeFileSync(absFile, updated);
      count++;
    }
  }

  // Root-level files
  for (const file of rootFiles) {
    const absFile = path.join(root, file);
    if (!fs.existsSync(absFile)) continue;
    const content = fs.readFileSync(absFile, 'utf8');
    if (hasFrontmatter(content)) continue;

    const type = file === 'AGENTS.md' ? 'agents' : file === 'CLAUDE.md' ? 'claude-config' : 'readme';
    const updated = addFrontmatter(content, {
      type,
      created: new Date().toISOString().split('T')[0],
      tags: `[ai-flow-lab, ${type}]`
    });
    fs.writeFileSync(absFile, updated);
    count++;
  }

  console.log(`  ✓ Added frontmatter to ${count} existing docs`);
  return count;
}

// ─── Wikilinks ───

function addWikilinks(root) {
  // Build a map of task_id → related docs
  const taskDocs = {};
  const docDirs = ['ai/specs', 'ai/reviews', 'ai/briefs', 'ai/results', 'ai/followups', 'ai/pr'];

  for (const dir of docDirs) {
    const absDir = path.join(root, dir);
    if (!fs.existsSync(absDir)) continue;
    const files = fs.readdirSync(absDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const taskId = extractTaskId(file);
      if (!taskId) continue;
      if (!taskDocs[taskId]) taskDocs[taskId] = [];
      taskDocs[taskId].push({ dir, file, type: inferDocType(file) });
    }
  }

  // For each doc, add links to related docs
  let linkCount = 0;
  for (const [taskId, docs] of Object.entries(taskDocs)) {
    if (docs.length < 2) continue;
    for (const doc of docs) {
      const absFile = path.join(root, doc.dir, doc.file);
      let content = fs.readFileSync(absFile, 'utf8');

      // Check if links section already exists
      if (content.includes('## Related Documents')) continue;

      const links = docs
        .filter(d => d.file !== doc.file)
        .map(d => `- [[${d.dir}/${d.file}|${taskId} ${d.type}]]`)
        .join('\n');

      content += `\n\n## Related Documents\n${links}\n`;
      fs.writeFileSync(absFile, content);
      linkCount++;
    }
  }

  console.log(`  ✓ Added wikilinks to ${linkCount} docs`);
}

// ─── Main ───

console.log(`\n📓 Obsidian Vault Setup: ${projectPath}\n`);

if (!fs.existsSync(projectPath)) {
  console.error(`Path not found: ${projectPath}`);
  process.exit(1);
}

bootstrapObsidianConfig(projectPath);
processExistingDocs(projectPath);
addWikilinks(projectPath);

console.log(`\n✅ Obsidian vault ready! Open "${path.basename(projectPath)}" as a vault in Obsidian.`);
