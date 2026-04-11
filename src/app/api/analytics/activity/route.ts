import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { PROJECTS_DIR } from "@/lib/config";
import { listProjectSlugs } from "@/lib/projects";

export async function GET(request: NextRequest) {
  try {
    const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
    const slugs = listProjectSlugs();

    const commitsByDay: Record<string, number> = {};

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    for (const slug of slugs) {
      const projectDir = path.join(PROJECTS_DIR, slug);
      const gitDir = path.join(projectDir, ".git");

      if (!fs.existsSync(gitDir)) continue;

      try {
        const log = execSync(
          `git log --since="${sinceStr}" --pretty=format:"%aI"`,
          { cwd: projectDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
        );

        if (!log.trim()) continue;

        for (const line of log.trim().split("\n")) {
          const date = line.trim().split("T")[0];
          if (date) {
            commitsByDay[date] = (commitsByDay[date] || 0) + 1;
          }
        }
      } catch {
        // git error, skip
      }
    }

    return NextResponse.json({ commitsByDay, days });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
