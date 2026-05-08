"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, MessageSquare, Timer, Brain, Cpu } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCostTimeseries } from "@/hooks/use-costs";
import { CostAreaChart } from "@/components/charts/cost-area-chart";
import { ToolFrequencyChart } from "@/components/charts/tool-frequency-chart";
import type { CostSummary, ToolStats, CronJob } from "@/lib/types";
import type { ModelsResponse } from "@/app/api/models/route";

function KPICard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ModelStatusCard({ data, loading }: { data: ModelsResponse | undefined; loading: boolean }) {
  const last = data?.lastActiveRun;
  const primary = data?.primaryModel ?? "";
  const fallback = data?.fallbacks?.[0] ?? "";

  let status: "primary" | "fallback" | "unknown" = "unknown";
  let dotColor = "bg-zinc-500";
  if (last) {
    const full = `${last.provider}/${last.model}`;
    if (primary && (full === primary || last.model === primary.split("/").pop())) {
      status = "primary";
      dotColor = "bg-green-500";
    } else if (fallback && (full === fallback || last.model === fallback.split("/").pop())) {
      status = "fallback";
      dotColor = "bg-amber-500";
    }
  }

  const relativeTime = (iso: string) => {
    const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Active Model</CardTitle>
        <Cpu className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-32" />
        ) : last ? (
          <>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
              <div className="text-lg font-bold font-mono truncate">{last.model}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {last.provider} · {status === "fallback" ? "fallback · " : ""}{relativeTime(last.time)}
            </p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-muted-foreground">—</div>
            <p className="text-xs text-muted-foreground mt-1">no runs found</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const { data: summary, isLoading: summaryLoading } = useApi<CostSummary>("/api/costs/summary");
  const { data: tools, isLoading: toolsLoading } = useApi<ToolStats[]>("/api/tools");
  const { data: cronJobs } = useApi<CronJob[]>("/api/cron");
  const { data: memoryFiles } = useApi<Array<{ path: string }>>("/api/memory/files");
  const { data: modelsData, isLoading: modelsLoading } = useApi<ModelsResponse>("/api/models");

  // Last 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const from = twoWeeksAgo.toISOString().split("T")[0];
  const { data: timeseries } = useCostTimeseries("day", from);

  const today = new Date().toISOString().split("T")[0];
  const sessionsToday = timeseries?.find((t) => t.date === today)?.sessions ?? 0;
  const activeCron = cronJobs?.filter((j) => j.enabled).length ?? 0;

  return (
    <PageShell title="Overview" description="OpenClaw agent monitoring dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Spend"
          value={summary ? `$${summary.totalCost.toFixed(2)}` : "$0.00"}
          icon={DollarSign}
          description={summary ? `$${summary.avgCostPerSession.toFixed(4)} avg/session` : undefined}
          loading={summaryLoading}
        />
        <KPICard
          title="Sessions Today"
          value={String(sessionsToday)}
          icon={MessageSquare}
          description={summary ? `${summary.sessionCount} total` : undefined}
          loading={summaryLoading}
        />
        <KPICard
          title="Active Cron Jobs"
          value={String(activeCron)}
          icon={Timer}
          description={cronJobs ? `${cronJobs.length} total` : undefined}
        />
        <KPICard
          title="Memory Entries"
          value={String(memoryFiles?.length ?? 0)}
          icon={Brain}
          description="Indexed files"
        />
        <ModelStatusCard data={modelsData} loading={modelsLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Trend (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {timeseries ? (
              <CostAreaChart data={timeseries} />
            ) : (
              <Skeleton className="h-[300px] w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Tools</CardTitle>
          </CardHeader>
          <CardContent>
            {tools && !toolsLoading ? (
              <ToolFrequencyChart data={tools} />
            ) : (
              <Skeleton className="h-[300px] w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      {cronJobs && cronJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cron Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cronJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        job.enabled ? "bg-green-500" : "bg-zinc-500"
                      }`}
                    />
                    <span>{job.name}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {job.state?.lastStatus === "ok" ? "Last: OK" : job.state?.lastStatus ?? "—"}
                    {job.schedule.everyMs && (
                      <span className="ml-2">
                        every {Math.round(job.schedule.everyMs / 60000)}m
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
