"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { CostTimeseries } from "@/lib/types";

const INPUT_COLOR = "#818cf8";  // indigo-400
const OUTPUT_COLOR = "#34d399"; // emerald-400
const GRID = "#3f3f46";
const AXIS = "#a1a1aa";
const TIP_BG = "#27272a";
const TIP_BORDER = "#3f3f46";
const TIP_TEXT = "#fafafa";

export function TokenBarChart({ data }: { data: CostTimeseries[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          tickFormatter={(v) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
            return v;
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: TIP_BG,
            border: `1px solid ${TIP_BORDER}`,
            borderRadius: "6px",
            color: TIP_TEXT,
          }}
          formatter={(value) => Number(value).toLocaleString()}
        />
        <Legend
          wrapperStyle={{ color: "#d4d4d8", fontSize: 12 }}
          formatter={(value) => <span style={{ color: "#d4d4d8" }}>{value}</span>}
        />
        <Bar dataKey="inputTokens" name="Input" fill={INPUT_COLOR} stackId="a" />
        <Bar dataKey="outputTokens" name="Output" fill={OUTPUT_COLOR} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
