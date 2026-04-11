"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  FolderOpen,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { StageStatus } from "@/types/project";

interface AnalyticsData {
  totalProjects: number;
  byStatus: Record<string, number>;
  avgProgress: number;
  completedThisMonth: number;
  withDeadlines: {
    slug: string;
    name: string;
    stage: string;
    deadline: string;
    status: "overdue" | "approaching" | "normal";
  }[];
  projectProgress: {
    slug: string;
    name: string;
    status: string;
    overallProgress: number;
    currentStage: string | null;
    currentStageProgress: number;
  }[];
}

interface ActivityData {
  commitsByDay: Record<string, number>;
  days: number;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  "Запланирован": "bg-gray-400",
  "В работе": "bg-blue-500",
  "На паузе": "bg-yellow-500",
  "Завершён": "bg-green-500",
  "Отменён": "bg-red-400",
};

const PERIOD_OPTIONS = [
  { label: "7 дней", days: 7 },
  { label: "Месяц", days: 30 },
  { label: "3 месяца", days: 90 },
  { label: "6 месяцев", days: 180 },
  { label: "Год", days: 365 },
];

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityDays, setActivityDays] = useState(30);
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [deadlinesExpanded, setDeadlinesExpanded] = useState(false);

  const fetchActivity = useCallback(async (days: number) => {
    try {
      const res = await fetch(`/api/analytics/activity?days=${days}`);
      const data = await res.json();
      setActivity(data);
    } catch {
      setActivity(null);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch(`/api/analytics/activity?days=${activityDays}`).then((r) => r.json()),
    ])
      .then(([analyticsData, activityData]) => {
        setData(analyticsData);
        setActivity(activityData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (days: number) => {
    setActivityDays(days);
    fetchActivity(days);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Не удалось загрузить аналитику</p>
      </div>
    );
  }

  const statusEntries = Object.entries(data.byStatus).sort((a, b) => b[1] - a[1]);

  const formatDate = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  };

  // Generate activity chart data
  const activityChart: { date: string; count: number; label: string }[] = [];
  for (let i = activityDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    activityChart.push({
      date: dateStr,
      count: activity?.commitsByDay[dateStr] || 0,
      label: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
    });
  }
  const maxActivity = Math.max(...activityChart.map((d) => d.count), 1);
  const totalCommits = activityChart.reduce((sum, d) => sum + d.count, 0);

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
        <h1 className="text-2xl font-semibold">Статистика и аналитика</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-[#1c1c36]">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Всего проектов</span>
          </div>
          <p className="text-2xl font-semibold">{data.totalProjects}</p>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-[#1c1c36]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Средний прогресс</span>
          </div>
          <p className="text-2xl font-semibold">{data.avgProgress}%</p>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-[#1c1c36]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Завершено за месяц</span>
          </div>
          <p className="text-2xl font-semibold">{data.completedThisMonth}</p>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-[#1c1c36]">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">С дедлайнами</span>
          </div>
          <p className="text-2xl font-semibold">{data.withDeadlines.length}</p>
        </div>
      </div>

      {/* Status card — full width */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 bg-white dark:bg-[#1c1c36] mb-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {statusEntries.map(([status, count]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[status] || "bg-gray-400"}`} />
              <span className="text-sm text-gray-600 dark:text-gray-300">{status}</span>
              <span className="text-sm font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Project progress */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-[#1c1c36]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-sm">Прогресс по проектам</h2>
            <span className="text-xs text-gray-400">({data.projectProgress.length})</span>
          </div>
          {data.projectProgress.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Нет проектов</p>
          ) : (
            <>
              <div className="space-y-4">
                {(progressExpanded ? data.projectProgress : data.projectProgress.slice(0, 3)).map((p) => (
                  <Link
                    key={p.slug}
                    href={`/project/${p.slug}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#161630] transition-colors"
                  >
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{p.name}</span>
                        <StatusBadge status={p.status as StageStatus} size="sm" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 ml-2 shrink-0">{p.overallProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-1.5">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          p.overallProgress === 100
                            ? "bg-green-500"
                            : p.overallProgress > 50
                              ? "bg-blue-500"
                              : "bg-blue-400"
                        }`}
                        style={{ width: `${p.overallProgress}%` }}
                      />
                    </div>
                    {p.currentStage && (
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="truncate">{p.currentStage}</span>
                        <span className="ml-2 shrink-0">{p.currentStageProgress}%</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              {data.projectProgress.length > 3 && (
                <button
                  onClick={() => setProgressExpanded(!progressExpanded)}
                  className="flex items-center justify-center gap-1 w-full mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {progressExpanded ? (
                    <>Свернуть <ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Ещё {data.projectProgress.length - 3} <ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Deadlines */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-[#1c1c36]">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-sm">Ближайшие дедлайны</h2>
            {data.withDeadlines.length > 0 && (
              <span className="text-xs text-gray-400">({data.withDeadlines.length})</span>
            )}
          </div>
          {data.withDeadlines.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Нет активных дедлайнов</p>
          ) : (
            <>
              <div className="space-y-1.5">
                {(deadlinesExpanded ? data.withDeadlines : data.withDeadlines.slice(0, 5)).map((d, i) => (
                  <Link
                    key={`${d.slug}-${i}`}
                    href={`/project/${d.slug}`}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#161630] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate leading-tight">{d.stage}</p>
                      <p className="text-[11px] text-gray-400 truncate leading-tight">{d.name}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs shrink-0 ml-2 px-2 py-0.5 rounded-md ${
                      d.status === "overdue"
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        : d.status === "approaching"
                          ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                          : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400"
                    }`}>
                      {d.status === "overdue" ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : d.status === "approaching" ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <Calendar className="w-3 h-3" />
                      )}
                      {formatDate(d.deadline)}
                    </span>
                  </Link>
                ))}
              </div>
              {data.withDeadlines.length > 5 && (
                <button
                  onClick={() => setDeadlinesExpanded(!deadlinesExpanded)}
                  className="flex items-center justify-center gap-1 w-full mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {deadlinesExpanded ? (
                    <>Свернуть <ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Ещё {data.withDeadlines.length - 5} <ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Activity chart */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-[#1c1c36]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-sm">Активность</h2>
            <span className="text-xs text-gray-400 ml-1">{totalCommits} коммитов</span>
          </div>
          <div className="flex items-center gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => handlePeriodChange(opt.days)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  activityDays === opt.days
                    ? "bg-blue-500 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-[2px]" style={{ height: "140px" }}>
          {activityChart.map((day) => (
            <div
              key={day.date}
              className="flex-1 group/bar relative"
              style={{ height: "100%" }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity z-10">
                <div className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                  <div className="font-medium">{day.label}</div>
                  <div className="text-gray-300 dark:text-gray-500">{day.count} {day.count === 1 ? "коммит" : day.count < 5 ? "коммита" : "коммитов"}</div>
                </div>
                <div className="w-2 h-2 bg-gray-800 dark:bg-gray-200 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
              </div>
              {/* Bar */}
              <div
                className={`absolute bottom-0 left-0 right-0 rounded-sm transition-all ${
                  day.count > 0
                    ? "bg-blue-400 dark:bg-blue-500 group-hover/bar:bg-blue-500 dark:group-hover/bar:bg-blue-400"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
                style={{
                  height: day.count > 0
                    ? `${Math.max((day.count / maxActivity) * 100, 4)}%`
                    : "2px",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>{activityChart[0]?.label}</span>
          {activityDays > 30 && (
            <span>{activityChart[Math.floor(activityChart.length / 4)]?.label}</span>
          )}
          <span>{activityChart[Math.floor(activityChart.length / 2)]?.label}</span>
          {activityDays > 30 && (
            <span>{activityChart[Math.floor(activityChart.length * 3 / 4)]?.label}</span>
          )}
          <span>{activityChart[activityChart.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}
