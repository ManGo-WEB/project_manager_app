import { NextRequest, NextResponse } from "next/server";
import { getProjectActivity } from "@/lib/projects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const activity = getProjectActivity(slug);
  return NextResponse.json(activity);
}
