"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Circle,
  PauseCircle,
  XCircle,
  Loader2,
  Archive,
  ArchiveRestore,
  GitBranch,
  Pencil,
  Check,
  CircleDot,
  ArrowUpCircle,
  FolderOpen,
  MonitorUp,
  History,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  X,
  AlertTriangle,
  Clock,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ActivityEntry } from "@/types/project";
import { ActivityTimeline } from "./ActivityTimeline";
import type { Note } from "@/types/project";
import type { ProjectDetail, StageStatus } from "@/types/project";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { Modal } from "./Modal";
import { TagInput } from "./TagInput";

const STATUS_ICONS: Record<StageStatus, React.ReactNode> = {
  "Завершён": <CheckCircle2 className="w-4 h-4 text-green-500" />,
  "В работе": <Loader2 className="w-4 h-4 text-blue-500" />,
  "Запланирован": <Circle className="w-4 h-4 text-gray-400" />,
  "На паузе": <PauseCircle className="w-4 h-4 text-yellow-500" />,
  "Отменён": <XCircle className="w-4 h-4 text-red-400" />,
};

interface ProjectDetailViewProps {
  slug: string;
}

export function ProjectDetailView({ slug }: ProjectDetailViewProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [prdContent, setPrdContent] = useState("");
  const [showPrd, setShowPrd] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  const [editingDeadline, setEditingDeadline] = useState<number | null>(null);
  const [deadlineValue, setDeadlineValue] = useState("");

  const fetchProject = useCallback(() => {
    fetch(`/api/projects/${slug}`)
      .then((res) => res.json())
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${slug}/notes`);
      const data = await res.json();
      setNotes(data);
      setNotesLoaded(true);
    } catch {
      setNotes([]);
    }
  }, [slug]);

  useEffect(() => {
    fetchProject();
    fetchNotes();
  }, [fetchProject, fetchNotes]);

  const handleOpenPrd = async () => {
    if (!prdContent) {
      try {
        const res = await fetch(`/api/projects/${slug}/prd`);
        const data = await res.json();
        setPrdContent(data.content || "PRD пуст");
      } catch {
        setPrdContent("Не удалось загрузить PRD");
      }
    }
    setShowPrd(true);
  };

  const handleToggleArchive = async () => {
    if (!project) return;
    const newArchived = !project.meta.archived;
    await fetch(`/api/projects/${slug}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: newArchived }),
    });
    if (newArchived) {
      router.push("/");
    } else {
      fetchProject();
    }
  };

  const handleGitInit = async () => {
    try {
      const res = await fetch(`/api/projects/${slug}/git-init`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Git репозиторий инициализирован");
      } else {
        alert(data.error || "Ошибка");
      }
    } catch {
      alert("Не удалось инициализировать Git");
    }
  };

  const handleStatusChange = async (newStatus: StageStatus) => {
    await fetch(`/api/projects/${slug}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchProject();
  };

  const handleStartEditTags = () => {
    if (project) {
      setEditTags([...project.meta.tags]);
      setEditingTags(true);
    }
  };

  const handleSaveTags = async () => {
    await fetch(`/api/projects/${slug}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: editTags }),
    });
    setEditingTags(false);
    fetchProject();
  };

  const handleAddRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemoteError("");
    setRemoteLoading(true);
    try {
      const res = await fetch(`/api/projects/${slug}/remote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: remoteUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка");
      }
      setShowRemoteModal(false);
      setRemoteUrl("");
      fetchProject();
    } catch (err) {
      setRemoteError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setRemoteLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setNoteSending(true);
    await fetch(`/api/projects/${slug}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noteText }),
    });
    setNoteText("");
    setNoteSending(false);
    setShowAddNote(false);
    fetchNotes();
  };

  const handleDeleteNote = async (noteId: string) => {
    await fetch(`/api/projects/${slug}/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    setConfirmDeleteNoteId(null);
    fetchNotes();
  };

  const handleToggleNotes = () => {
    if (!notesLoaded) fetchNotes();
    setNotesExpanded(!notesExpanded);
  };

  const handleOpenActivity = async () => {
    if (activity.length === 0) {
      try {
        const res = await fetch(`/api/projects/${slug}/activity`);
        const data = await res.json();
        setActivity(data);
      } catch {
        setActivity([]);
      }
    }
    setShowActivity(true);
  };

  const handleOpen = async (target: "explorer" | "cursor" | "vscode") => {
    await fetch(`/api/projects/${slug}/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
  };

  const toggleStageExpanded = (index: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSetDeadline = async (stageIndex: number, deadline: string | null) => {
    await fetch(`/api/projects/${slug}/deadline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageIndex, deadline }),
    });
    setEditingDeadline(null);
    setDeadlineValue("");
    fetchProject();
  };

  const getDeadlineInfo = (deadline: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline + "T00:00:00");
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { daysUntil, deadlineDate };
  };

  const formatDeadline = (deadline: string) => {
    return new Date(deadline + "T00:00:00").toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleToggleSubstage = async (sectionTitle: string, substageIndex: number) => {
    await fetch(`/api/projects/${slug}/toggle-substage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionTitle, substageIndex }),
    });
    fetchProject();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Проект не найден</p>
        <Link href="/" className="text-blue-500 text-sm mt-2 inline-block hover:underline">
          Вернуться на дашборд
        </Link>
      </div>
    );
  }

  const { meta, plan, stages, currentStage, currentStageProgress } = project;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Все проекты
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{meta.name}</h1>
            {meta.description && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">{meta.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenPrd}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Открыть PRD"
            >
              <FileText className="w-4 h-4" />
              PRD
            </button>
            <button
              onClick={handleOpenActivity}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Хронология активности"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleOpen("explorer")}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Открыть в проводнике"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleOpen("cursor")}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Открыть в Cursor"
            >
              <MonitorUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleGitInit}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Инициализировать Git"
            >
              <GitBranch className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleArchive}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title={meta.archived ? "Разархивировать" : "Архивировать"}
            >
              {meta.archived ? (
                <ArchiveRestore className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <StatusBadge status={meta.status} editable onStatusChange={handleStatusChange} />

          {editingTags ? (
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1">
                <TagInput tags={editTags} onChange={setEditTags} />
              </div>
              <button
                onClick={handleSaveTags}
                className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition-colors"
                title="Сохранить"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/tags">
              {meta.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {meta.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={handleStartEditTags}
                className="p-1 rounded opacity-0 group-hover/tags:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                title="Редактировать теги"
              >
                <Pencil className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Git status */}
      {project.git.initialized && (
        <div className="mb-8 flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161630]">
          <GitBranch className="w-4 h-4 text-gray-400 shrink-0" />

          {project.git.hasUncommitted ? (
            <div className="flex items-center gap-1.5">
              <CircleDot className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">Есть незакоммиченные изменения</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Рабочая директория чиста</span>
            </div>
          )}

          {project.git.hasRemote && project.git.unpushedCount > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-1.5">
                <ArrowUpCircle className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-sm text-orange-600 dark:text-orange-400">
                  {project.git.unpushedCount} {project.git.unpushedCount === 1 ? "коммит" : project.git.unpushedCount < 5 ? "коммита" : "коммитов"} не отправлено
                </span>
              </div>
            </>
          )}

          {project.git.hasRemote && project.git.unpushedCount === 0 && !project.git.hasUncommitted && (
            <>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Синхронизировано с remote</span>
            </>
          )}

          {!project.git.hasRemote && (
            <>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
              <button
                onClick={() => setShowRemoteModal(true)}
                className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
              >
                Remote не настроен — подключить
              </button>
            </>
          )}
        </div>
      )}

      {/* Current stage progress */}
      {currentStage && (
        <div className="mb-8 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161630]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Текущая стадия</h2>
            <span className="text-sm font-semibold">{currentStageProgress}%</span>
          </div>
          <p className="font-semibold mb-3">{currentStage}</p>
          <ProgressBar progress={currentStageProgress} size="md" />
        </div>
      )}

      {/* Plan */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">План работ</h2>
        <div className="space-y-2">
          {plan.map((stage, i) => {
            const deadlineInfo = stage.deadline ? getDeadlineInfo(stage.deadline) : null;
            const isOverdue = deadlineInfo && !stage.completed && deadlineInfo.daysUntil < 0;
            const isApproaching = deadlineInfo && !stage.completed && deadlineInfo.daysUntil >= 0 && deadlineInfo.daysUntil <= 7;

            return (
              <div
                key={i}
                className={`group/plan flex items-start gap-3 p-3 rounded-lg ${
                  stage.title === currentStage
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "bg-gray-50 dark:bg-[#161630]"
                }`}
              >
                {stage.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                ) : stage.title === currentStage ? (
                  <Loader2 className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${stage.completed ? "text-gray-500 dark:text-gray-400 line-through" : ""}`}>
                    {stage.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{stage.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  {editingDeadline === i ? (
                    <input
                      type="date"
                      value={deadlineValue}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSetDeadline(i, e.target.value);
                        }
                      }}
                      onBlur={() => { setEditingDeadline(null); setDeadlineValue(""); }}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#22224a] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : stage.deadline ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => !stage.completed && (() => { setEditingDeadline(i); setDeadlineValue(stage.deadline!); })()}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-colors ${
                          isOverdue
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            : isApproaching
                              ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                              : stage.completed
                                ? "bg-gray-100 dark:bg-gray-700/50 text-gray-400"
                                : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50"
                        }`}
                        title={stage.completed ? "" : "Изменить дедлайн"}
                      >
                        {isOverdue ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : isApproaching ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <Calendar className="w-3 h-3" />
                        )}
                        {formatDeadline(stage.deadline)}
                      </button>
                      {!stage.completed && (
                        <button
                          onClick={() => handleSetDeadline(i, null)}
                          className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-500 transition-colors"
                          title="Убрать дедлайн"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : !stage.completed ? (
                    <button
                      onClick={() => { setEditingDeadline(i); setDeadlineValue(""); }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Установить дедлайн"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current stages detail */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Детализация этапов</h2>
        {stages.length === 0 ? (
          <p className="text-sm text-gray-400">Этапы не определены в CURRENT_STAGES.md</p>
        ) : (
          <div className="space-y-6">
            {stages.map((section, i) => {
              const isCompleted = section.status === "Завершён";
              const isExpanded = expandedStages.has(i);
              const showSubstages = !isCompleted || isExpanded;

              return (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div
                    className={`flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161630] ${isCompleted ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a1a3a] transition-colors" : ""}`}
                    onClick={() => isCompleted && toggleStageExpanded(i)}
                  >
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        isExpanded
                          ? <ChevronDown className="w-4 h-4 text-gray-400" />
                          : <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <h3 className="font-medium text-sm">{section.title}</h3>
                      {isCompleted && !isExpanded && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({section.substages.length})
                        </span>
                      )}
                    </div>
                    <StatusBadge status={section.status} />
                  </div>
                  {showSubstages && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {section.substages.map((sub, j) => (
                        <button
                          key={j}
                          onClick={() => handleToggleSubstage(section.title, j)}
                          className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-gray-50 dark:hover:bg-[#161630] transition-colors"
                        >
                          {STATUS_ICONS[sub.status]}
                          <span className={`flex-1 text-sm ${sub.completed ? "text-gray-400 line-through" : ""}`}>
                            {sub.title}
                          </span>
                          {sub.date && (
                            <span className="text-xs text-gray-400">{sub.date}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes section */}
      <div className="mt-8">
        <button
          onClick={handleToggleNotes}
          className="flex items-center gap-2 text-lg font-semibold mb-4 hover:text-blue-500 transition-colors"
        >
          {notesExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
          Заметки
          {notesLoaded && notes.length > 0 && (
            <span className="text-sm font-normal text-gray-400 ml-1">({notes.length})</span>
          )}
        </button>

        {notesExpanded && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {notes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Заметок пока нет</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {notes.map((note) => (
                  <div key={note.id} className="group px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#161630] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.text}</p>
                      <div className="relative shrink-0">
                        {confirmDeleteNoteId === note.id ? (
                          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1c1c36] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 shadow-sm">
                            <span className="text-xs text-gray-500 whitespace-nowrap">Удалить?</span>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                              Да
                            </button>
                            <button
                              onClick={() => setConfirmDeleteNoteId(null)}
                              className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              Нет
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteNoteId(note.id)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-500 transition-all"
                            title="Удалить заметку"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {new Date(note.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}, {new Date(note.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB — Add note */}
      <button
        onClick={() => setShowAddNote(true)}
        className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all z-30"
        title="Добавить заметку"
      >
        <StickyNote className="w-5 h-5" />
      </button>

      {/* Add Note Modal */}
      <Modal isOpen={showAddNote} onClose={() => setShowAddNote(false)} title="Новая заметка">
        <form onSubmit={handleAddNote} className="space-y-4">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Запишите мысль, идею, ссылку..."
            rows={4}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#22224a] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleAddNote(e);
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Ctrl+Enter для отправки</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddNote(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={noteSending || !noteText.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {noteSending ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Activity Modal */}
      <Modal isOpen={showActivity} onClose={() => setShowActivity(false)} title={`Активность: ${meta.name}`}>
        <ActivityTimeline entries={activity} />
      </Modal>

      {/* PRD Modal */}
      <Modal isOpen={showPrd} onClose={() => setShowPrd(false)} title={`PRD: ${meta.name}`}>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{prdContent}</ReactMarkdown>
        </div>
      </Modal>

      {/* Remote Modal */}
      <Modal
        isOpen={showRemoteModal}
        onClose={() => { setShowRemoteModal(false); setRemoteError(""); }}
        title="Подключить Remote-репозиторий"
      >
        <form onSubmit={handleAddRemote} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">URL репозитория</label>
            <input
              type="text"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#22224a] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1.5">HTTPS или SSH-адрес репозитория</p>
          </div>

          {remoteError && (
            <p className="text-sm text-red-500">{remoteError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowRemoteModal(false); setRemoteError(""); }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={remoteLoading || !remoteUrl.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {remoteLoading ? "Подключение..." : "Подключить"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
