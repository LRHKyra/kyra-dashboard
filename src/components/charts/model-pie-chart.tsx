"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { CostByModel } from "@/lib/types";

const COLORS = [
  "#818cf8", // indigo-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#c084fc", // purple-400
  "#f87171", // red-400
];

const TIP_BG = "#27272a";
const TIP_BORDER = "#3f3f46";
const TIP_TEXT = "#fafafa";

export function ModelPieChart({ data }: { data: CostByModel[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="cost"
          nameKey="model"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          labelLine={false}
          fontSize={11}
          stroke="#18181b"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: TIP_BG,
            border: `1px solid ${TIP_BORDER}`,
            borderRadius: "6px",
            color: TIP_TEXT,
          }}
          formatter={(value) => `$${Number(value).toFixed(4)}`}
        />
        <Legend
          wrapperStyle={{ color: "#d4d4d8", fontSize: 12 }}
          formatter={(value) => <span style={{ color: "#d4d4d8" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
