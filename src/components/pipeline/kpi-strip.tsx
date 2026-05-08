"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Handshake, Building2 } from "lucide-react";
import type { PipelineSummary } from "./types";

const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n.toLocaleString()}`;

const kpis = (s: PipelineSummary) => [
  {
    label: "Contracted ARR",
    value: fmt(s.contractedARR),
    sub: `${s.totalLives} member lives`,
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Open Pipeline",
    value: fmt(s.openPipeline),
    sub: `${s.openDealCount} active deals`,
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Weighted Pipeline",
    value: fmt(s.weightedPipeline),
    sub: "Probability-adjusted",
    icon: TrendingUp,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    label: "Brokers in Pipeline",
    value: String(s.activeBrokers),
    sub: "Channel development",
    icon: Handshake,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "PE Firms in Pipeline",
    value: String(s.activePE),
    sub: "Capital partnerships",
    icon: Building2,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

export function KpiStrip({ summary }: { summary: PipelineSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis(summary).map((k) => (
        <Card key={k.label} className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-md p-1.5 ${k.bg}`}>
                <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{k.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
