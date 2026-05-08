import { NextResponse } from "next/server";
import { PATHS } from "@/lib/paths";
import * as rfs from "@/lib/remote-fs";

export async function GET() {
  try {
    let soulMd: string | null = null;
    try { soulMd = await rfs.readFile(PATHS.soulMd); } catch { /* missing */ }

    let agentsMd: string | null = null;
    try { agentsMd = await rfs.readFile(PATHS.agentsMd); } catch { /* missing */ }

    let execApprovals = null;
    try {
      const raw = await rfs.readJSON<Record<string, unknown>>(PATHS.execApprovals);
      if (raw) {
        // Redact the token
        const socket = raw.socket as Record<string, unknown> | undefined;
        if (socket?.token) {
          socket.token = (socket.token as string).slice(0, 4) + "****";
        }
        execApprovals = raw;
      }
    } catch { /* missing */ }

    // Detect external integrations from config
    const integrations: string[] = [];
    const config = await rfs.readJSON<Record<string, unknown>>(PATHS.config);
    if (config) {
      if ((config as any).channels?.slack) integrations.push("Slack");
      if ((config as any).skills?.entries) {
        for (const name of Object.keys((config as any).skills.entries)) {
          if (name.toLowerCase().includes("hubspot")) integrations.push("HubSpot");
          if (name.toLowerCase().includes("notion")) integrations.push("Notion");
        }
      }
      if ((config as any).gateway) integrations.push("Gateway");
    }

    return NextResponse.json({ soulMd, agentsMd, execApprovals, integrations });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
