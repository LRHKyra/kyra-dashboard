"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { SalesDeal, StageCount } from "./types";

type DealSortKey =
  | "name"
  | "stage"
  | "effectiveDate"
  | "revenue"
  | "memberLives"
  | "probability"
  | "weightedRevenue";

type SortDirection = "asc" | "desc";

type DealSort = {
  key: DealSortKey;
  direction: SortDirection;
};

const fmt = (n: number) => `$${n.toLocaleString()}`;

const dateValue = (value: string | null) => {
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const fmtDate = (value: string | null) => {
  const ms = dateValue(value);
  if (ms === null) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
};

const compareText = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

const compareNullable = (
  aValue: number | string | null,
  bValue: number | string | null,
  direction: SortDirection,
) => {
  const aMissing = aValue === null || aValue === "";
  const bMissing = bValue === null || bValue === "";

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  const result =
    typeof aValue === "string" && typeof bValue === "string"
      ? compareText(aValue, bValue)
      : Number(aValue) - Number(bValue);

  return direction === "asc" ? result : -result;
};

const numericValue = (value: number) =>
  Number.isFinite(value) && value > 0 ? value : null;

const probabilityValue = (value: number) =>
  Number.isFinite(value) ? value : null;

const compareDeals = (
  a: { deal: SalesDeal; index: number },
  b: { deal: SalesDeal; index: number },
  sort: DealSort,
) => {
  let result = 0;

  if (sort.key === "name") {
    result = compareNullable(a.deal.name, b.deal.name, sort.direction);
  } else if (sort.key === "stage") {
    result = compareNullable(a.deal.stageOrder, b.deal.stageOrder, sort.direction);
  } else if (sort.key === "effectiveDate") {
    result = compareNullable(
      dateValue(a.deal.effectiveDate),
      dateValue(b.deal.effectiveDate),
      sort.direction,
    );
  } else if (sort.key === "revenue") {
    result = compareNullable(
      numericValue(a.deal.revenue),
      numericValue(b.deal.revenue),
      sort.direction,
    );
  } else if (sort.key === "memberLives") {
    result = compareNullable(
      numericValue(a.deal.memberLives),
      numericValue(b.deal.memberLives),
      sort.direction,
    );
  } else if (sort.key === "probability") {
    result = compareNullable(
      probabilityValue(a.deal.probability),
      probabilityValue(b.deal.probability),
      sort.direction,
    );
  } else if (sort.key === "weightedRevenue") {
    result = compareNullable(
      numericValue(a.deal.weightedRevenue),
      numericValue(b.deal.weightedRevenue),
      sort.direction,
    );
  }

  if (result !== 0) return result;

  return (
    a.deal.stageOrder - b.deal.stageOrder ||
    compareText(a.deal.name, b.deal.name) ||
    a.index - b.index
  );
};

// Stage colors — Kyra brand palette progression (early→late pipeline)
const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  "Lead Identified":         { bg: "bg-slate-100 dark:bg-slate-800",    text: "text-slate-700 dark:text-slate-300" },
  "RFP Received":            { bg: "bg-violet-100 dark:bg-violet-900",  text: "text-violet-700 dark:text-violet-300" },
  "RFP Sent for Quote":      { bg: "bg-indigo-100 dark:bg-indigo-900",  text: "text-indigo-700 dark:text-indigo-300" },
  "RFP Converted to Proposal": { bg: "bg-blue-100 dark:bg-blue-900",   text: "text-blue-700 dark:text-blue-300" },
  "Proposal Sent":           { bg: "bg-sky-100 dark:bg-sky-900",        text: "text-sky-700 dark:text-sky-300" },
  "Broker Presenting":       { bg: "bg-amber-100 dark:bg-amber-900",    text: "text-amber-700 dark:text-amber-300" },
  "Verbal Commitment":       { bg: "bg-emerald-100 dark:bg-emerald-900",text: "text-emerald-700 dark:text-emerald-300" },
  "Contract Negotiation":    { bg: "bg-green-100 dark:bg-green-900",    text: "text-green-700 dark:text-green-300" },
  "Contract Agreement":      { bg: "bg-green-200 dark:bg-green-800",    text: "text-green-800 dark:text-green-200" },
};

const DEFAULT_STAGE_COLOR = { bg: "bg-secondary", text: "text-secondary-foreground" };

function stageColor(stage: string) {
  return STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
}

// ---------------------------------------------------------------------------
// Stage revenue bar chart
// ---------------------------------------------------------------------------

