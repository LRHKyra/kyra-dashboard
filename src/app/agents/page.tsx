"use client";

import ReactMarkdown from "react-markdown";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, Users, GitBranch, Timer, ChevronDown } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { CronJob } from "@/lib/types";

interface AgentData {
  name: string;
  soulMd: string | null;
  skillMd: string | null;
  agentsMd: string | null;
  config: Record<string, unknown>;
  cronJobs: CronJob[];
  files: string[];
}

interface AgentsResponse {
  agents: AgentData[];
  pipelineMd: string | null;
  sharedContext: string | null;
}

const PIPELINE_AGENTS = ["prospector", "research", "copywriter", "quality", "outreach-researcher"];

function titleCase(name: string): string {
  return name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractRole(soulMd: string | null): string | null {
  if (!soulMd) return null;
  const lines = soulMd.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const roleMatch = line.match(/role[:\s]+(.+)/i);
    if (roleMatch) return roleMatch[1].trim().replace(/[*_]/g, "");
  }
  for (const line of lines) {
    if (!line.startsWith("#") && line.length > 10 && line.length < 120) {
      return line.replace(/[*_]/g, "").trim();
    }
  }
  return null;
}

function Md({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-sm font-bold mb-2 mt-3 first:mt-0 text-foreground">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold mb-1.5 mt-3 first:mt-0 text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-semibold mb-1 mt-2 first:mt-0 text-foreground">{children}</h3>,
        h4: ({ children }) => <h4 className="text-xs font-medium mb-1 mt-2 first:mt-0 text-foreground">{children}</h4>,
        p: ({ children }) => <p className="text-xs leading-relaxed mb-2 text-muted-foreground">{children}</p>,
        ul: ({ children }) => <ul className="text-xs list-disc pl-4 mb-2 space-y-0.5 text-muted-foreground">{children}</ul>,
        ol: ({ children }) => <ol className="text-xs list-decimal pl-4 mb-2 space-y-0.5 text-muted-foreground">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children, className }) => {
          // Inline code only — block code is handled by `pre`
          if (className?.includes("language-") || String(children).includes("\n")) {
            return <code>{children}</code>;
          }
          return (
            <code className="text-[11px] font-mono bg-black/40 rounded px-1 py-0.5 text-emerald-400">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="text-[11px] font-mono bg-black/40 rounded p-3 my-2 overflow-x-auto whitespace-pre text-emerald-400 leading-[1.4]">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-blue-500/40 pl-3 my-2 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-border my-3" />,
        a: ({ href, children }) => (
          <span className="text-blue-400 underline underline-offset-2">{children}</span>
        ),
        table: ({ children }) => (
          <table className="text-xs border-collapse w-full my-2">{children}</table>
        ),
        thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
        th: ({ children }) => <th className="text-left p-1 font-medium text-foreground">{children}</th>,
        td: ({ children }) => <td className="p-1 text-muted-foreground border-t border-border/50">{children}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function AgentCard({ agent }: { agent: AgentData }) {
  const role = extractRole(agent.soulMd);
  const isPipeline = PIPELINE_AGENTS.includes(agent.name);
  const hasCron = agent.cronJobs.length > 0;
  const configEntries = Object.entries(agent.config);
  const hasTabs = agent.soulMd || agent.skillMd || agent.agentsMd || configEntries.length > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 shrink-0 text-blue-400" />
              {titleCase(agent.name)}
            </CardTitle>
            {role && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{role}</p>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {isPipeline && (
              <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-400">
                Pipeline
              </Badge>
            )}
            {hasCron && (
              <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-400">
                Cron
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">
            {agent.files.length} files
          </Badge>
          {agent.soulMd && <Badge variant="secondary" className="text-[10px]">SOUL.md</Badge>}
          {agent.skillMd && <Badge variant="secondary" className="text-[10px]">SKILL.md</Badge>}
          {agent.agentsMd && <Badge variant="secondary" className="text-[10px]">AGENTS.md</Badge>}
          {configEntries.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{configEntries.length} config</Badge>
          )}
        </div>
      </CardHeader>

      {hasTabs && (
        <CardContent className="flex-1 pt-0">
          <Tabs defaultValue={agent.soulMd ? "identity" : agent.skillMd ? "skills" : "config"}>
            <TabsList className="w-full justify-start h-8">
              {agent.soulMd && <TabsTrigger value="identity" className="text-xs">Identity</TabsTrigger>}
              {agent.skillMd && <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>}
              {agent.agentsMd && <TabsTrigger value="guide" className="text-xs">Guide</TabsTrigger>}
              {(configEntries.length > 0 || hasCron) && (
                <TabsTrigger value="config" className="text-xs">Config</TabsTrigger>
              )}
            </TabsList>

            {agent.soulMd && (
              <TabsContent value="identity">
                <ScrollArea className="h-[280px] mt-2">
                  <div className="pr-4">
                    <Md>{agent.soulMd}</Md>
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            {agent.skillMd && (
              <TabsContent value="skills">
                <ScrollArea className="h-[280px] mt-2">
                  <div className="pr-4">
                    <Md>{agent.skillMd}</Md>
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            {agent.agentsMd && (
              <TabsContent value="guide">
                <ScrollArea className="h-[280px] mt-2">
                  <div className="pr-4">
                    <Md>{agent.agentsMd}</Md>
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            {(configEntries.length > 0 || hasCron) && (
              <TabsContent value="config">
                <ScrollArea className="h-[280px] mt-2">
                  <div className="space-y-3">
                    {hasCron && (
                      <div>
                        <h4 className="text-xs font-medium mb-1.5">Cron Jobs</h4>
                        {agent.cronJobs.map((job, i) => {
                          const j = job as unknown as Record<string, unknown>;
                          const schedule = j.schedule as Record<string, number> | undefined;
                          const state = j.state as Record<string, unknown> | undefined;
                          return (
                            <div key={i} className="text-xs border border-border rounded p-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{j.name as string}</span>
                                <Badge
                                  variant={j.enabled ? "default" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {j.enabled ? "enabled" : "disabled"}
                                </Badge>
                              </div>
                              {schedule?.everyMs && (
                                <div className="text-muted-foreground">
                                  Every {Math.round(schedule.everyMs / 60000)}m
                                </div>
                              )}
                              {typeof state?.lastStatus === "string" && (
                                <div className="text-muted-foreground">
                                  Last: {state.lastStatus}
                                  {typeof state.lastRunAtMs === "number" && (
                                    <span> at {new Date(state.lastRunAtMs).toLocaleString()}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {configEntries.map(([filename, data]) => (
                      <div key={filename}>
                        <h4 className="text-xs font-medium mb-1.5">{filename}.json</h4>
                        <pre className="text-xs font-mono bg-black/30 rounded p-2 whitespace-pre-wrap overflow-x-auto text-muted-foreground">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

export default function AgentsPage() {
  const { data, isLoading } = useApi<AgentsResponse>("/api/agents");

  if (isLoading) {
    return (
      <PageShell title="Agents" description="Clawdbot agent ecosystem">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      </PageShell>
    );
  }

  const agents = data?.agents ?? [];
  const pipelineAgents = agents.filter((a) => PIPELINE_AGENTS.includes(a.name));
  const autonomousAgents = agents.filter((a) => !PIPELINE_AGENTS.includes(a.name));
  const cronAgents = agents.filter((a) => a.cronJobs.length > 0);

  return (
    <PageShell title="Agents" description="Clawdbot agent ecosystem">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Agents</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipelineAgents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Outreach sequence</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Autonomous Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autonomousAgents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Independent operators</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cron Scheduled</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cronAgents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Automated runs</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline overview */}
      {data?.pipelineMd && (
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Outreach Pipeline
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Md>{data.pipelineMd}</Md>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Shared context */}
      {data?.sharedContext && (
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Shared Context (kyra-context.md)</CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Md>{data.sharedContext}</Md>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Agent cards grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((agent) => (
          <AgentCard key={agent.name} agent={agent} />
        ))}
      </div>
    </PageShell>
  );
}
