import type {
  PlanStage,
  CurrentStageSection,
  SubStage,
  StageStatus,
} from "@/types/project";

const CHECKBOX_REGEX = /^-\s+\[(x| )\]\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/;
const SUBSTAGE_REGEX = /^-\s+\[(x| )\]\s+(.+)$/;
const STATUS_KEYWORDS: Record<string, StageStatus> = {
  "запланирован": "Запланирован",
  "в работе": "В работе",
  "на паузе": "На паузе",
  "завершён": "Завершён",
  "завершен": "Завершён",
  "отменён": "Отменён",
  "отменен": "Отменён",
};

export function parsePlan(content: string): PlanStage[] {
  const stages: PlanStage[] = [];

  for (const line of content.split("\n")) {
    const match = line.trim().match(CHECKBOX_REGEX);
    if (match) {
      stages.push({
        title: match[2].trim(),
        description: match[3].trim(),
        completed: match[1] === "x",
      });
    }
  }

  return stages;
}

function parseSubStageStatus(text: string): {
  title: string;
  status: StageStatus;
  date?: string;
} {
  let title = text;
  let status: StageStatus = "Запланирован";
  let date: string | undefined;

  // Check for bold status marker: **в работе**
  const boldStatusMatch = title.match(/\*\*(.+?)\*\*/);
  if (boldStatusMatch) {
    const key = boldStatusMatch[1].toLowerCase();
    if (STATUS_KEYWORDS[key]) {
      status = STATUS_KEYWORDS[key];
      title = title.replace(/\s*—?\s*\*\*.+?\*\*/, "").trim();
    }
  }

  // Check for status after dash: — завершён 2026-03-15
  const dashStatusMatch = title.match(/\s*[—–-]\s*(\S+?)(?:\s+(\d{4}-\d{2}-\d{2}))?\s*$/);
  if (dashStatusMatch) {
    const key = dashStatusMatch[1].toLowerCase();
    if (STATUS_KEYWORDS[key]) {
      status = STATUS_KEYWORDS[key];
      date = dashStatusMatch[2];
      title = title.replace(/\s*[—–-]\s*\S+(?:\s+\d{4}-\d{2}-\d{2})?\s*$/, "").trim();
    }
  }

  return { title, status, date };
}

export function parseCurrentStages(content: string): CurrentStageSection[] {
  const sections: CurrentStageSection[] = [];
  let currentSection: CurrentStageSection | null = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Section header: ## Разработка MVP
    if (trimmed.startsWith("## ")) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: trimmed.replace(/^##\s+/, ""),
        status: "Запланирован",
        substages: [],
      };
      continue;
    }

    if (!currentSection) continue;

    // Section status: Статус: В работе
    const statusLineMatch = trimmed.match(/^Статус:\s*(.+)$/i);
    if (statusLineMatch) {
      const key = statusLineMatch[1].trim().toLowerCase();
      if (STATUS_KEYWORDS[key]) {
        currentSection.status = STATUS_KEYWORDS[key];
      }
      continue;
    }

    // Substage checkbox: - [x] Task name — завершён 2026-03-15
    const subMatch = trimmed.match(SUBSTAGE_REGEX);
    if (subMatch) {
      const completed = subMatch[1] === "x";
      const { title, status, date } = parseSubStageStatus(subMatch[2]);

      const substage: SubStage = {
        title,
        completed,
        status: completed ? "Завершён" : status,
        date,
      };
      currentSection.substages.push(substage);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

export function findCurrentStage(plan: PlanStage[]): string | null {
  const firstIncomplete = plan.find((s) => !s.completed);
  return firstIncomplete ? firstIncomplete.title : null;
}

export function calculateStageProgress(
  stages: CurrentStageSection[],
  currentStageTitle: string | null
): number {
  if (!currentStageTitle) return 100;

  const section = stages.find((s) => s.title === currentStageTitle);
  if (!section || section.substages.length === 0) return 0;

  const activeSubstages = section.substages.filter(
    (s) => s.status !== "Отменён"
  );
  if (activeSubstages.length === 0) return 0;

  const completed = activeSubstages.filter((s) => s.completed).length;
  return Math.round((completed / activeSubstages.length) * 100);
}
