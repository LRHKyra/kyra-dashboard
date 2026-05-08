import { PATHS } from "./paths";
import * as rfs from "./remote-fs";
import type { ToolStats } from "./types";

interface ToolCache {
  stats: ToolStats[];
  timestamp: number;
}

let cache: ToolCache | null = null;
const CACHE_TTL = 60_000;

export async function getToolStats(): Promise<ToolStats[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.stats;
  }

  const sessionsDir = PATHS.sessionsDir;
  const toolMap = new Map<string, { count: number; errorCount: number }>();

  try {
    // Cat all session files in one SSH command
    const allContent = await rfs.exec(`cat "${sessionsDir}"/*.jsonl`);
    for (const line of allContent.split("\n")) {
      if (!line.trim()) continue;
      let record: Record<string, unknown>;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      if (record.type !== "message") continue;
      const msg = record as { message?: { role?: string; content?: Array<{ type: string; name?: string; isError?: boolean }> } };
      if (msg.message?.role === "assistant" && msg.message.content) {
        for (const block of msg.message.content) {
          if (block.type === "toolCall" && block.name) {
            if (!toolMap.has(block.name)) {
              toolMap.set(block.name, { count: 0, errorCount: 0 });
            }
            toolMap.get(block.name)!.count++;
          }
        }
      }
    }
  } catch {
    // dir doesn't exist or no files
  }

  const stats: ToolStats[] = Array.from(toolMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    errorCount: data.errorCount,
    errorRate: data.count > 0 ? data.errorCount / data.count : 0,
  }));

  stats.sort((a, b) => b.count - a.count);
  cache = { stats, timestamp: Date.now() };
  return stats;
}
