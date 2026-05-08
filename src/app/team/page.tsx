"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Users, Code, PenTool, Palette, GitBranch, Timer, Cpu } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import ReactMarkdown from "react-markdown";
import type { ModelsResponse } from "@/app/api/models/route";

interface AgentData {
  name: string;
  soulMd: string | null;
  skillMd: string | null;
  agentsMd: string | null;
  config: Record<string, unknown>;
  cronJobs: Array<{ name: string; enabled: boolean }>;
  files: string[];
}

interface AgentsResponse {
  agents: AgentData[];
  pipelineMd: string | null;
  sharedContext: string | null;
}

function titleCase(name: string): string {
  return name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractRole(soulMd: string | null): string {
  if (!soulMd) return "Agent";
  const lines = soulMd.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const m = line.match(/role[:\s]+(.+)/i);
    if (m) return m[1].trim().replace(/[*_]/g, "");
  }
  for (const line of lines) {
    if (!line.startsWith("#") && line.length > 10 && line.length < 120) {
      return line.replace(/[*_]/g, "").trim();
    }
  }
  return "Agent";
}

function extractSkills(skillMd: string | null): string[] {
  if (!skillMd) return [];
  const skills: string[] = [];
  for (const line of skillMd.split("\n")) {
    const m = line.match(/^[-*]\s+\*?\*?(.+?)\*?\*?[:–-]/);
    if (m) skills.push(m[1].trim());
    else if (line.startsWith("## ") || line.startsWith("### ")) {
      const heading = line.replace(/^#+\s+/, "").trim();
      if (heading.length < 40) skills.push(heading);
    }
  }
  return skills.slice(0, 6);
}

function getDepartment(name: string, soulMd: string | null): string {
  const text = (name + " " + (soulMd ?? "")).toLowerCase();
  if (text.includes("develop") || text.includes("code") || text.includes("engineer") || text.includes("tech")) return "Engineering";
  if (text.includes("write") || text.includes("copy") || text.includes("content") || text.includes("research")) return "Content";
  if (text.includes("design") || text.includes("creative") || text.includes("visual")) return "Design";
  if (text.includes("prospect") || text.includes("outreach") || text.includes("sales") || text.includes("market")) return "Growth";
  if (text.includes("quality") || text.includes("review") || text.includes("qa")) return "Quality";
  return "Operations";
}

const DEPT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Engineering: Code,
  Content: PenTool,
  Design: Palette,
  Growth: GitBranch,
  Quality: Bot,
  Operations: Users,
};

const DEPT_COLORS: Record<string, string> = {
  Engineering: "border-blue-500/40 text-blue-400",
  Content: "border-yellow-500/40 text-yellow-400",
  Design: "border-purple-500/40 text-purple-400",
  Growth: "border-green-500/40 text-green-400",
  Quality: "border-orange-500/40 text-orange-400",
  Operations: "border-zinc-500/40 text-zinc-400",
};

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

function AgentAvatar({ name }: { name: string }) {
  const initials = name
    .split("-")
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 2);

  return (
    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-border flex items-center justify-center text-sm font-bold text-foreground shrink-0">
      {initials}
    </div>
  );
}

function TeamMemberCard({ agent, modelsData }: { agent: AgentData; modelsData: ModelsResponse | null }) {
  const role = extractRole(agent.soulMd);
  const skills = extractSkills(agent.skillMd);
  const dept = getDepartment(agent.name, agent.soulMd);
  const DeptIcon = DEPT_ICONS[dept] ?? Bot;
  const deptColor = DEPT_COLORS[dept] ?? DEPT_COLORS.Operations;
  const hasCron = agent.cronJobs.some((j) => j.enabled);
  const model = resolveAgentModel(agent.name, modelsData);
  const modelColor = modelProviderColor(agent.name, modelsData);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <AgentAvatar name={agent.name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold leading-tight">{titleCase(agent.name)}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{role}</p>
              </div>
              {hasCron && (
                <Timer className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
              )}
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${deptColor}`}>
                <DeptIcon className="h-2.5 w-2.5 mr-1" />
                {dept}
              </Badge>
              {agent.soulMd && <Badge variant="secondary" className="text-[10px]">Identity</Badge>}
              {hasCron && <Badge variant="secondary" className="text-[10px]">Scheduled</Badge>}
              {model !== "—" && (
                <Badge variant="outline" className={`text-[10px] font-mono ${modelColor}`}>
                  <Cpu className="h-2.5 w-2.5 mr-1" />
                  {model}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {skills.length > 0 && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground mb-1.5">Capabilities</p>
          <div className="flex flex-wrap gap-1">
            {skills.map((s) => (
              <span
                key={s}
                className="text-[10px] bg-accent rounded px-1.5 py-0.5 text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function TeamPage() {
  const { data, isLoading } = useApi<AgentsResponse>("/api/agents");
  const { data: modelsData } = useApi<ModelsResponse>("/api/models");
  const agents = data?.agents ?? [];

  // Group by department
  const byDept = agents.reduce<Record<string, AgentData[]>>((acc, agent) => {
    const dept = getDepartment(agent.name, agent.soulMd);
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(agent);
    return acc;
  }, {});

  const depts = Object.keys(byDept).sort();

  const totalCron = agents.filter((a) => a.cronJobs.some((j) => j.enabled)).length;

  if (isLoading) {
    return (
      <PageShell title="Team" description="Your AI agent organization">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Team" description="Your AI agent organization">
      {/* Org stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">active agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{depts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{depts.join(", ")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCron}</div>
            <p className="text-xs text-muted-foreground mt-1">with cron jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Primary Model</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold font-mono truncate">
              {modelsData?.primaryModel
                ? modelsData.primaryModel.includes("/")
                  ? modelsData.primaryModel.split("/").slice(1).join("/")
                  : modelsData.primaryModel
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {modelsData?.primaryModel?.startsWith("ollama/") ? "local" : modelsData?.primaryModel?.startsWith("openai-codex/") ? "cloud" : modelsData?.primaryModel ? "cloud" : "unknown"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs by department */}
      {depts.length > 0 && (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all" className="text-xs">All ({agents.length})</TabsTrigger>
            {depts.map((dept) => (
              <TabsTrigger key={dept} value={dept} className="text-xs">
                {dept} ({byDept[dept].length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
              {agents.map((agent) => (
                <TeamMemberCard key={agent.name} agent={agent} modelsData={modelsData ?? null} />
              ))}
            </div>
          </TabsContent>

          {depts.map((dept) => (
            <TabsContent key={dept} value={dept}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                {byDept[dept].map((agent) => (
                  <TeamMemberCard key={agent.name} agent={agent} modelsData={modelsData ?? null} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {agents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No agents found. Set up agents in your workspace.</p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
