import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { ProjectMeta } from "@/types/project";

const DEFAULT_META: ProjectMeta = {
  name: "",
  description: "",
  status: "Запланирован",
  tags: [],
  archived: false,
  created: "",
  last_updated: "",
};

export function readMarkdownWithFrontmatter(filePath: string): {
  meta: Record<string, unknown>;
  content: string;
} {
  if (!fs.existsSync(filePath)) {
    return { meta: {}, content: "" };
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { meta: data, content };
}

/**
 * Finds a file in directory by name, case-insensitive.
 * Returns the full path if found, or the original expected path if not.
 */
export function findFileInsensitive(dir: string, filename: string): string {
  const fallback = path.join(dir, filename);
  if (!fs.existsSync(dir)) return fallback;

  const lower = filename.toLowerCase();
  const entries = fs.readdirSync(dir);
  const match = entries.find((e) => e.toLowerCase() === lower);
  return match ? path.join(dir, match) : fallback;
}

export function readProjectMeta(docsPath: string): ProjectMeta {
  const prdPath = findFileInsensitive(docsPath, "PRD.md");
  const { meta } = readMarkdownWithFrontmatter(prdPath);

  return {
    ...DEFAULT_META,
    ...meta,
    tags: Array.isArray(meta.tags) ? meta.tags as string[] : [],
    archived: meta.archived === true,
  } as ProjectMeta;
}

export function readFileContent(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf-8");
}
