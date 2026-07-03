"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Link2Off } from "lucide-react";
import type { SalesDeal, PipelineSummary, RevenueBreakdown, UnlinkedLedgerEmployer } from "./types";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

const MIX_SEGMENTS = [
  { key: "platformFees", label: "Platform fees", color: "bg-emerald-500", dot: "bg-emerald-500" },
  { key: "commissions", label: "Commissions", color: "bg-sky-500", dot: "bg-sky-500" },
  { key: "ccFees", label: "Card fees", color: "bg-amber-400", dot: "bg-amber-400" },
] as const;

/** Slim stacked bar showing the platform / commissions / card-fee mix. */
function RevenueMixBar({
  breakdown,
  className = "",
}: {
  breakdown: RevenueBreakdown;
  className?: string;
}) {
  const total = breakdown.platformFees + breakdown.commissions + breakdown.ccFees;
  if (total <= 0) return null;
  const title = MIX_SEGMENTS.map((s) => `${s.label}: ${fmt(breakdown[s.key])}`).join(" · ");
  return (
    <div
      className={`flex h-1.5 w-full overflow-hidden rounded-full bg-muted ${className}`}
      title={title}
    >
      {MIX_SEGMENTS.map((s) => (
        <div
          key={s.key}
          className={s.color}
          style={{ width: `${(breakdown[s.key] / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function RevenueMixLegend({ breakdown }: { breakdown: RevenueBreakdown }) {
  return (
    <div className="flex items-center gap-4">
      {MIX_SEGMENTS.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
          <span className="text-[11px] text-muted-foreground">{s.label}</span>
          <span className="text-[11px] font-semibold tabular-nums text-foreground">
            {fmt(breakdown[s.key])}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ContractedRevenue({
  won,
  unlinkedEmployers = [],
  summary,
}: {
  won: SalesDeal[];
  unlinkedEmployers?: UnlinkedLedgerEmployer[];
  summary: PipelineSummary;
}) {
  const breakdown = summary.revenueBreakdown;
  const dq = summary.dataQuality;
  const dqIssues = dq
    ? [
        dq.coveragesMissingContractRule > 0 &&
          `${dq.coveragesMissingContractRule} enrolled coverages missing commission contract rules (commissions read as $0)`,
        dq.coveragesUnlinked > 0 &&
          `${dq.coveragesUnlinked} coverages linked to an employer but not billable`,
        dq.unattributedCoverages > 0 &&
          `${dq.unattributedCoverages} enrolled coverages (${dq.unattributedMemberLives} lives) not attributed to any employer`,
        dq.hubspotFallbackDeals > 0 &&
          `${dq.hubspotFallbackDeals} closed-won deals not linked to a ledger employer (showing HubSpot estimates)`,
      ].filter((issue): issue is string => Boolean(issue))
    : [];

  // Table totals reconcile to the ledger KPIs: ledger-sourced deal rows +
  // unlinked ledger employers account for every live employee and dollar.
  // HubSpot-estimate fallback rows stay visible but are excluded from totals —
  // their employer may already be counted in a "no deal linked" row.
  const hasLedger = Boolean(breakdown);
  const totaled = hasLedger ? won.filter((d) => d.revenueSource === "ledger") : won;
  const totalRevenue =
    totaled.reduce((s, d) => s + d.revenue, 0) +
    unlinkedEmployers.reduce((s, e) => s + e.revenue, 0);
  const totalLiveEmployees =
    totaled.reduce((s, d) => s + (d.liveEmployees ?? 0), 0) +
    unlinkedEmployers.reduce((s, e) => s + e.liveEmployees, 0);
  const totalMemberLives =
    totaled.reduce((s, d) => s + d.memberLives, 0) +
    unlinkedEmployers.reduce((s, e) => s + e.memberLives, 0);
  const excludedEstimates = hasLedger ? won.length - totaled.length : 0;

  const metrics = [
    {
      label: "Live Employees",
      value: summary.liveEmployees != null ? String(summary.liveEmployees) : "—",
      sub: "Billable this month",
    },
    {
      label: "Member Lives",
      value: String(summary.totalLives),
      sub: "Employees + dependents",
    },
    {
      label: "Avg PEPM",
      value: `$${summary.avgPEPM.toFixed(2)}`,
      sub: summary.liveEmployees ? "Per employee per month" : "Per member (fallback)",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Ledger fallback warning */}
      {summary.ledgerError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Commission ledger unavailable — showing HubSpot estimates.{" "}
            <span className="font-mono">{summary.ledgerError}</span>
          </span>
        </div>
      )}

      {/* Metric cards: ARR with revenue-mix visualization, then counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Contracted ARR</p>
            <p className="text-3xl font-bold text-emerald-600 tracking-tight">
              {fmt(summary.contractedARR)}
            </p>
            {breakdown && (
              <div className="mt-3 space-y-2">
                <RevenueMixBar breakdown={breakdown} />
                <RevenueMixLegend breakdown={breakdown} />
              </div>
            )}
          </CardContent>
        </Card>
        <div className="grid grid-cols-3 gap-4">
          {metrics.map((m) => (
            <Card key={m.label} className="py-0 gap-0">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Data quality issues */}
      {dqIssues.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Data quality</p>
          <ul className="space-y-1">
            {dqIssues.map((issue) => (
              <li key={issue} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Won deals table */}
      <Card className="py-0 gap-0">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Closed Won Employers</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employer Group</TableHead>
                <TableHead className="text-xs text-right">Annual Revenue</TableHead>
                <TableHead className="text-xs w-28">Revenue Mix</TableHead>
                <TableHead className="text-xs text-right">Live Employees</TableHead>
                <TableHead className="text-xs text-right">Member Lives</TableHead>
                <TableHead className="text-xs text-right">Employees Quoted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {won.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm font-medium">
                    {d.name}
                    {d.revenueSource !== "ledger" && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        HubSpot est.
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums text-emerald-600 font-medium">
                    {d.revenue > 0 ? fmt(d.revenue) : "—"}
                  </TableCell>
                  <TableCell>
                    {d.revenueBreakdown && <RevenueMixBar breakdown={d.revenueBreakdown} />}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{d.liveEmployees ?? "—"}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{d.memberLives || "—"}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{d.employeesQuoted || "—"}</TableCell>
                </TableRow>
              ))}
              {/* Ledger employers not linked to any closed-won deal — shown so
                  the table reconciles with the KPI totals above. */}
              {unlinkedEmployers.map((e) => (
                <TableRow key={e.name} className="bg-amber-50/40">
                  <TableCell className="text-sm font-medium">
                    <span className="flex items-center gap-1.5">
                      {e.name}
                      <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        <Link2Off className="h-2.5 w-2.5" />
                        no deal linked
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums text-emerald-600 font-medium">
                    {fmt(e.revenue)}
                  </TableCell>
                  <TableCell>
                    <RevenueMixBar breakdown={e.revenueBreakdown} />
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{e.liveEmployees}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{e.memberLives}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums text-muted-foreground">—</TableCell>
                </TableRow>
              ))}
              {/* Totals row — ledger truth only, ties to the KPI cards */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell className="text-sm">
                  Total
                  {excludedEstimates > 0 && (
                    <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                      excludes {excludedEstimates} HubSpot estimate{excludedEstimates > 1 ? "s" : ""}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums text-emerald-600">
                  {fmt(totalRevenue)}
                </TableCell>
                <TableCell />
                <TableCell className="text-sm text-right tabular-nums">
                  {totalLiveEmployees || "—"}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums">{totalMemberLives}</TableCell>
                <TableCell className="text-sm text-right tabular-nums">
                  {won.reduce((s, d) => s + d.employeesQuoted, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
