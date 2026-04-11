"use client";

import { useState, useRef, useEffect } from "react";
import type { StageStatus } from "@/types/project";

const DOT_COLORS: Record<StageStatus, string> = {
  "Запланирован": "bg-gray-400",
  "В работе": "bg-blue-500",
  "На паузе": "bg-yellow-500",
  "Завершён": "bg-green-500",
  "Отменён": "bg-red-400",
};

const PULSE: Partial<Record<StageStatus, boolean>> = {
  "В работе": true,
};

const ALL_STATUSES: StageStatus[] = [
  "Запланирован",
  "В работе",
  "На паузе",
  "Завершён",
  "Отменён",
];

function StatusDot({ status }: { status: StageStatus }) {
  const dotColor = DOT_COLORS[status] || DOT_COLORS["Запланирован"];
  const isPulsing = PULSE[status];

  return (
    <span className="relative flex h-2 w-2">
      {isPulsing && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-40`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
    </span>
  );
}

interface StatusBadgeProps {
  status: StageStatus;
  size?: "sm" | "md";
  editable?: boolean;
  onStatusChange?: (status: StageStatus) => void;
}

export function StatusBadge({ status, size = "md", editable = false, onStatusChange }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!editable) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${textSize} text-gray-500 dark:text-gray-400 whitespace-nowrap`}>
        <StatusDot status={status} />
        {status}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 ${textSize} text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap`}
      >
        <StatusDot status={status} />
        {status}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c36] shadow-lg py-1">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                onStatusChange?.(s);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                s === status
                  ? "bg-gray-50 dark:bg-gray-800 font-medium"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <StatusDot status={s} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
