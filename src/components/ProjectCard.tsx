"use client";

import Link from "next/link";
import { useState } from "react";
import { FolderOpen, GitBranch, CircleDot, ArrowUpCircle, AlertTriangle, Clock, Calendar, ChevronDown } from "lucide-react";
import type { ProjectSummary } from "@/types/project";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

interface ProjectCardProps {
  project: ProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { slug, meta, currentStage, currentStageProgress, overallProgress, git, nearestDeadline, deadlineStatus } = project;
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const formatDeadline = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <Link href={`/project/${slug}`}>
      <div className="group border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#1c1c36]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <FolderOpen className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors shrink-0" />
            <h3 className="font-semibold text-base truncate">{meta.name}</h3>
          </div>

          {git.initialized && (
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {git.hasUncommitted && (
                <span title="Есть незакоммиченные изменения">
                  <CircleDot className="w-3.5 h-3.5 text-yellow-500" />
                </span>
              )}
              {git.hasRemote && git.unpushedCount > 0 && (
                <span className="flex items-center gap-0.5" title={`${git.unpushedCount} непушнутых коммитов`}>
                  <ArrowUpCircle className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[10px] font-medium text-orange-500">{git.unpushedCount}</span>
                </span>
              )}
              {!git.hasUncommitted && (!git.hasRemote || git.unpushedCount === 0) && (
                <span title="Git: всё чисто">
                  <GitBranch className="w-3.5 h-3.5 text-green-500" />
                </span>
              )}
            </div>
          )}
        </div>

        {meta.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
            {meta.description}
          </p>
        )}

        {/* Progress section */}
        <div className="mb-3 space-y-2.5">
          {/* Overall progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">Общий прогресс</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">{overallProgress}%</span>
            </div>
            <ProgressBar progress={overallProgress} size="sm" />
          </div>

          {/* Current stage progress */}
          {currentStage && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400 truncate">{currentStage}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300 ml-2 shrink-0">{currentStageProgress}%</span>
              </div>
              <ProgressBar progress={currentStageProgress} size="sm" />
            </div>
          )}

          {/* Nearest deadline */}
          {nearestDeadline && deadlineStatus && (
            <div className={`flex items-center gap-1.5 text-xs ${
              deadlineStatus === "overdue"
                ? "text-red-600 dark:text-red-400"
                : deadlineStatus === "approaching"
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-gray-500 dark:text-gray-400"
            }`}>
              {deadlineStatus === "overdue" ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : deadlineStatus === "approaching" ? (
                <Clock className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Calendar className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Дедлайн: {formatDeadline(nearestDeadline)}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <StatusBadge status={meta.status} size="sm" />
            {meta.tags.length > 0 && (
              <div className="flex items-start gap-1.5">
                <div className={`flex gap-1.5 ${tagsExpanded ? "flex-wrap justify-end" : ""}`}>
                  {(tagsExpanded ? meta.tags : meta.tags.slice(0, 2)).map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {meta.tags.length > 2 && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTagsExpanded(!tagsExpanded); }}
                    className="flex items-center justify-center w-5 h-5 shrink-0 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${tagsExpanded ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
