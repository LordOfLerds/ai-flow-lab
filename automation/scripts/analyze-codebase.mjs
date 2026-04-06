#!/usr/bin/env node
/**
 * analyze-codebase.mjs — Scans a project directory and produces a structured analysis report.
 * Used by import-project.mjs to generate the ChatGPT import prompt.
 *
 * Usage: node analyze-codebase.mjs <project-path>
 * Output: JSON to stdout
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "__pycache__",
  ".venv", "venv", ".tox", "target", "vendor", ".cache", "coverage",
  ".nyc_output", ".parcel-cache", ".turbo", ".vercel", ".output"
]);

const IGNORE_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  ".DS_Store", "Thumbs.db"
]);

const TECH_INDICATORS = {
  "package.json": "Node.js",
  "tsconfig.json": "TypeScript",
  "Cargo.toml": "Rust",
  "pyproject.toml": "Python",
  "requirements.txt": "Python",
  "Pipfile": "Python",
  "go.mod": "Go",
  "Gemfile": "Ruby",
  "pom.xml": "Java/Maven",
  "build.gradle": "Java/Gradle",
  "composer.json": "PHP",
  "Dockerfile": "Docker",
  "docker-compose.yml": "Docker Compose",
  "docker-compose.yaml": "Docker Compose",
  ".github/workflows": "GitHub Actions",
  "Makefile": "Make",
  "next.config.js": "Next.js",
  "next.config.mjs": "Next.js",
  "next.config.ts": "Next.js",
  "nuxt.config.ts": "Nuxt",
  "vite.config.ts": "Vite",
  "webpack.config.js": "Webpack",
  "tailwind.config.js": "Tailwind CSS",
  "tailwind.config.ts": "Tailwind CSS",
  "prisma/schema.prisma": "Prisma ORM",
  ".env": "Environment config",
  ".env.example": "Environment config",
  "supabase/config.toml": "Supabase",
  "firebase.json": "Firebase",
  "vercel.json": "Vercel",
  "netlify.toml": "Netlify",
};

const SOURCE_EXTENSIONS = new Set([
  ".js", ".ts", ".jsx", ".tsx", ".py", ".rs", ".go", ".rb",
  ".java", ".php", ".vue", ".svelte", ".swift", ".kt"
]);

const DOC_FILES = [
  "README.md", "README.rst", "README.txt", "readme.md",
  "CONTRIBUTING.md", "CHANGELOG.md", "ARCHITECTURE.md",
  "docs/README.md", "docs/ARCHITECTURE.md", "docs/DESIGN.md",
  "API.md", "DESIGN.md"
];

function scanDirectory(dir, maxDepth = 4, currentDepth = 0) {
  const tree = [];
  if (currentDepth > maxDepth) return tree;

  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return tree; }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (IGNORE_FILES.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const children = scanDirectory(fullPath, maxDepth, currentDepth + 1);
      tree.push({ name: entry.name + "/", type: "dir", children });
    } else {
      const ext = path.extname(entry.name);
      const size = fs.statSync(fullPath).size;
      tree.push({ name: entry.name, type: "file", ext, size });
    }
  }
  return tree;
}

function treeToString(tree, indent = "") {
  let result = "";
  for (const item of tree) {
    if (item.type === "dir") {
      result += `${indent}${item.name}\n`;
      if (item.children) result += treeToString(item.children, indent + "  ");
    } else {
      result += `${indent}${item.name}\n`;
    }
  }
  return result;
}

function detectTechnologies(projectPath) {
  const found = [];
  for (const [indicator, tech] of Object.entries(TECH_INDICATORS)) {
    const checkPath = path.join(projectPath, indicator);
    if (fs.existsSync(checkPath)) {
      found.push(tech);
    }
  }
  return [...new Set(found)];
}

function readPackageInfo(projectPath) {
  const files = ["package.json", "Cargo.toml", "pyproject.toml", "go.mod", "composer.json"];
  const result = {};
  for (const f of files) {
    const fp = path.join(projectPath, f);
    if (fs.existsSync(fp)) {
      try {
        const content = fs.readFileSync(fp, "utf8");
        if (f === "package.json") {
          const pkg = JSON.parse(content);
          result[f] = {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            dependencies: Object.keys(pkg.dependencies || {}),
            devDependencies: Object.keys(pkg.devDependencies || {}),
            scripts: Object.keys(pkg.scripts || {})
          };
        } else {
          result[f] = content.substring(0, 1500);
        }
      } catch { /* skip */ }
    }
  }
  return result;
}

