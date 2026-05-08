import { NextResponse } from "next/server";
import { PATHS } from "@/lib/paths";
import * as rfs from "@/lib/remote-fs";

async function getDirSize(dirPath: string): Promise<string> {
  try {
    const output = await rfs.exec(`du -sh "${dirPath}" 2>/dev/null`);
    return output.split("\t")[0].trim();
  } catch {
    return "unknown";
  }
}

async function isGatewayRunning(): Promise<boolean> {
  try {
    const output = await rfs.exec("pgrep -f openclaw-gateway 2>/dev/null || true");
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

export async function GET() {
  let port = 18789;
  let sessionCount = 0;
  let gatewayRunning = false;
  let diskUsage: { sessions: string; memory: string; logs: string } | null = null;

  try {
    const config = await rfs.readJSON<{ gateway?: { port?: number } }>(PATHS.config);
    if (config?.gateway?.port) port = config.gateway.port;
  } catch { /* SSH unavailable — use default port */ }

  try {
    gatewayRunning = await isGatewayRunning();
  } catch { /* ignore */ }

  try {
    if (await rfs.exists(PATHS.sessionsDir)) {
      const files = await rfs.readdir(PATHS.sessionsDir);
      sessionCount = files.filter((f) => f.endsWith(".jsonl")).length;
    }
  } catch { /* ignore */ }

  try {
    diskUsage = {
      sessions: await getDirSize(PATHS.sessionsDir),
      memory: await getDirSize(PATHS.memoryDb),
      logs: await getDirSize(`${PATHS.home}/logs`),
    };
  } catch { /* ignore */ }

  return NextResponse.json({ gatewayRunning, port, sessionCount, diskUsage });
}
