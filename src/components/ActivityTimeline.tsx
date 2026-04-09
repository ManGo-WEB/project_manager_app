"use client";

import { GitCommit } from "lucide-react";
import type { ActivityEntry } from "@/types/project";

interface ActivityTimelineProps {
  entries: ActivityEntry[];
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDate(entries: ActivityEntry[]): Map<string, ActivityEntry[]> {
  const groups = new Map<string, ActivityEntry[]>();

  for (const entry of entries) {
    const dateKey = formatDate(entry.date);
    const group = groups.get(dateKey) || [];
    group.push(entry);
    groups.set(dateKey, group);
  }

  return groups;
}

export function ActivityTimeline({ entries }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-gray-400">Нет истории активности</p>
        <p className="text-xs text-gray-400 mt-1">Git-репозиторий не инициализирован или нет коммитов</p>
      </div>
    );
  }

  const grouped = groupByDate(entries);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateLabel, items]) => (
        <div key={dateLabel}>
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wider">
            {dateLabel}
          </div>
          <div className="space-y-1">
            {items.map((entry) => (
              <div
                key={entry.hash}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#161630] transition-colors"
              >
                <GitCommit className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{entry.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-gray-400">{entry.author}</span>
                    <span className="text-[11px] text-gray-300 dark:text-gray-600">|</span>
                    <span className="text-[11px] text-gray-400">{formatTime(entry.date)}</span>
                    <span className="text-[11px] text-gray-300 dark:text-gray-600">|</span>
                    <span className="text-[11px] text-gray-400 font-mono">{entry.hash.slice(0, 7)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
