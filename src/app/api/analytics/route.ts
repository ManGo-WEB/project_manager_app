import { NextResponse } from "next/server";
import { getAllProjects, listProjectSlugs, getProjectDetail } from "@/lib/projects";

export async function GET() {
  try {
    const projects = getAllProjects();
    const active = projects.filter((p) => !p.meta.archived);

    // Projects by status
    const byStatus: Record<string, number> = {};
    for (const p of active) {
      byStatus[p.meta.status] = (byStatus[p.meta.status] || 0) + 1;
    }

    // Average progress of active (non-archived, non-completed) projects
    const inProgress = active.filter((p) => p.meta.status !== "Завершён" && p.meta.status !== "Отменён");
    const avgProgress = inProgress.length > 0
      ? Math.round(inProgress.reduce((sum, p) => sum + p.overallProgress, 0) / inProgress.length)
      : 0;

    // Completed this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const completedThisMonth = active.filter(
      (p) => p.meta.status === "Завершён" && p.meta.last_updated >= monthStart
    ).length;

    // All deadlines from all project plan stages
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const withDeadlines: { slug: string; name: string; stage: string; deadline: string; status: "overdue" | "approaching" | "normal" }[] = [];

    for (const p of active) {
      const detail = getProjectDetail(p.slug);
      if (!detail) continue;
      for (const stage of detail.plan) {
        if (!stage.deadline || stage.completed) continue;
        const deadlineDate = new Date(stage.deadline + "T00:00:00");
        const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        withDeadlines.push({
          slug: p.slug,
          name: p.meta.name,
          stage: stage.title,
          deadline: stage.deadline,
          status: daysUntil < 0 ? "overdue" : daysUntil <= 7 ? "approaching" : "normal",
        });
      }
    }
    withDeadlines.sort((a, b) => a.deadline.localeCompare(b.deadline));

    // Per-project progress sorted by status priority
    const statusOrder: Record<string, number> = {
      "В работе": 0,
      "Запланирован": 1,
      "На паузе": 2,
      "Завершён": 3,
      "Отменён": 4,
    };
    const projectProgress = active
      .map((p) => ({
        slug: p.slug,
        name: p.meta.name,
        status: p.meta.status,
        overallProgress: p.overallProgress,
        currentStage: p.currentStage,
        currentStageProgress: p.currentStageProgress,
        nearestDeadline: p.nearestDeadline || null,
      }))
      .sort((a, b) => {
        const statusDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
        if (statusDiff !== 0) return statusDiff;
        // Within same status, sort by nearest deadline (soonest first, null last)
        if (a.nearestDeadline && b.nearestDeadline) return a.nearestDeadline.localeCompare(b.nearestDeadline);
        if (a.nearestDeadline) return -1;
        if (b.nearestDeadline) return 1;
        return 0;
      });

    return NextResponse.json({
      totalProjects: active.length,
      byStatus,
      avgProgress,
      completedThisMonth,
      withDeadlines,
      projectProgress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
