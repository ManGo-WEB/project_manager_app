"use client";

interface ProgressBarProps {
  progress: number;
  size?: "sm" | "md";
}

export function ProgressBar({ progress, size = "md" }: ProgressBarProps) {
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${height}`}>
      <div
        className={`${height} rounded-full transition-all duration-300 ${
          progress === 100
            ? "bg-green-500"
            : progress > 50
              ? "bg-blue-500"
              : "bg-blue-400"
        }`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
