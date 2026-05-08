import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { PATHS } from "@/lib/paths";
import * as rfs from "@/lib/remote-fs";

async function tailFile(filePath: string, lines: number): Promise<string[]> {
  try {
    const content = await rfs.readFile(filePath);
    const allLines = content.split("\n");
    return allLines.slice(Math.max(0, allLines.length - lines));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const source = searchParams.get("source") ?? "gateway";
  const lines = parseInt(searchParams.get("lines") ?? "100", 10);

  try {
    let logLines: string[] = [];
    let logPath = "";

    switch (source) {
      case "gateway":
        logPath = PATHS.gatewayLog;
        logLines = await tailFile(logPath, lines);
        break;
      case "error":
        logPath = PATHS.gatewayErrLog;
        logLines = await tailFile(logPath, lines);
        break;
      case "runtime": {
        // Find most recent runtime log
        const logDir = PATHS.runtimeLogDir;
        if (await rfs.exists(logDir)) {
          const logFiles = (await rfs.readdir(logDir))
            .filter((f) => f.startsWith("openclaw-") && f.endsWith(".log"))
            .sort()
            .reverse();
          if (logFiles.length > 0) {
            logPath = path.join(logDir, logFiles[0]);
            logLines = await tailFile(logPath, lines);
          }
        }
        break;
      }
    }

    return NextResponse.json({ source, logPath, lines: logLines });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
