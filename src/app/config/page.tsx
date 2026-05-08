"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import type { CronJob, SystemStatus } from "@/lib/types";

function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) return <span className="text-muted-foreground">null</span>;
  if (typeof data === "string") return <span className="text-green-400">&quot;{data}&quot;</span>;
  if (typeof data === "number") return <span className="text-blue-400">{data}</span>;
  if (typeof data === "boolean") return <span className="text-yellow-400">{String(data)}</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
        <span className="text-muted-foreground">[</span>
        {data.map((item, i) => (
          <div key={i} className="ml-4">
            <JsonTree data={item} depth={depth + 1} />
            {i < data.length - 1 && <span className="text-muted-foreground">,</span>}
          </div>
        ))}
        <span className="text-muted-foreground">]</span>
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;
    return (
      <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
        <span className="text-muted-foreground">{"{"}</span>
        {entries.map(([key, val], i) => (
          <div key={key} className="ml-4">
            <span className="text-purple-400">&quot;{key}&quot;</span>
            <span className="text-muted-foreground">: </span>
            <JsonTree data={val} depth={depth + 1} />
            {i < entries.length - 1 && <span className="text-muted-foreground">,</span>}
          </div>
        ))}
        <span className="text-muted-foreground">{"}"}</span>
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

function LogViewer() {
  const [source, setSource] = useState("gateway");
  const { data, isLoading } = useApi<{ source: string; logPath: string; lines: string[] }>(
    `/api/logs?source=${source}&lines=200`
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Logs</CardTitle>
        <Tabs value={source} onValueChange={setSource}>
          <TabsList>
            <TabsTrigger value="gateway">Gateway</TabsTrigger>
            <TabsTrigger value="runtime">Runtime</TabsTrigger>
            <TabsTrigger value="error">Errors</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ScrollArea className="h-[400px]">
            <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground leading-5">
              {data?.lines?.join("\n") || "No logs available."}
            </pre>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default function ConfigPage() {
  const { data: config, isLoading: configLoading } = useApi<Record<string, unknown>>("/api/config");
  const { data: cronJobs, isLoading: cronLoading } = useApi<CronJob[]>("/api/cron");
  const { data: subagents } = useApi<{ version: number; runs: Record<string, unknown> }>("/api/subagents");
  const { data: status } = useApi<SystemStatus>("/api/system/status");

  return (
    <PageShell title="Config" description="System configuration, cron jobs, and logs">
      {/* System status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 text-sm">
              <div>
                <span className="text-muted-foreground">Gateway</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-2 w-2 rounded-full ${status.gatewayRunning ? "bg-green-500" : "bg-red-500"}`} />
                  {status.gatewayRunning ? "Running" : "Stopped"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Port</span>
                <div className="mt-1 font-mono">{status.port}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Sessions</span>
                <div className="mt-1">{status.sessionCount}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Disk Usage</span>
                <div className="mt-1 text-xs">
                  {status.diskUsage ? (
                    <>
                      Sessions: {status.diskUsage.sessions}<br />
                      Memory: {status.diskUsage.memory}<br />
                      Logs: {status.diskUsage.logs}
                    </>
                  ) : (
                    <span className="text-muted-foreground">unavailable</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cron jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cron Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {cronLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : cronJobs && cronJobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cronJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {job.name}
                        <Badge variant={job.enabled ? "default" : "secondary"} className="text-[10px]">
                          {job.enabled ? "enabled" : "disabled"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {job.schedule.everyMs
                        ? `every ${Math.round(job.schedule.everyMs / 60000)}m`
                        : job.schedule.kind}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={job.state?.lastStatus === "ok" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {job.state?.lastStatus ?? "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.state?.lastRunAtMs
                        ? new Date(job.state.lastRunAtMs).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.state?.nextRunAtMs
                        ? new Date(job.state.nextRunAtMs).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No cron jobs configured.</p>
          )}
        </CardContent>
      </Card>

      {/* Subagent runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subagent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {subagents && Object.keys(subagents.runs || {}).length > 0 ? (
            <pre className="text-xs font-mono">
              {JSON.stringify(subagents.runs, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No subagent runs recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* Config JSON */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration (redacted)</CardTitle>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : config ? (
            <ScrollArea className="h-[500px]">
              <pre className="text-xs font-mono">
                <JsonTree data={config} />
              </pre>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">Config not available.</p>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <LogViewer />
    </PageShell>
  );
}
