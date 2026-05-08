import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { readSettings, getRunsDir } from "@/lib/outreach-settings";

const RUN_ID_RE = /^[\w-]{1,80}$/;
const MAX_LINES = 500;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!RUN_ID_RE.test(runId)) {
    return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  }

  const artifactRel = request.nextUrl.searchParams.get("path") ?? "";
  if (!artifactRel) {
    return NextResponse.json({ error: "path param required" }, { status: 400 });
  }

  try {
    const settings = readSettings();
    const runsDir = getRunsDir(settings);
    const runDir = path.resolve(path.join(runsDir, runId));
    const resolved = path.resolve(path.join(runDir, artifactRel));

    // Path traversal guard: resolved path must be strictly inside runDir
    if (!resolved.startsWith(runDir + path.sep) && resolved !== runDir) {
      return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
    }

    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const content = fs.readFileSync(resolved, "utf8");
    const allLines = content.split("\n").filter((l) => l.trim());
    const lines = allLines.slice(0, MAX_LINES).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return line;
      }
    });

    return NextResponse.json({
      lines,
      total: allLines.length,
      truncated: allLines.length > MAX_LINES,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
