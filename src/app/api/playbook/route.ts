import { NextResponse } from "next/server";
import * as rfs from "@/lib/remote-fs";
import { PATHS } from "@/lib/paths";
import type { PlaybookRunLog, PlaybookSourceLog, PlaybookStatus } from "@/lib/types";

function parseJsonl<T>(content: string): T[] {
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return null;
      }
    })
    .filter((item): item is T => item !== null);
}

async function countFiles(dir: string): Promise<number> {
  try {
    const files = await rfs.readdir(dir);
    return files.filter((f) => f.endsWith(".md")).length;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const [queued, approved, rejected, runLogRaw, sourceLogRaw] =
      await Promise.all([
        countFiles(PATHS.playbookCandidatesQueue),
        countFiles(PATHS.playbookCandidatesApproved),
        countFiles(PATHS.playbookCandidatesRejected),
        rfs.readFile(PATHS.playbookRunLog).catch(() => ""),
        rfs.readFile(PATHS.playbookSourceLog).catch(() => ""),
      ]);

    const runs = parseJsonl<PlaybookRunLog>(runLogRaw);
    const searches = parseJsonl<PlaybookSourceLog>(sourceLogRaw);

    const status: PlaybookStatus = {
      queued,
      approved,
      rejected,
      lastRun: runs.length > 0 ? runs[runs.length - 1] : null,
      recentRuns: runs.slice(-10).reverse(),
      recentSearches: searches.slice(-20).reverse(),
    };

    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
