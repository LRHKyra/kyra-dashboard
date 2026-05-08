import path from "path";
import { PATHS } from "./paths";
import * as rfs from "./remote-fs";
import type { CostSummary, CostTimeseries, CostByModel, MessageRecord } from "./types";

interface CachedData {
  summary: CostSummary;
  timeseries: Map<string, CostTimeseries>;
  byModel: Map<string, CostByModel>;
  timestamp: number;
}

let cache: CachedData | null = null;
const CACHE_TTL = 60_000; // 60 seconds

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cache.timestamp < CACHE_TTL;
}

async function aggregateAll(): Promise<CachedData> {
  if (isCacheValid()) return cache!;

  const sessionsDir = PATHS.sessionsDir;

  // Get file count and mtimes in a single SSH command
  let fileCount = 0;
  const fileMtimes = new Map<string, number>();
  try {
    const statOut = await rfs.exec(`stat -f '%m %N' "${sessionsDir}"/*.jsonl 2>/dev/null`);
    for (const line of statOut.split("\n")) {
      if (!line.trim()) continue;
      const spaceIdx = line.indexOf(" ");
      if (spaceIdx === -1) continue;
      const mtime = parseInt(line.slice(0, spaceIdx), 10);
      const filePath = line.slice(spaceIdx + 1);
      fileMtimes.set(filePath, mtime);
      fileCount++;
    }
  } catch {
    // dir doesn't exist or no files
  }

  const summary: CostSummary = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    sessionCount: fileCount,
    messageCount: 0,
    avgCostPerSession: 0,
  };

  const timeseries = new Map<string, CostTimeseries>();
  const byModel = new Map<string, CostByModel>();

  // Cat all session files in one SSH command instead of 413 individual SFTP streams
  if (fileCount > 0) {
    try {
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
        const msg = record as unknown as MessageRecord;
        if (msg.message?.role !== "assistant") continue;

        const inner = msg.message as Record<string, unknown>;
        const usage = inner.usage as Record<string, unknown> | undefined;
        if (!usage) continue;

        summary.messageCount++;
        const costObj = usage.cost as Record<string, number> | undefined;
        const totalCost = costObj?.total ?? 0;
        summary.totalCost += totalCost;
        summary.totalInputTokens += (usage.input as number) ?? 0;
        summary.totalOutputTokens += (usage.output as number) ?? 0;
        summary.totalCacheReadTokens += (usage.cacheRead as number) ?? 0;
        summary.totalCacheWriteTokens += (usage.cacheWrite as number) ?? 0;

        // Timeseries by day
        const date = msg.timestamp ? msg.timestamp.split("T")[0] : "unknown";
        if (!timeseries.has(date)) {
          timeseries.set(date, { date, cost: 0, inputTokens: 0, outputTokens: 0, sessions: 0 });
        }
        const ts = timeseries.get(date)!;
        ts.cost += totalCost;
        ts.inputTokens += (usage.input as number) ?? 0;
        ts.outputTokens += (usage.output as number) ?? 0;

        // By model
        const model = (inner.model as string) || msg.model || "unknown";
        if (!byModel.has(model)) {
          byModel.set(model, { model, cost: 0, inputTokens: 0, outputTokens: 0, messageCount: 0 });
        }
        const bm = byModel.get(model)!;
        bm.cost += totalCost;
        bm.inputTokens += (usage.input as number) ?? 0;
        bm.outputTokens += (usage.output as number) ?? 0;
        bm.messageCount++;
      }
    } catch {
      // read error
    }
  }

  // Count unique sessions per day using already-fetched mtimes
  for (const [, mtime] of fileMtimes) {
    const date = new Date(mtime * 1000).toISOString().split("T")[0];
    if (timeseries.has(date)) {
      timeseries.get(date)!.sessions++;
    }
  }

  summary.avgCostPerSession = summary.sessionCount > 0 ? summary.totalCost / summary.sessionCount : 0;

  cache = { summary, timeseries, byModel, timestamp: Date.now() };
  return cache;
}

export async function getCostSummary(from?: string, to?: string): Promise<CostSummary> {
  const data = await aggregateAll();
  if (!from && !to) return data.summary;

  // Filter if date range provided
  let filtered: CostSummary = {
    totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0,
    totalCacheReadTokens: 0, totalCacheWriteTokens: 0,
    sessionCount: 0, messageCount: 0, avgCostPerSession: 0,
  };

  for (const [date, ts] of data.timeseries) {
    if (from && date < from) continue;
    if (to && date > to) continue;
    filtered.totalCost += ts.cost;
    filtered.totalInputTokens += ts.inputTokens;
    filtered.totalOutputTokens += ts.outputTokens;
    filtered.sessionCount += ts.sessions;
  }
  filtered.avgCostPerSession = filtered.sessionCount > 0 ? filtered.totalCost / filtered.sessionCount : 0;
  return filtered;
}

export async function getCostTimeseries(
  granularity: "day" | "week" | "month" = "day",
  from?: string,
  to?: string
): Promise<CostTimeseries[]> {
  const data = await aggregateAll();
  const entries = Array.from(data.timeseries.values())
    .filter((ts) => {
      if (from && ts.date < from) return false;
      if (to && ts.date > to) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (granularity === "day") return entries;

  // Bucket by week or month
  const bucketed = new Map<string, CostTimeseries>();
  for (const entry of entries) {
    let key: string;
    if (granularity === "week") {
      const d = new Date(entry.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = entry.date.slice(0, 7); // YYYY-MM
    }
    if (!bucketed.has(key)) {
      bucketed.set(key, { date: key, cost: 0, inputTokens: 0, outputTokens: 0, sessions: 0 });
    }
    const b = bucketed.get(key)!;
    b.cost += entry.cost;
    b.inputTokens += entry.inputTokens;
    b.outputTokens += entry.outputTokens;
    b.sessions += entry.sessions;
  }

  return Array.from(bucketed.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCostByModel(): Promise<CostByModel[]> {
  const data = await aggregateAll();
  return Array.from(data.byModel.values()).sort((a, b) => b.cost - a.cost);
}
