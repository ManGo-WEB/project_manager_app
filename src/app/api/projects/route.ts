import { NextRequest, NextResponse } from "next/server";
import { getAllProjects, createProject } from "@/lib/projects";

export async function GET() {
  const projects = getAllProjects();
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, name, description, tags } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: "Поля slug и name обязательны" },
        { status: 400 }
      );
    }

    createProject(slug, name, description || "", tags || []);

    return NextResponse.json({ success: true, slug }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
