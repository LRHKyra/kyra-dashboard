"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { CostTimeseries } from "@/lib/types";

const STROKE = "#818cf8"; // indigo-400
const GRID = "#3f3f46";   // zinc-700
const AXIS = "#a1a1aa";   // zinc-400
const TIP_BG = "#27272a"; // zinc-800
const TIP_BORDER = "#3f3f46";
const TIP_TEXT = "#fafafa";

export function CostAreaChart({ data }: { data: CostTimeseries[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={STROKE} stopOpacity={0.4} />
            <stop offset="95%" stopColor={STROKE} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis
          dataKey="date"
          stroke={AXIS}
          fontSize={12}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis
          stroke={AXIS}
          fontSize={12}
          tickFormatter={(v) => `$${v.toFixed(2)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: TIP_BG,
            border: `1px solid ${TIP_BORDER}`,
            borderRadius: "6px",
            color: TIP_TEXT,
          }}
          formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke={STROKE}
          fill="url(#costGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
