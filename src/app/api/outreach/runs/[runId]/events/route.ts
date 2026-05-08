import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { readSettings, getRunsDir } from "@/lib/outreach-settings";

const RUN_ID_RE = /^[\w-]{1,80}$/;
const MAX_EVENTS_PER_POLL = 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!RUN_ID_RE.test(runId)) {
    return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  }

  const offsetStr = request.nextUrl.searchParams.get("offset") ?? "0";
  const offset = Math.max(0, parseInt(offsetStr, 10) || 0);

  try {
    const settings = readSettings();
    const runsDir = getRunsDir(settings);
    const eventsPath = path.join(runsDir, runId, "events.jsonl");

    if (!fs.existsSync(eventsPath)) {
      return NextResponse.json({ events: [], nextOffset: 0 });
    }

    const stat = fs.statSync(eventsPath);
    if (offset >= stat.size) {
      return NextResponse.json({ events: [], nextOffset: offset });
    }

    // Read only the new bytes from the given offset
    const fd = fs.openSync(eventsPath, "r");
    const bytesToRead = stat.size - offset;
    const buffer = Buffer.alloc(bytesToRead);
    fs.readSync(fd, buffer, 0, bytesToRead, offset);
    fs.closeSync(fd);

    const newContent = buffer.toString("utf8");
    const events = newContent
      .split("\n")
      .filter((l) => l.trim())
      .slice(0, MAX_EVENTS_PER_POLL)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ events, nextOffset: stat.size });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
