"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Monitor, Coffee, Zap, Clock, Cpu } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { ModelsResponse } from "@/app/api/models/route";

interface AgentData {
  name: string;
  soulMd: string | null;
  cronJobs: Array<{ name: string; enabled: boolean; state?: { lastRunAtMs?: number; nextRunAtMs?: number } }>;
  files: string[];
}

interface AgentsResponse {
  agents: AgentData[];
}

interface SubagentRun {
  agentId: string;
  startedAt: number;
  status: string;
}

function titleCase(name: string): string {
  return name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractRole(soulMd: string | null): string {
  if (!soulMd) return "AI Agent";
  const lines = soulMd.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const m = line.match(/role[:\s]+(.+)/i);
    if (m) return m[1].trim().replace(/[*_]/g, "").slice(0, 50);
  }
  for (const line of lines) {
    if (!line.startsWith("#") && line.length > 10 && line.length < 80) {
      return line.replace(/[*_]/g, "").trim();
    }
  }
  return "AI Agent";
}

function getAgentColor(name: string): string {
  const colors = [
    "from-blue-500/40 to-blue-700/40",
    "from-purple-500/40 to-purple-700/40",
    "from-green-500/40 to-green-700/40",
    "from-orange-500/40 to-orange-700/40",
    "from-pink-500/40 to-pink-700/40",
    "from-cyan-500/40 to-cyan-700/40",
    "from-yellow-500/40 to-yellow-700/40",
    "from-red-500/40 to-red-700/40",
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[hash];
}

function isRecentlyActive(agent: AgentData): boolean {
  const fifteenMin = 15 * 60 * 1000;
  const now = Date.now();
  return agent.cronJobs.some((j) => {
    if (!j.state?.lastRunAtMs) return false;
    return now - j.state.lastRunAtMs < fifteenMin;
  });
}

function getStatus(agent: AgentData, subagents: SubagentRun[]): "working" | "idle" | "scheduled" {
  const running = subagents.some(
    (s) => s.agentId === agent.name && s.status === "running"
  );
  if (running) return "working";
  if (isRecentlyActive(agent)) return "scheduled";
  return "idle";
}

function resolveAgentModel(agentName: string, models: ModelsResponse | null): string {
  if (!models) return "—";
  const override = models.agentOverrides[agentName];
  const modelId = agentName === "main"
    ? (override?.model ?? models.primaryModel)
    : (override?.model ?? models.subagentsModel);
  if (!modelId) return "—";
  return modelId.includes("/") ? modelId.split("/").slice(1).join("/") : modelId;
}

function modelProviderColor(agentName: string, models: ModelsResponse | null): string {
  if (!models) return "border-zinc-500/40 text-zinc-400";
  const override = models.agentOverrides[agentName];
  const modelId = agentName === "main"
    ? (override?.model ?? models.primaryModel ?? "")
    : (override?.model ?? models.subagentsModel ?? "");
  if (modelId.startsWith("ollama/")) return "border-green-500/40 text-green-400";
  if (modelId.startsWith("openai-codex/")) return "border-blue-500/40 text-blue-400";
  if (modelId.startsWith("anthropic/")) return "border-orange-500/40 text-orange-400";
  return "border-zinc-500/40 text-zinc-400";
}

function getNextRun(agent: AgentData): number | null {
  const runs = agent.cronJobs
    .filter((j) => j.enabled && j.state?.nextRunAtMs)
    .map((j) => j.state!.nextRunAtMs!);
  return runs.length ? Math.min(...runs) : null;
}

function Desk({
  agent,
  status,
  model,
  modelColor,
  onClick,
}: {
  agent: AgentData;
  status: "working" | "idle" | "scheduled";
  model: string;
  modelColor: string;
  onClick: () => void;
}) {
  const [frame, setFrame] = useState(0);
  const gradient = getAgentColor(agent.name);
  const initials = agent.name
    .split("-")
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 2);

  // Animate the screen glow when working
  useEffect(() => {
    if (status !== "working") return;
    const id = setInterval(() => setFrame((f) => (f + 1) % 3), 600);
    return () => clearInterval(id);
  }, [status]);

  const screenColors = ["bg-blue-500/60", "bg-blue-400/50", "bg-blue-600/60"];

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-border/60 bg-card hover:bg-accent/30 transition-all cursor-pointer w-full"
    >
      {/* Monitor */}
      <div className="relative">
        <div className="w-20 h-14 rounded-md border-2 border-zinc-600 bg-zinc-900 flex items-center justify-center overflow-hidden">
          {status === "working" ? (
            <div className={`w-full h-full ${screenColors[frame]} transition-colors duration-300 flex items-center justify-center`}>
              <div className="space-y-1 px-2">
                <div className="h-0.5 bg-white/40 rounded" />
                <div className="h-0.5 bg-white/30 rounded w-3/4" />
                <div className="h-0.5 bg-white/20 rounded w-1/2" />
              </div>
            </div>
          ) : status === "scheduled" ? (
            <Clock className="h-5 w-5 text-yellow-400/70" />
          ) : (
            <div className="text-zinc-600 text-xs">—</div>
          )}
        </div>
        {/* Monitor stand */}
        <div className="w-4 h-2 bg-zinc-700 mx-auto rounded-b" />
        <div className="w-8 h-0.5 bg-zinc-600 mx-auto" />
      </div>

      {/* Agent avatar */}
      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradient} border border-border flex items-center justify-center text-xs font-bold relative`}>
        {initials}
        {/* Status dot */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
            status === "working"
              ? "bg-green-400 animate-pulse"
              : status === "scheduled"
              ? "bg-yellow-400"
              : "bg-zinc-500"
          }`}
        />
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="text-xs font-medium leading-tight">{titleCase(agent.name)}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {status === "working" ? "Working..." : status === "scheduled" ? "Ran recently" : "Idle"}
        </p>
        <p className={`text-[9px] mt-0.5 font-mono ${modelColor.split(" ")[1]}`}>{model}</p>
      </div>
    </button>
  );
}

