import { NextRequest, NextResponse } from "next/server";
import { toggleSubstage } from "@/lib/projects";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { sectionTitle, substageIndex } = await request.json();

    if (typeof sectionTitle !== "string" || typeof substageIndex !== "number") {
      return NextResponse.json(
        { error: "Необходимы поля sectionTitle и substageIndex" },
        { status: 400 }
      );
    }

    toggleSubstage(slug, sectionTitle, substageIndex);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