function findExistingDocs(projectPath) {
  const docs = {};
  for (const docFile of DOC_FILES) {
    const fp = path.join(projectPath, docFile);
    if (fs.existsSync(fp)) {
      try {
        const content = fs.readFileSync(fp, "utf8");
        docs[docFile] = content.substring(0, 3000);
      } catch { /* skip */ }
    }
  }
  return docs;
}

function getGitInfo(projectPath) {
  try {
    const branches = execSync("git branch -a --format='%(refname:short)'", { cwd: projectPath, encoding: "utf8" }).trim().split("\n").filter(Boolean);
    const recentCommits = execSync("git log --oneline -10", { cwd: projectPath, encoding: "utf8" }).trim();
    const contributors = execSync("git shortlog -sn --no-merges HEAD 2>/dev/null | head -10", { cwd: projectPath, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    return { branches: branches.slice(0, 20), recentCommits, contributors };
  } catch {
    return { branches: [], recentCommits: "not a git repo", contributors: "" };
  }
}

function sampleSourceFiles(projectPath, maxFiles = 5) {
  const samples = [];
  function walk(dir, depth = 0) {
    if (depth > 3 || samples.length >= maxFiles) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (samples.length >= maxFiles) return;
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        try {
          const content = fs.readFileSync(full, "utf8");
          if (content.length > 100 && content.length < 50000) {
            const relative = path.relative(projectPath, full);
            // Take first 80 lines as sample
            const lines = content.split("\n").slice(0, 80).join("\n");
            samples.push({ path: relative, preview: lines, totalLines: content.split("\n").length });
          }
        } catch { /* skip */ }
      }
    }
  }
  // Prioritize: look in src/, lib/, app/ first
  for (const dir of ["src", "lib", "app", "server", "api", "pages"]) {
    const fp = path.join(projectPath, dir);
    if (fs.existsSync(fp)) walk(fp);
  }
  // Then root
  if (samples.length < maxFiles) walk(projectPath);
  return samples;
}

function countFiles(projectPath) {
  let total = 0;
  let byExt = {};
  function walk(dir, depth = 0) {
    if (depth > 5) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (IGNORE_DIRS.has(e.name) || e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else {
        total++;
        const ext = path.extname(e.name) || "(none)";
        byExt[ext] = (byExt[ext] || 0) + 1;
      }
    }
  }
  walk(projectPath);
  // Sort by count, top 15
  const sorted = Object.entries(byExt).sort((a, b) => b[1] - a[1]).slice(0, 15);
  return { total, byExtension: Object.fromEntries(sorted) };
}

// --- Main ---
const projectPath = process.argv[2];
if (!projectPath) {
  console.error("Usage: node analyze-codebase.mjs <project-path>");
  process.exit(1);
}

const absPath = path.resolve(projectPath);
if (!fs.existsSync(absPath)) {
  console.error(`Path does not exist: ${absPath}`);
  process.exit(1);
}

const name = path.basename(absPath);
const tree = scanDirectory(absPath);
const treeStr = treeToString(tree);
const tech = detectTechnologies(absPath);
const pkgInfo = readPackageInfo(absPath);
const docs = findExistingDocs(absPath);
const git = getGitInfo(absPath);
const samples = sampleSourceFiles(absPath);
const fileCounts = countFiles(absPath);

const report = {
  name,
  path: absPath,
  directoryTree: treeStr,
  detectedTechnologies: tech,
  packageInfo: pkgInfo,
  existingDocs: docs,
  gitInfo: git,
  sourceSamples: samples,
  fileCounts,
  analyzedAt: new Date().toISOString()
};

console.log(JSON.stringify(report, null, 2));
