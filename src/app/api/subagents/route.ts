import { NextResponse } from "next/server";
import { PATHS } from "@/lib/paths";
import * as rfs from "@/lib/remote-fs";

interface RawRun {
  runId: string;
  childSessionKey?: string;
  startedAt?: number;
  endedAt?: number;
}

interface RawRunsFile {
  runs?: Record<string, RawRun>;
}

export async function GET() {
  try {
    const raw = await rfs.readJSON<RawRunsFile>(PATHS.subagentRuns);
    if (!raw || !raw.runs) {
      return NextResponse.json([]);
    }

    // childSessionKey format: "agent:<agentId>:subagent:<uuid>"
    const runs = Object.values(raw.runs)
      .filter((r): r is RawRun => Boolean(r?.childSessionKey))
      .map((r) => ({
        agentId: r.childSessionKey!.split(":")[1] ?? "unknown",
        startedAt: r.startedAt ?? 0,
        status: r.endedAt ? "done" : "running",
      }));

    return NextResponse.json(runs);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
