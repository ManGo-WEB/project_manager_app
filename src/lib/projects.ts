import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { PROJECTS_DIR, getProjectDocsPath, getProjectPath } from "./config";
import { readProjectMeta, readFileContent, readMarkdownWithFrontmatter, findFileInsensitive } from "./markdown";
import { parsePlan, parseCurrentStages, findCurrentStage, calculateStageProgress } from "./parsers";
import matter from "gray-matter";
import type { ProjectSummary, ProjectDetail, GitStatus, ActivityEntry } from "@/types/project";
import { getSettings } from "./settings";

export function getGitStatus(slug: string): GitStatus {
  const projectDir = getProjectPath(slug);
  const gitDir = path.join(projectDir, ".git");

  if (!fs.existsSync(gitDir)) {
    return { initialized: false, hasUncommitted: false, unpushedCount: 0, hasRemote: false };
  }

  let hasUncommitted = false;
  let unpushedCount = 0;
  let hasRemote = false;

  try {
    const status = execSync("git status --porcelain", { cwd: projectDir, encoding: "utf-8" });
    hasUncommitted = status.trim().length > 0;
  } catch {
    // git error — treat as no uncommitted
  }

  try {
    const remotes = execSync("git remote", { cwd: projectDir, encoding: "utf-8" });
    hasRemote = remotes.trim().length > 0;
  } catch {
    // no remote
  }

  if (hasRemote) {
    try {
      const log = execSync("git log @{u}..HEAD --oneline", { cwd: projectDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
      unpushedCount = log.trim() ? log.trim().split("\n").length : 0;
    } catch {
      // No upstream — count all commits as unpushed
      try {
        const allLog = execSync("git log --oneline", { cwd: projectDir, encoding: "utf-8" });
        unpushedCount = allLog.trim() ? allLog.trim().split("\n").length : 0;
      } catch {
        // no commits at all
      }
    }
  }

  return { initialized: true, hasUncommitted, unpushedCount, hasRemote };
}

export function getProjectActivity(slug: string, limit: number = 50): ActivityEntry[] {
  const projectDir = getProjectPath(slug);
  const gitDir = path.join(projectDir, ".git");

  if (!fs.existsSync(gitDir)) {
    return [];
  }

  try {
    const log = execSync(
      `git log --pretty=format:"%H||%aI||%an||%s" -n ${limit}`,
      { cwd: projectDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );

    if (!log.trim()) return [];

    return log.trim().split("\n").map((line) => {
      const [hash, date, author, ...messageParts] = line.split("||");
      return {
        hash,
        date,
        author,
        message: messageParts.join("||"),
      };
    });
  } catch {
    return [];
  }
}

export function listProjectSlugs(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      const docsPath = path.join(PROJECTS_DIR, entry.name, "docs");
      return fs.existsSync(docsPath);
    })
    .map((entry) => entry.name);
}

export function getProjectSummary(slug: string): ProjectSummary {
  const docsPath = getProjectDocsPath(slug);
  const meta = readProjectMeta(docsPath);

  const planContent = readFileContent(findFileInsensitive(docsPath, "PLAN.md"));
  const stagesContent = readFileContent(findFileInsensitive(docsPath, "CURRENT_STAGES.md"));

  const plan = parsePlan(planContent);
  const stages = parseCurrentStages(stagesContent);
  const currentStage = findCurrentStage(plan);
  const currentStageProgress = calculateStageProgress(stages, currentStage);

  const git = getGitStatus(slug);

  return {
    slug,
    meta: {
      ...meta,
      name: meta.name || slug,
    },
    currentStage,
    currentStageProgress,
    git,
  };
}

export function getAllProjects(): ProjectSummary[] {
  const slugs = listProjectSlugs();
  const projects = slugs.map(getProjectSummary);

  // Sort by last_updated descending (most recent first)
  return projects.sort((a, b) => {
    const dateA = a.meta.last_updated || a.meta.created || "";
    const dateB = b.meta.last_updated || b.meta.created || "";
    return dateB.localeCompare(dateA);
  });
}

export function getProjectDetail(slug: string): ProjectDetail | null {
  const docsPath = getProjectDocsPath(slug);

  if (!fs.existsSync(docsPath)) {
    return null;
  }

  const meta = readProjectMeta(docsPath);

  const planContent = readFileContent(findFileInsensitive(docsPath, "PLAN.md"));
  const stagesContent = readFileContent(findFileInsensitive(docsPath, "CURRENT_STAGES.md"));

  const plan = parsePlan(planContent);
  const stages = parseCurrentStages(stagesContent);
  const currentStage = findCurrentStage(plan);
  const currentStageProgress = calculateStageProgress(stages, currentStage);

  const git = getGitStatus(slug);

  return {
    slug,
    meta: {
      ...meta,
      name: meta.name || slug,
    },
    plan,
    stages,
    currentStage,
    currentStageProgress,
    git,
  };
}

export function getProjectPrd(slug: string): { meta: Record<string, unknown>; content: string } | null {
  const docsPath = getProjectDocsPath(slug);
  const prdPath = findFileInsensitive(docsPath, "PRD.md");

  if (!fs.existsSync(prdPath)) {
    return null;
  }

  return readMarkdownWithFrontmatter(prdPath);
}

export function createProject(
  slug: string,
  name: string,
  description: string,
  tags: string[]
): void {
  const projectDir = path.join(PROJECTS_DIR, slug);
  const docsDir = path.join(projectDir, "docs");

  if (fs.existsSync(projectDir)) {
    throw new Error(`Проект "${slug}" уже существует`);
  }

  fs.mkdirSync(docsDir, { recursive: true });

  const now = new Date().toISOString().split("T")[0];

  const prdContent = `---
name: "${name}"
description: "${description}"
status: "Запланирован"
tags: ${JSON.stringify(tags)}
archived: false
created: "${now}"
last_updated: "${now}"
---

# PRD: ${name}

## Описание

${description}
`;

  const planContent = `# План работ: ${name}

- [ ] **Проектирование** — Составление PRD, определение архитектуры и стека технологий
`;

  const stagesContent = `# Текущие этапы: ${name}

## Проектирование
Статус: Запланирован

- [ ] Составление PRD — запланирован
- [ ] Определение архитектуры — запланирован
- [ ] Выбор стека технологий — запланирован
`;

  fs.writeFileSync(path.join(docsDir, "PRD.md"), prdContent, "utf-8");
  fs.writeFileSync(path.join(docsDir, "PLAN.md"), planContent, "utf-8");
  fs.writeFileSync(path.join(docsDir, "CURRENT_STAGES.md"), stagesContent, "utf-8");
}

export function initGit(slug: string): void {
  const projectDir = getProjectPath(slug);
  if (!fs.existsSync(projectDir)) {
    throw new Error(`Проект "${slug}" не найден`);
  }

  const gitDir = path.join(projectDir, ".git");
  if (fs.existsSync(gitDir)) {
    throw new Error("Git уже инициализирован");
  }

  execSync("git init", { cwd: projectDir });
  configureGitUser(projectDir);
  execSync("git add .", { cwd: projectDir });
  execSync('git commit -m "Инициализация git"', { cwd: projectDir });
}

function configureGitUser(projectDir: string): void {
  const settings = getSettings();
  if (!settings.github.username || !settings.github.email) return;

  execSync(`git config user.name "${settings.github.username}"`, { cwd: projectDir });
  execSync(`git config user.email "${settings.github.email}"`, { cwd: projectDir });
}

export function addRemote(slug: string, url: string): void {
  const projectDir = getProjectPath(slug);
  const gitDir = path.join(projectDir, ".git");

  if (!fs.existsSync(gitDir)) {
    throw new Error("Git не инициализирован");
  }

  configureGitUser(projectDir);

  // Check if origin already exists
  try {
    execSync("git remote get-url origin", { cwd: projectDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    execSync(`git remote set-url origin ${url}`, { cwd: projectDir });
  } catch {
    execSync(`git remote add origin ${url}`, { cwd: projectDir });
  }

  // Commit all uncommitted changes and push
  const status = execSync("git status --porcelain", { cwd: projectDir, encoding: "utf-8" });
  if (status.trim().length > 0) {
    execSync("git add .", { cwd: projectDir });
    execSync('git commit -m "Инициализация git"', { cwd: projectDir });
  }

  // Get current branch name
  const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: projectDir, encoding: "utf-8" }).trim();

  // Push with upstream tracking
  execSync(`git push -u origin ${branch}`, { cwd: projectDir, stdio: ["pipe", "pipe", "pipe"] });
}

function updatePrdFrontmatter(slug: string, updates: Record<string, unknown>): void {
  const docsPath = getProjectDocsPath(slug);
  const prdPath = findFileInsensitive(docsPath, "PRD.md");

  if (!fs.existsSync(prdPath)) {
    throw new Error("PRD.md не найден");
  }

  const raw = fs.readFileSync(prdPath, "utf-8");
  const { data, content } = matter(raw);

  const now = new Date().toISOString().split("T")[0];
  const updated = { ...data, ...updates, last_updated: now };

  const output = matter.stringify(content, updated);
  fs.writeFileSync(prdPath, output, "utf-8");
}

export function toggleArchive(slug: string, archived: boolean): void {
  updatePrdFrontmatter(slug, { archived });
}

export function updateProjectStatus(slug: string, status: string): void {
  updatePrdFrontmatter(slug, { status });
}

export function updateProjectTags(slug: string, tags: string[]): void {
  updatePrdFrontmatter(slug, { tags });
}

export function toggleSubstage(slug: string, sectionTitle: string, substageIndex: number): void {
  const docsPath = getProjectDocsPath(slug);
  const stagesPath = findFileInsensitive(docsPath, "CURRENT_STAGES.md");

  if (!fs.existsSync(stagesPath)) {
    throw new Error("CURRENT_STAGES.md не найден");
  }

  const content = fs.readFileSync(stagesPath, "utf-8");
  const lines = content.split("\n");

  let currentSection = "";
  let substageCount = -1;
  let targetLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith("## ")) {
      currentSection = trimmed.replace(/^##\s+/, "");
      substageCount = -1;
    }

    if (currentSection === sectionTitle && /^-\s+\[(x| )\]/.test(trimmed)) {
      substageCount++;
      if (substageCount === substageIndex) {
        targetLine = i;
        break;
      }
    }
  }

  if (targetLine === -1) {
    throw new Error("Подэтап не найден");
  }

  const line = lines[targetLine];
  const isCompleted = /^(\s*-\s+)\[x\]/.test(line);

  if (isCompleted) {
    // Uncheck: [x] → [ ], remove date suffix
    lines[targetLine] = line
      .replace(/\[x\]/, "[ ]")
      .replace(/\s*—\s*завершён\s+\d{4}-\d{2}-\d{2}/, "");
  } else {
    // Check: [ ] → [x], add date
    const now = new Date().toISOString().split("T")[0];
    lines[targetLine] = line.replace(/\[ \]/, "[x]") + ` — завершён ${now}`;
  }

  fs.writeFileSync(stagesPath, lines.join("\n"), "utf-8");

  // Update last_updated in PRD
  updatePrdFrontmatter(slug, {});
}