function AgentDetailPanel({
  agent,
  status,
  model,
  modelColor,
  fallbacks,
  onClose,
}: {
  agent: AgentData | null;
  status: "working" | "idle" | "scheduled";
  model: string;
  modelColor: string;
  fallbacks?: string[];
  onClose: () => void;
}) {
  if (!agent) return null;

  const role = extractRole(agent.soulMd);
  const nextRun = getNextRun(agent);
  const activeCron = agent.cronJobs.filter((j) => j.enabled);

  return (
    <Card className="border-blue-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full bg-gradient-to-br ${getAgentColor(agent.name)} border border-border flex items-center justify-center text-xs font-bold`}
            >
              {agent.name.split("-").map((w) => w[0].toUpperCase()).join("").slice(0, 2)}
            </div>
            <div>
              <CardTitle className="text-base">{titleCase(agent.name)}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                status === "working"
                  ? "border-green-500/40 text-green-400"
                  : status === "scheduled"
                  ? "border-yellow-500/40 text-yellow-400"
                  : "border-zinc-500/40 text-zinc-400"
              }
            >
              {status}
            </Badge>
            <button className="text-muted-foreground hover:text-foreground text-xs" onClick={onClose}>✕</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeCron.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1.5">Scheduled Tasks</p>
            <div className="space-y-1.5">
              {activeCron.map((job, i) => (
                <div key={i} className="flex items-center justify-between text-xs border border-border rounded px-2 py-1.5">
                  <span>{job.name}</span>
                  {job.state?.lastRunAtMs && (
                    <span className="text-muted-foreground">
                      Last: {new Date(job.state.lastRunAtMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {nextRun && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Next run: {new Date(nextRun).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
        <div>
          <p className="text-xs font-medium mb-1.5 flex items-center gap-1">
            <Cpu className="h-3 w-3" /> Model
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={`text-[10px] font-mono ${modelColor}`}>
              {model}
            </Badge>
            {fallbacks && fallbacks.length > 0 && fallbacks.map((fb) => {
              const fbShort = fb.includes("/") ? fb.split("/").slice(1).join("/") : fb;
              return (
                <Badge key={fb} variant="outline" className="text-[10px] font-mono border-zinc-500/40 text-zinc-500">
                  ↳ {fbShort}
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {agent.files.length} files · {agent.cronJobs.length} cron jobs
        </div>
      </CardContent>
    </Card>
  );
}

export default function OfficePage() {
  const { data: agentsData, isLoading: agentsLoading } = useApi<AgentsResponse>("/api/agents");
  const { data: subagents } = useApi<SubagentRun[]>("/api/subagents");
  const { data: modelsData } = useApi<ModelsResponse>("/api/models");

  const [selected, setSelected] = useState<AgentData | null>(null);

  const agents = agentsData?.agents ?? [];
  const runs = Array.isArray(subagents) ? subagents : [];

  const working = agents.filter((a) => getStatus(a, runs) === "working");
  const scheduled = agents.filter((a) => getStatus(a, runs) === "scheduled");
  const idle = agents.filter((a) => getStatus(a, runs) === "idle");

  if (agentsLoading) {
    return (
      <PageShell title="Office" description="Digital workspace — see what every agent is doing">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
        <div className="grid gap-4 grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Office" description="Digital workspace — see what every agent is doing">
      {/* Status bar */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Size</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{agents.length}</div></CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Active</CardTitle>
            <Zap className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{working.length}</div>
            <p className="text-xs text-muted-foreground mt-1">currently running</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-yellow-400">Recent</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{scheduled.length}</div>
            <p className="text-xs text-muted-foreground mt-1">ran in last 15m</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Idle</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{idle.length}</div>
            <p className="text-xs text-muted-foreground mt-1">standing by</p>
          </CardContent>
        </Card>
      </div>

      {/* Office floor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Office Floor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Room dividers */}
          <div className="space-y-6">
            {working.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-green-500/20" />
                  <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Working
                  </span>
                  <div className="h-px flex-1 bg-green-500/20" />
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {working.map((a) => (
                    <Desk
                      key={a.name}
                      agent={a}
                      status="working"
                      model={resolveAgentModel(a.name, modelsData ?? null)}
                      modelColor={modelProviderColor(a.name, modelsData ?? null)}
                      onClick={() => setSelected(selected?.name === a.name ? null : a)}
                    />
                  ))}
                </div>
              </div>
            )}

            {scheduled.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-yellow-500/20" />
                  <span className="text-xs text-yellow-400 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Recently Active
                  </span>
                  <div className="h-px flex-1 bg-yellow-500/20" />
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {scheduled.map((a) => (
                    <Desk
                      key={a.name}
                      agent={a}
                      status="scheduled"
                      model={resolveAgentModel(a.name, modelsData ?? null)}
                      modelColor={modelProviderColor(a.name, modelsData ?? null)}
                      onClick={() => setSelected(selected?.name === a.name ? null : a)}
                    />
                  ))}
                </div>
              </div>
            )}

            {idle.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-zinc-700" />
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Coffee className="h-3 w-3" /> Idle
                  </span>
                  <div className="h-px flex-1 bg-zinc-700" />
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {idle.map((a) => (
                    <Desk
                      key={a.name}
                      agent={a}
                      status="idle"
                      model={resolveAgentModel(a.name, modelsData ?? null)}
                      modelColor={modelProviderColor(a.name, modelsData ?? null)}
                      onClick={() => setSelected(selected?.name === a.name ? null : a)}
                    />
                  ))}
                </div>
              </div>
            )}

            {agents.length === 0 && (
              <div className="text-center py-16">
                <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">The office is empty. No agents configured yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail panel */}
      {selected && (
        <AgentDetailPanel
          agent={selected}
          status={getStatus(selected, runs)}
          model={resolveAgentModel(selected.name, modelsData ?? null)}
          modelColor={modelProviderColor(selected.name, modelsData ?? null)}
          fallbacks={modelsData?.fallbacks}
          onClose={() => setSelected(null)}
        />
      )}
    </PageShell>
  );
}
