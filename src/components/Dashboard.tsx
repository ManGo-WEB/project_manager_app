"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Archive, SlidersHorizontal } from "lucide-react";
import type { ProjectSummary, StageStatus } from "@/types/project";
import { ProjectCard } from "./ProjectCard";
import { SearchBar } from "./SearchBar";
import { CreateProjectModal } from "./CreateProjectModal";

const SORT_OPTIONS = [
  { value: "activity", label: "По активности" },
  { value: "name", label: "По названию" },
  { value: "status", label: "По статусу" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StageStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("activity");
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    projects.forEach((p) => p.meta.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    let result = projects;

    // Archive filter
    result = result.filter((p) => (showArchived ? p.meta.archived : !p.meta.archived));

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.meta.name.toLowerCase().includes(q) ||
          p.meta.description.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.meta.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.meta.status === statusFilter);
    }

    // Tag filter
    if (tagFilter !== "all") {
      result = result.filter((p) => p.meta.tags.includes(tagFilter));
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.meta.name.localeCompare(b.meta.name);
        case "status":
          return a.meta.status.localeCompare(b.meta.status);
        case "activity":
        default: {
          const dateA = a.meta.last_updated || a.meta.created || "";
          const dateB = b.meta.last_updated || b.meta.created || "";
          return dateB.localeCompare(dateA);
        }
      }
    });

    return result;
  }, [projects, search, statusFilter, tagFilter, sortBy, showArchived]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 text-sm">Загрузка проектов...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Проекты</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} из {projects.filter((p) => (showArchived ? p.meta.archived : !p.meta.archived)).length}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Новый проект
        </button>
      </div>

      {/* Search + Filters Toggle */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg border transition-colors ${
            showFilters
              ? "border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400"
              : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Фильтры
        </button>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg border transition-colors ${
            showArchived
              ? "border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400"
              : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <Archive className="w-4 h-4" />
          Архив
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161630]">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Статус</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StageStatus | "all")}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c36] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все</option>
              <option value="Запланирован">Запланирован</option>
              <option value="В работе">В работе</option>
              <option value="На паузе">На паузе</option>
              <option value="Завершён">Завершён</option>
              <option value="Отменён">Отменён</option>
            </select>
          </div>

          {allTags.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тег</label>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c36] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Сортировка</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c36] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Projects grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            {search ? "Проекты не найдены" : showArchived ? "Нет архивных проектов" : "Нет проектов. Создайте первый!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchProjects}
      />
    </div>
  );
}
