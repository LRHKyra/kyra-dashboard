import { NextResponse } from "next/server";
import path from "path";
import { PATHS } from "@/lib/paths";
import * as rfs from "@/lib/remote-fs";

interface ModelEntry {
  id: string;
  name: string;
  contextWindow?: number;
  reasoning?: boolean;
}

interface ModelsJson {
  providers: Record<string, { models?: ModelEntry[] }>;
}

interface OpenClawConfig {
  agents?: {
    defaults?: {
      model?: { primary?: string; fallbacks?: string[] };
      models?: Record<string, { alias?: string }>;
      subagents?: { model?: string };
    };
    list?: Array<{
      id: string;
      model?: { primary?: string };
      subagents?: { model?: string };
    }>;
  };
}

export interface LastActiveRun {
  provider: string;
  model: string;
  time: string;
}

export interface ModelsResponse {
  primaryModel: string | null;
  fallbacks: string[];
  subagentsModel: string | null;
  aliases: Record<string, string>; // alias -> full model id
  availableModels: Array<ModelEntry & { provider: string }>;
  agentOverrides: Record<string, { model?: string; subagentsModel?: string }>;
  lastActiveRun: LastActiveRun | null;
}

async function getLastActiveRun(): Promise<LastActiveRun | null> {
  try {
    // Try today then yesterday
    const cmd = `grep -a 'embedded run start' /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log 2>/dev/null | tail -1 || grep -a 'embedded run start' /tmp/openclaw/openclaw-$(date -v-1d +%Y-%m-%d).log 2>/dev/null | tail -1`;
    const line = (await rfs.exec(cmd)).trim();
    if (!line) return null;
    const obj = JSON.parse(line) as { "1": string; time?: string; _meta?: { date?: string } };
    const msg = obj["1"] ?? "";
    const ts = obj.time ?? obj._meta?.date ?? "";
    const m = msg.match(/provider=(\S+)\s+model=(\S+)/);
    if (!m) return null;
    return { provider: m[1], model: m[2], time: ts };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const modelsJsonPath = path.join(PATHS.home, "agents/main/agent/models.json");

    const [configRaw, modelsRaw, lastActiveRun] = await Promise.all([
      rfs.readJSON<OpenClawConfig>(PATHS.config),
      rfs.readJSON<ModelsJson>(modelsJsonPath),
      getLastActiveRun(),
    ]);

    const defaults = configRaw?.agents?.defaults;
    const primaryModel = defaults?.model?.primary ?? null;
    const fallbacks = defaults?.model?.fallbacks ?? [];
    const subagentsModel = defaults?.subagents?.model ?? null;

    // Build alias -> full model id map
    const aliases: Record<string, string> = {};
    for (const [modelId, entry] of Object.entries(defaults?.models ?? {})) {
      if (entry.alias) aliases[entry.alias] = modelId;
    }

    // Per-agent overrides from agents.list
    const agentOverrides: Record<string, { model?: string; subagentsModel?: string }> = {};
    for (const agent of configRaw?.agents?.list ?? []) {
      const m = agent.model?.primary;
      const sm = agent.subagents?.model;
      if (m || sm) agentOverrides[agent.id] = { model: m, subagentsModel: sm };
    }

    // Available local models from models.json
    const availableModels: Array<ModelEntry & { provider: string }> = [];
    for (const [provider, providerData] of Object.entries(modelsRaw?.providers ?? {})) {
      for (const model of providerData.models ?? []) {
        availableModels.push({ ...model, provider });
      }
    }

    return NextResponse.json({
      primaryModel,
      fallbacks,
      subagentsModel,
      aliases,
      availableModels,
      agentOverrides,
      lastActiveRun,
    } satisfies ModelsResponse);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
