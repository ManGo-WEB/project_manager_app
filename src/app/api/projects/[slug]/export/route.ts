import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/lib/projects";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const format = request.nextUrl.searchParams.get("format") || "md";

    const markdown = generateReport(slug);

    if (format === "md") {
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}-report.md"`,
        },
      });
    }

    return NextResponse.json({ markdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
