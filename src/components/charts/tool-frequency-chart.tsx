"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ToolStats } from "@/lib/types";

const BAR_COLOR = "#34d399"; // emerald-400
const GRID = "#3f3f46";
const AXIS = "#a1a1aa";
const TIP_BG = "#27272a";
const TIP_BORDER = "#3f3f46";
const TIP_TEXT = "#fafafa";

export function ToolFrequencyChart({ data }: { data: ToolStats[] }) {
  const top10 = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={top10} layout="vertical" margin={{ top: 10, right: 10, left: 80, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis
          type="number"
          stroke={AXIS}
          fontSize={12}
        />
        <YAxis
          dataKey="name"
          type="category"
          stroke={AXIS}
          fontSize={11}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: TIP_BG,
            border: `1px solid ${TIP_BORDER}`,
            borderRadius: "6px",
            color: TIP_TEXT,
          }}
        />
        <Bar dataKey="count" name="Invocations" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
