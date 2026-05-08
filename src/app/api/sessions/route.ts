import { NextResponse } from "next/server";
import { PATHS } from "@/lib/paths";
import * as rfs from "@/lib/remote-fs";
import type { SessionListItem } from "@/lib/types";

export async function GET() {
  try {
    // Fetch index and file mtimes in parallel (2 SSH commands instead of 1 + N)
    const [raw, statOut] = await Promise.all([
      rfs.readJSON<Record<string, { sessionId: string; updatedAt: number }>>(PATHS.sessionsIndex),
      rfs.exec(`stat -f '%m %N' "${PATHS.sessionsDir}"/*.jsonl 2>/dev/null`).catch(() => ""),
    ]);

    const sessions: SessionListItem[] = [];

    if (raw) {
      for (const [key, value] of Object.entries(raw)) {
        const parts = key.split(":");
        const type = parts[1] || "main";
        const channel = parts[2] || undefined;

        sessions.push({
          id: value.sessionId,
          key,
          updatedAt: value.updatedAt,
          type,
          channel,
        });
      }
    }

    // Parse stat output for unindexed files
    const indexedIds = new Set(sessions.map((s) => s.id));
    for (const line of statOut.split("\n")) {
      if (!line.trim()) continue;
      const spaceIdx = line.indexOf(" ");
      if (spaceIdx === -1) continue;
      const mtime = parseInt(line.slice(0, spaceIdx), 10);
      const filePath = line.slice(spaceIdx + 1);
      const fileName = filePath.split("/").pop() || "";
      if (!fileName.endsWith(".jsonl")) continue;
      const id = fileName.replace(".jsonl", "");
      if (indexedIds.has(id)) continue;

      sessions.push({
        id,
        key: `unknown:session:${id.slice(0, 8)}`,
        updatedAt: mtime * 1000,
        type: "session",
      });
    }

    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
