import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { PROJECTS_DIR, getProjectDocsPath, getProjectPath } from "./config";
import { readProjectMeta, readFileContent, readMarkdownWithFrontmatter, findFileInsensitive } from "./markdown";
import { parsePlan, parseCurrentStages, findCurrentStage, calculateStageProgress, CHECKBOX_REGEX } from "./parsers";
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

export function getLastCommitDate(slug: string): string | null {
  const projectDir = getProjectPath(slug);
  const gitDir = path.join(projectDir, ".git");

  if (!fs.existsSync(gitDir)) return null;

  try {
    const date = execSync(
      'git log -1 --pretty=format:"%aI"',
      { cwd: projectDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    return date || null;
  } catch {
    return null;
  }
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

  // Compute nearest deadline from incomplete stages
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let nearestDeadline: string | undefined;
  let deadlineStatus: "overdue" | "approaching" | "normal" | undefined;

  const incompleteDeadlines = plan
    .filter((s) => !s.completed && s.deadline)
    .map((s) => s.deadline!)
    .sort();

  if (incompleteDeadlines.length > 0) {
    nearestDeadline = incompleteDeadlines[0];
    const deadlineDate = new Date(nearestDeadline + "T00:00:00");
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      deadlineStatus = "overdue";
    } else if (daysUntil <= 7) {
      deadlineStatus = "approaching";
    } else {
      deadlineStatus = "normal";
    }
  }

  // Compute overall progress: completed stages / total stages
  const totalStages = plan.length;
  const completedStages = plan.filter((s) => s.completed).length;
  const overallProgress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return {
    slug,
    meta: {
      ...meta,
      name: meta.name || slug,
    },
    currentStage,
    currentStageProgress,
    overallProgress,
    git,
    nearestDeadline,
    deadlineStatus,
  };
}

export function getAllProjects(): ProjectSummary[] {
  const slugs = listProjectSlugs();
  const projects = slugs.map((slug) => ({
    ...getProjectSummary(slug),
    _lastCommit: getLastCommitDate(slug),
  }));

  // Sort by last commit date descending (most recent first), fallback to last_updated
  return projects.sort((a, b) => {
    const dateA = a._lastCommit || a.meta.last_updated || a.meta.created || "";
    const dateB = b._lastCommit || b.meta.last_updated || b.meta.created || "";
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
  const settings = getSettings();

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

  const bugsContent = `# Баг-трекер: ${name}

## Инструкция по ведению BUGS.md

### Назначение

Файл \`BUGS.md\` — локальный баг-трекер проекта. Хранит историю всех выявленных багов: открытых, исправленных и отклонённых. Позволяет быстро оценить текущее состояние качества проекта и не потерять контекст между сеансами работы.

### Правила заполнения

1. **Каждый баг** оформляется отдельным блоком внутри соответствующего раздела
2. **Формат записи:**
   \\\`\\\`\\\`
   ### BUG-{номер}: Краткое описание
   - **Статус:** Открыт | Исправлен | Отклонён
   - **Приоритет:** Критический | Высокий | Средний | Низкий
   - **Обнаружен:** YYYY-MM-DD
   - **Исправлен:** YYYY-MM-DD (если применимо)
   - **Описание:** Подробное описание проблемы
   - **Шаги воспроизведения:** (если применимо)
   - **Решение:** Что было сделано для исправления (если применимо)
   \\\`\\\`\\\`
3. **Нумерация** — сквозная, не сбрасывается при переносе в другой раздел
4. **При исправлении** бага — перенести запись из «Открытые» в «Исправленные», добавить дату и описание решения
5. **При отклонении** (не баг, дубликат, won't fix) — перенести в «Отклонённые» с пояснением

### Статусы

| Статус | Описание |
|---|---|
| **Открыт** | Баг обнаружен, ожидает исправления |
| **Исправлен** | Баг устранён, указан коммит/дата |
| **Отклонён** | Не является багом, дубликат или решено не исправлять |

> **Важно:** Этот файл создаётся в \`docs/\` каждого проекта, управляемого через Projects Manager. Именование — ЗАГЛАВНЫМИ буквами (\`BUGS.md\`), так как файл напрямую влияет на управление проектом.

---

## Открытые

_(нет открытых багов)_

## Исправленные

_(нет исправленных багов)_

## Отклонённые

_(нет отклонённых багов)_
`;

  const claudeMdContent = `# Инструкции для Claude Code

## Работа с проектами

Все проекты располагаются в \`G:/PROJECTS/\`. Каждый проект содержит папку \`docs/\` с файлами:
- \`PRD.md\` — описание продукта (с YAML frontmatter)
- \`PLAN.md\` — крупные этапы работ
- \`CURRENT_STAGES.md\` — детализация этапов
- \`BUGS.md\` — баг-трекер проекта

## Git-workflow: ветки и коммиты

### Ветвление (branching)

При добавлении новой фичи или изменении функционала **обязательно** работать в отдельной ветке:

1. **Создать ветку** от основной (\`main\` или \`master\`) с понятным именем:
   - \`feature/название-фичи\` — для новых функций
   - \`fix/описание-бага\` — для исправлений
   - \`refactor/что-рефакторим\` — для рефакторинга
2. **Переключиться** на новую ветку и вести разработку в ней
3. **Коммитить** по ходу работы (см. правила коммитов ниже)
4. **После завершения** фичи — предложить пользователю слияние в основную ветку
5. **Слияние в main/master выполнять ТОЛЬКО после согласия пользователя**
6. После слияния — удалить рабочую ветку

Примеры:
\`\`\`
git checkout -b feature/dark-theme
# ... разработка ...
git checkout main
git merge feature/dark-theme
git branch -d feature/dark-theme
\`\`\`

### Коммиты

После реализации фичи, исправления бага или внесения значимых изменений в проект — **обязательно создавай коммит** с описанием того, что было сделано. Не накапливай большое количество изменений без коммитов.

Правила:
- Коммит после каждого логически завершённого блока работы (фича, багфикс, рефакторинг)
- Сообщение коммита — на русском языке, кратко и по существу
- Не коммить секреты, \`.env\` файлы, \`node_modules\`
- Перед коммитом проверяй \`git status\` и \`git diff\`

> **Важно:** Эти правила применяются ко ВСЕМ проектам, управляемым через Projects Manager.

## Именование файлов в docs/

- **Основные документы** — ЗАГЛАВНЫМИ буквами: \`PRD.md\`, \`PLAN.md\`, \`CURRENT_STAGES.md\`, \`BUGS.md\`, \`BACKLOG.md\`
- **Второстепенные документы** — строчными буквами: \`interview.md\`, \`notes.md\`, \`research.md\`

Критерий: если файл напрямую влияет на управление проектом и отслеживание прогресса — заглавные. Если это вспомогательный/справочный материал — строчные.

> **Важно:** Это правило применяется ко ВСЕМ проектам в Projects Manager.

## Обновление статусов

При завершении этапа работ обновляй:
- \`CURRENT_STAGES.md\` — отмечай выполненные подэтапы
- \`PLAN.md\` — отмечай завершённые крупные этапы
- \`PRD.md\` frontmatter — обновляй \`last_updated\` и \`status\` при необходимости

## Снапшот состояния проекта

**После каждого коммита** обновляй раздел \`## Текущее состояние\` в этом файле (CLAUDE.md). Снапшот позволяет быстро поднять контекст в новом сеансе без чтения всех файлов.

Снапшот должен содержать:
- Текущая фаза и этап работ
- Что было сделано в последнем сеансе
- Что запланировано дальше
- Известные проблемы или блокеры (если есть)

> **Важно:** Это правило применяется ко ВСЕМ проектам, управляемым через Projects Manager.

## Формат файла CURRENT_STAGES.md

Файл используется приложением Projects Manager для отображения детализации этапов в интерфейсе. **Строго соблюдай формат**, иначе парсер не сможет корректно отобразить данные.

### Правила формата

1. **Заголовок файла** — \`# Текущие этапы: Название проекта\` (H1, игнорируется парсером)
2. **Каждый этап** — заголовок второго уровня: \`## Название этапа\`
3. **Статус этапа** — строка сразу после заголовка: \`Статус: В работе\`
   - Допустимые значения: Запланирован, В работе, На паузе, Завершён, Отменён
4. **Подэтапы** — список с чекбоксами markdown:
   - Незавершённый: \`- [ ] Название подэтапа — запланирован\`
   - В работе: \`- [ ] Название подэтапа — **в работе**\`
   - Завершённый: \`- [x] Название подэтапа — завершён 2026-04-11\`
5. **Не использовать** таблицы, эмодзи-маркеры, произвольные заголовки (\`## Этапы работ\`, \`## Обзор\` и т.п.)

### Пример правильного формата

\`\`\`markdown
# Текущие этапы: My Project

## Проектирование
Статус: Завершён

- [x] Составление PRD — завершён 2026-04-01
- [x] Определение архитектуры — завершён 2026-04-02
- [x] Выбор стека технологий — завершён 2026-04-02

## Разработка MVP
Статус: В работе

- [x] Инициализация проекта — завершён 2026-04-05
- [ ] Реализация API — **в работе**
- [ ] Вёрстка интерфейса — запланирован
- [ ] Интеграция с базой данных — запланирован

## Тестирование
Статус: Запланирован

- [ ] Unit-тесты — запланирован
- [ ] E2E-тесты — запланирован
\`\`\`

## Настройки GitHub

- **Имя пользователя:** ${settings.github.username || "(указать в настройках Projects Manager)"}
- **Email:** ${settings.github.email || "(указать в настройках Projects Manager)"}

---

## Текущее состояние

**Проект:** ${name}
**Описание:** ${description}

### Последний сеанс
- Проект создан через Projects Manager

### Следующие шаги
- Составить PRD и план работ
`;

  fs.writeFileSync(path.join(docsDir, "PRD.md"), prdContent, "utf-8");
  fs.writeFileSync(path.join(docsDir, "PLAN.md"), planContent, "utf-8");
  fs.writeFileSync(path.join(docsDir, "CURRENT_STAGES.md"), stagesContent, "utf-8");
  fs.writeFileSync(path.join(docsDir, "BUGS.md"), bugsContent, "utf-8");
  fs.writeFileSync(path.join(projectDir, "CLAUDE.md"), claudeMdContent, "utf-8");
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

export function setPlanDeadline(slug: string, stageIndex: number, deadline: string | null): void {
  const docsPath = getProjectDocsPath(slug);
  const planPath = findFileInsensitive(docsPath, "PLAN.md");

  if (!fs.existsSync(planPath)) {
    throw new Error("PLAN.md не найден");
  }

  const content = fs.readFileSync(planPath, "utf-8");
  const lines = content.split("\n");

  let stageCount = -1;
  let targetLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (CHECKBOX_REGEX.test(lines[i].trim())) {
      stageCount++;
      if (stageCount === stageIndex) {
        targetLine = i;
        break;
      }
    }
  }

  if (targetLine === -1) {
    throw new Error("Этап не найден");
  }

  let line = lines[targetLine];
  const endsWithCR = line.endsWith("\r");
  if (endsWithCR) {
    line = line.slice(0, -1);
  }

  // Remove existing deadline if present
  line = line.replace(/\s*deadline:\d{4}-\d{2}-\d{2}/, "");

  // Add new deadline if provided
  if (deadline) {
    line = line + ` deadline:${deadline}`;
  }

  if (endsWithCR) {
    line = line + "\r";
  }

  lines[targetLine] = line;
  fs.writeFileSync(planPath, lines.join("\n"), "utf-8");

  // Update last_updated in PRD
  updatePrdFrontmatter(slug, {});
}

export function generateReport(slug: string): string {
  const detail = getProjectDetail(slug);
  if (!detail) throw new Error("Проект не найден");

  const { meta, plan, stages, currentStage, currentStageProgress } = detail;

  const totalStages = plan.length;
  const completedStages = plan.filter((s) => s.completed).length;
  const overallProgress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  const now = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  const lines: string[] = [];

  lines.push(`# Отчёт: ${meta.name}`);
  lines.push("");
  lines.push(`**Дата отчёта:** ${now}`);
  lines.push("");

  lines.push("## Сводка");
  lines.push("");
  lines.push(`| Параметр | Значение |`);
  lines.push(`|---|---|`);
  lines.push(`| **Статус** | ${meta.status} |`);
  lines.push(`| **Общий прогресс** | ${overallProgress}% (${completedStages} из ${totalStages} этапов) |`);
  if (currentStage) {
    lines.push(`| **Текущий этап** | ${currentStage} (${currentStageProgress}%) |`);
  }
  lines.push(`| **Теги** | ${meta.tags.length > 0 ? meta.tags.join(", ") : "—"} |`);
  lines.push(`| **Создан** | ${meta.created} |`);
  lines.push(`| **Обновлён** | ${meta.last_updated} |`);
  lines.push("");

  if (meta.description) {
    lines.push("## Описание");
    lines.push("");
    lines.push(meta.description);
    lines.push("");
  }

  lines.push("## План работ");
  lines.push("");
  for (const stage of plan) {
    const check = stage.completed ? "x" : " ";
    let line = `- [${check}] **${stage.title}** — ${stage.description}`;
    if (stage.deadline) {
      line += ` (дедлайн: ${stage.deadline})`;
    }
    lines.push(line);
  }
  lines.push("");

  if (stages.length > 0) {
    lines.push("## Детализация этапов");
    lines.push("");
    for (const section of stages) {
      const total = section.substages.length;
      const done = section.substages.filter((s) => s.completed).length;
      lines.push(`### ${section.title} — ${section.status} (${done}/${total})`);
      lines.push("");
      for (const sub of section.substages) {
        const check = sub.completed ? "x" : " ";
        let line = `- [${check}] ${sub.title}`;
        if (sub.date) {
          line += ` — ${sub.date}`;
        }
        lines.push(line);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(`*Сгенерировано Projects Manager — ${now}*`);

  return lines.join("\n");
}