function StageChart({ stages }: { stages: StageCount[] }) {
  const data = stages.map((s) => ({
    name: s.label,
    revenue: Math.round(s.revenue / 1000 * 10) / 10, // in $K
    deals: s.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}K`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [`$${value}K`, "Est. Annual Revenue"]}
        />
        <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SortHead({
  sortKey,
  active,
  direction,
  onSort,
  children,
  align = "left",
}: {
  sortKey: DealSortKey;
  active: boolean;
  direction: SortDirection | undefined;
  onSort: (key: DealSortKey) => void;
  children: string;
  align?: "left" | "right";
}) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition hover:bg-muted hover:text-foreground ${
        active ? "text-foreground" : "text-muted-foreground"
      } ${align === "right" ? "ml-auto justify-end" : ""}`}
    >
      <span>{children}</span>
      <Icon className="h-3 w-3" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Deal table
// ---------------------------------------------------------------------------

function DealTable({ deals }: { deals: SalesDeal[] }) {
  const [sort, setSort] = useState<DealSort | null>(null);

  const sortedDeals = useMemo(() => {
    if (!sort) return deals;

    return deals
      .map((deal, index) => ({ deal, index }))
      .sort((a, b) => compareDeals(a, b, sort))
      .map(({ deal }) => deal);
  }, [deals, sort]);

  const sortBy = (key: DealSortKey) => {
    setSort((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: "asc" };
    });
  };

  return (
    <div className="overflow-auto max-h-[320px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">
              <SortHead sortKey="name" active={sort?.key === "name"} direction={sort?.direction} onSort={sortBy}>
                Deal
              </SortHead>
            </TableHead>
            <TableHead className="text-xs">
              <SortHead sortKey="stage" active={sort?.key === "stage"} direction={sort?.direction} onSort={sortBy}>
                Stage
              </SortHead>
            </TableHead>
            <TableHead className="text-xs">
              <SortHead
                sortKey="effectiveDate"
                active={sort?.key === "effectiveDate"}
                direction={sort?.direction}
                onSort={sortBy}
              >
                Effective Date
              </SortHead>
            </TableHead>
            <TableHead className="text-xs text-right">
              <SortHead
                sortKey="revenue"
                active={sort?.key === "revenue"}
                direction={sort?.direction}
                onSort={sortBy}
                align="right"
              >
                Est. ARR
              </SortHead>
            </TableHead>
            <TableHead className="text-xs text-right">
              <SortHead
                sortKey="memberLives"
                active={sort?.key === "memberLives"}
                direction={sort?.direction}
                onSort={sortBy}
                align="right"
              >
                Lives
              </SortHead>
            </TableHead>
            <TableHead className="text-xs text-right">
              <SortHead
                sortKey="probability"
                active={sort?.key === "probability"}
                direction={sort?.direction}
                onSort={sortBy}
                align="right"
              >
                Prob.
              </SortHead>
            </TableHead>
            <TableHead className="text-xs text-right">
              <SortHead
                sortKey="weightedRevenue"
                active={sort?.key === "weightedRevenue"}
                direction={sort?.direction}
                onSort={sortBy}
                align="right"
              >
                Weighted
              </SortHead>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedDeals.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="text-sm font-medium">{d.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] font-normal border-0 ${stageColor(d.stage).bg} ${stageColor(d.stage).text}`}>
                  {d.stage}
                </Badge>
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {fmtDate(d.effectiveDate)}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {d.revenue > 0 ? fmt(d.revenue) : "—"}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {d.memberLives > 0 ? d.memberLives : "—"}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {Math.round(d.probability * 100)}%
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums font-medium">
                {d.weightedRevenue > 0 ? fmt(Math.round(d.weightedRevenue)) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function EmployerPipeline({
  sales,
}: {
  sales: {
    open: SalesDeal[];
    won: SalesDeal[];
    stageChart: StageCount[];
  };
}) {
  const totalOpen = sales.open.reduce((s, d) => s + d.revenue, 0);
  const totalWeighted = sales.open.reduce((s, d) => s + d.weightedRevenue, 0);

  return (
    <div className="space-y-4">
      {/* Chart + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 py-0 gap-0">
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Revenue by Stage</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <StageChart stages={sales.stageChart} />
          </CardContent>
        </Card>

        <Card className="py-0 gap-0">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Pipeline Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Open Pipeline</p>
              <p className="text-2xl font-bold text-foreground">{fmt(totalOpen)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weighted Pipeline</p>
              <p className="text-2xl font-bold text-primary">{fmt(Math.round(totalWeighted))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Deals</p>
              <p className="text-2xl font-bold text-foreground">{sales.open.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Deal Size</p>
              <p className="text-lg font-semibold text-foreground">
                {sales.open.length > 0 ? fmt(Math.round(totalOpen / sales.open.length)) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal table */}
      <Card className="py-0 gap-0">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Open Deals</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <DealTable deals={sales.open} />
        </CardContent>
      </Card>
    </div>
  );
}
