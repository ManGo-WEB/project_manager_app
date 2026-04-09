import { NextRequest, NextResponse } from "next/server";
import { getProjectDetail } from "@/lib/projects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const project = getProjectDetail(slug);

  if (!project) {
    return NextResponse.json(
      { error: "Проект не найден" },
      { status: 404 }
    );
  }

  return NextResponse.json(project);
}
