import { NextRequest, NextResponse } from "next/server";
import { setPlanDeadline } from "@/lib/projects";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { stageIndex, deadline } = await request.json();

    if (typeof stageIndex !== "number") {
      return NextResponse.json(
        { error: "Необходимо поле stageIndex (number)" },
        { status: 400 }
      );
    }

    if (deadline !== null && (typeof deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(deadline))) {
      return NextResponse.json(
        { error: "Поле deadline должно быть в формате YYYY-MM-DD или null" },
        { status: 400 }
      );
    }

    setPlanDeadline(slug, stageIndex, deadline);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
