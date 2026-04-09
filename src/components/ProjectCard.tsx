"use client";

import Link from "next/link";
import { FolderOpen, GitBranch, CircleDot, ArrowUpCircle } from "lucide-react";
import type { ProjectSummary } from "@/types/project";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

interface ProjectCardProps {
  project: ProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { slug, meta, currentStage, currentStageProgress, git } = project;

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

        {currentStage && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-600 dark:text-gray-400 truncate">{currentStage}</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 ml-2 shrink-0">{currentStageProgress}%</span>
            </div>
            <ProgressBar progress={currentStageProgress} />
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <StatusBadge status={meta.status} size="sm" />
          {meta.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end">
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
        </div>
      </div>
    </Link>
  );
}
