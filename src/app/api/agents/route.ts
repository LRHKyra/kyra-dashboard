import { NextResponse } from "next/server";
import path from "path";
import { PATHS } from "@/lib/paths";
import { redactConfig } from "@/lib/redact";
import * as rfs from "@/lib/remote-fs";

async function readFileOrNull(filePath: string): Promise<string | null> {
  try {
    return await rfs.readFile(filePath);
  } catch {
    return null;
  }
}

async function readConfigDir(configDir: string): Promise<Record<string, unknown>> {
  const config: Record<string, unknown> = {};
  if (!(await rfs.exists(configDir))) return config;
  const files = await rfs.readdir(configDir);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await rfs.readJSON(path.join(configDir, file));
      if (raw) config[file.replace(".json", "")] = redactConfig(raw);
    } catch { /* skip */ }
  }
  return config;
}

export async function GET() {
  try {
    const agentsDir = PATHS.agentsDir;
    if (!(await rfs.exists(agentsDir))) {
      return NextResponse.json({ agents: [], pipelineMd: null, sharedContext: null });
    }

    // Load cron jobs for cross-referencing
    let cronJobs: Array<Record<string, unknown>> = [];
    const cronRaw = await rfs.readJSON<{ jobs?: Array<Record<string, unknown>> }>(PATHS.cronJobs);
    if (cronRaw) {
      cronJobs = cronRaw.jobs || [];
    }

    // Scan agent directories
    const entries = await rfs.readdirWithTypes(agentsDir);
    const agentDirs = entries.filter((e) => e.isDirectory && e.name !== "shared" && e.name !== "_deprecated");

    // Load all agents in parallel
    const agents = await rfs.parallel(agentDirs, async (entry) => {
      const agentDir = path.join(agentsDir, entry.name);
      const [soulMd, skillMd, agentsMd, config, files] = await Promise.all([
        readFileOrNull(path.join(agentDir, "SOUL.md")),
        readFileOrNull(path.join(agentDir, "SKILL.md")),
        readFileOrNull(path.join(agentDir, "AGENTS.md")),
        readConfigDir(path.join(agentDir, "config")),
        rfs.listFilesRecursive(agentDir),
      ]);

      // Cross-reference with cron jobs: match if cron message mentions the agent name
      const nameVariants = [
        entry.name,
        entry.name.replace(/-/g, " "),
        entry.name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      ];
      const matchedCron = cronJobs.filter((job) => {
        const msg = ((job.payload as Record<string, unknown>)?.message as string) || "";
        const name = (job.name as string) || "";
        return nameVariants.some(
          (v) =>
            msg.toLowerCase().includes(v.toLowerCase()) ||
            name.toLowerCase().includes(v.toLowerCase())
        );
      });

      return {
        name: entry.name,
        soulMd,
        skillMd,
        agentsMd,
        config,
        cronJobs: matchedCron,
        files,
      };
    });

    // Sort: agents with SOUL.md first, then alphabetically
    agents.sort((a, b) => {
      if (a.soulMd && !b.soulMd) return -1;
      if (!a.soulMd && b.soulMd) return 1;
      return a.name.localeCompare(b.name);
    });

    const [pipelineMd, sharedContext] = await Promise.all([
      readFileOrNull(PATHS.pipelineMd),
      readFileOrNull(PATHS.sharedContext),
    ]);

    return NextResponse.json({ agents, pipelineMd, sharedContext });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
