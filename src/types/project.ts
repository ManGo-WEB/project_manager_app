export type StageStatus =
  | "Запланирован"
  | "В работе"
  | "На паузе"
  | "Завершён"
  | "Отменён";

export interface ProjectMeta {
  name: string;
  description: string;
  status: StageStatus;
  tags: string[];
  archived: boolean;
  created: string;
  last_updated: string;
}

export interface PlanStage {
  title: string;
  description: string;
  completed: boolean;
  deadline?: string;
}

export interface SubStage {
  title: string;
  completed: boolean;
  status: StageStatus;
  date?: string;
}

export interface CurrentStageSection {
  title: string;
  status: StageStatus;
  substages: SubStage[];
}

export interface GitStatus {
  initialized: boolean;
  hasUncommitted: boolean;
  unpushedCount: number;
  hasRemote: boolean;
}

export interface Note {
  id: string;
  date: string;
  text: string;
}

export interface ActivityEntry {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export interface ProjectSummary {
  slug: string;
  meta: ProjectMeta;
  currentStage: string | null;
  currentStageProgress: number;
  overallProgress: number;
  git: GitStatus;
  nearestDeadline?: string;
  deadlineStatus?: "overdue" | "approaching" | "normal";
}

export interface ProjectDetail {
  slug: string;
  meta: ProjectMeta;
  plan: PlanStage[];
  stages: CurrentStageSection[];
  currentStage: string | null;
  currentStageProgress: number;
  prdContent?: string;
  git: GitStatus;
}
