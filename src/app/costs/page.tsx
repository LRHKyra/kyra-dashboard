"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCostSummary, useCostTimeseries, useCostByModel } from "@/hooks/use-costs";
import { CostAreaChart } from "@/components/charts/cost-area-chart";
import { ModelPieChart } from "@/components/charts/model-pie-chart";
import { TokenBarChart } from "@/components/charts/token-bar-chart";

export default function CostsPage() {
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const { data: summary, isLoading: summaryLoading } = useCostSummary();
  const { data: timeseries, isLoading: tsLoading } = useCostTimeseries(granularity);
  const { data: byModel, isLoading: modelLoading } = useCostByModel();

  return (
    <PageShell title="Costs" description="Token usage and cost tracking across all sessions">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-7 w-20" />
              </CardContent>
            </Card>
          ))
        ) : summary ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${summary.totalCost.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Input Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(summary.totalInputTokens / 1_000_000).toFixed(1)}M</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Output Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(summary.totalOutputTokens / 1_000_000).toFixed(1)}M</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.messageCount.toLocaleString()}</div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Cost over time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Spend Over Time</CardTitle>
          <Tabs value={granularity} onValueChange={(v) => setGranularity(v as "day" | "week" | "month")}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {tsLoading || !timeseries ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <CostAreaChart data={timeseries} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Cost by model pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost by Model</CardTitle>
          </CardHeader>
          <CardContent>
            {modelLoading || !byModel ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ModelPieChart data={byModel} />
            )}
          </CardContent>
        </Card>

        {/* Token usage stacked bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {tsLoading || !timeseries ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <TokenBarChart data={timeseries} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model breakdown table */}
      {byModel && byModel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Input Tokens</TableHead>
                  <TableHead className="text-right">Output Tokens</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byModel.map((row) => (
                  <TableRow key={row.model}>
                    <TableCell className="font-mono text-sm">{row.model}</TableCell>
                    <TableCell className="text-right">${row.cost.toFixed(4)}</TableCell>
                    <TableCell className="text-right">{row.inputTokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.outputTokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.messageCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
