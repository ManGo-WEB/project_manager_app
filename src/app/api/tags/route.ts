import { NextResponse } from "next/server";
import { getAllProjects } from "@/lib/projects";

export async function GET() {
  const projects = getAllProjects();
  const tags = new Set<string>();
  projects.forEach((p) => p.meta.tags.forEach((t) => tags.add(t)));
  return NextResponse.json(Array.from(tags).sort());
}
