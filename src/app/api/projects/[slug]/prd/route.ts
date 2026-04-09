import { NextRequest, NextResponse } from "next/server";
import { getProjectPrd } from "@/lib/projects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const prd = getProjectPrd(slug);

  if (!prd) {
    return NextResponse.json(
      { error: "PRD не найден" },
      { status: 404 }
    );
  }

  return NextResponse.json(prd);
}
