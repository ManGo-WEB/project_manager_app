import { NextRequest, NextResponse } from "next/server";
import { updateProjectStatus } from "@/lib/projects";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: "Поле status обязательно" },
        { status: 400 }
      );
    }

    updateProjectStatus(slug, status);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
