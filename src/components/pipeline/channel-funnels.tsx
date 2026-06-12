"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Handshake, Building2 } from "lucide-react";
import { StageDealsDialog, ChannelDealTable } from "./stage-deals-dialog";
import type { ChannelStage } from "./types";

// ---------------------------------------------------------------------------
// Shared horizontal bar chart for channel funnels
// ---------------------------------------------------------------------------

function FunnelChart({
  stages,
  color,
  emptyColor,
  onStageClick,
}: {
  stages: ChannelStage[];
  color: string;
  emptyColor: string;
  onStageClick: (stage: ChannelStage) => void;
}) {
  const data = stages.map((s) => ({
    name: s.label,
    count: s.count,
    stage: s,
  }));

  return (
    <ResponsiveContainer width="100%" height={stages.length * 48 + 16}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          separator=""
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => {
            const count = Number(value) || 0;
            if (count === 0) return ["0 deals", ""];
            return [`${count} ${count === 1 ? "deal" : "deals"} — click to view`, ""];
          }}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          barSize={24}
          label={{ position: "right", fontSize: 12, fill: "var(--foreground)" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(entry: any) => {
            const stage: ChannelStage | undefined = entry?.payload?.stage ?? entry?.stage;
            if (stage && stage.count > 0) onStageClick(stage);
          }}
        >
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.count > 0 ? color : emptyColor}
              cursor={d.count > 0 ? "pointer" : undefined}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Main export: two cards side by side
// ---------------------------------------------------------------------------

interface SelectedStage {
  channelLabel: string;
  stage: ChannelStage;
}

export function ChannelFunnels({
  broker,
  capital,
  portalId,
}: {
  broker: { total: number; stages: ChannelStage[] };
  capital: { total: number; stages: ChannelStage[] };
  portalId: number | null;
}) {
  const [selected, setSelected] = useState<SelectedStage | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Broker funnel */}
      <Card className="py-0 gap-0">
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm font-semibold">
              Broker Channel
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {broker.total} total
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <FunnelChart
            stages={broker.stages}
            color="#d97706"
            emptyColor="var(--muted)"
            onStageClick={(stage) => setSelected({ channelLabel: "Broker Channel", stage })}
          />
        </CardContent>
      </Card>

      {/* PE funnel */}
      <Card className="py-0 gap-0">
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-rose-600" />
            <CardTitle className="text-sm font-semibold">
              PE / VC Channel
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {capital.total} total
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <FunnelChart
            stages={capital.stages}
            color="#e11d48"
            emptyColor="var(--muted)"
            onStageClick={(stage) => setSelected({ channelLabel: "PE / VC Channel", stage })}
          />
        </CardContent>
      </Card>

      {/* Stage drill-down */}
      <StageDealsDialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? `${selected.channelLabel} — ${selected.stage.label}` : ""}
        count={selected?.stage.deals.length ?? 0}
      >
        {selected && (
          <ChannelDealTable deals={selected.stage.deals} portalId={portalId} />
        )}
      </StageDealsDialog>
    </div>
  );
}
