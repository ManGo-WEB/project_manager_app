import path from "path";

export const PROJECTS_DIR = /*turbopackIgnore: true*/ process.env.PROJECTS_DIR || "G:/PROJECTS";

export function getProjectPath(slug: string): string {
  return path.join(PROJECTS_DIR, slug);
}

export function getProjectDocsPath(slug: string): string {
  return path.join(PROJECTS_DIR, slug, "docs");
}
