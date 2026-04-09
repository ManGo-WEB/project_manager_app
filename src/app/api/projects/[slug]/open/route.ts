import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { getProjectPath } from "@/lib/config";
import fs from "fs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { target } = await request.json();
    const projectDir = getProjectPath(slug);

    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    switch (target) {
      case "explorer":
        execSync(`explorer "${projectDir.replace(/\//g, "\\")}"`, { stdio: "ignore" });
        break;
      case "cursor":
        execSync(`cursor "${projectDir}"`, { stdio: "ignore" });
        break;
      case "vscode":
        execSync(`code "${projectDir}"`, { stdio: "ignore" });
        break;
      default:
        return NextResponse.json({ error: "Неизвестный target" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось открыть";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
