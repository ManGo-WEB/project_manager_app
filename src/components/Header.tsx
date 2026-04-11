"use client";

import Link from "next/link";
import { LayoutDashboard, Settings, BarChart3 } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#13132b]/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <LayoutDashboard className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-sm">Projects Manager</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/analytics"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Аналитика"
          >
            <BarChart3 className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
          </Link>
          <Link
            href="/settings"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Настройки"
          >
            <Settings className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
