"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import type { SalesDeal, PipelineSummary } from "./types";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function ContractedRevenue({
  won,
  summary,
}: {
  won: SalesDeal[];
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
        dq.unmatchedLedgerEmployers.length > 0 &&
          `Ledger employers with revenue but no closed-won deal: ${dq.unmatchedLedgerEmployers.join(", ")}`,
      ].filter((issue): issue is string => Boolean(issue))
    : [];

  const metrics = [
    {
      label: "Contracted ARR",
      value: fmt(summary.contractedARR),
      sub: breakdown
        ? `${fmt(breakdown.platformFees)} platform · ${fmt(breakdown.commissions)} commissions · ${fmt(breakdown.ccFees)} card fees`
        : undefined,
      color: "text-emerald-600",
    },
    {
      label: "Live Employees",
      value: summary.liveEmployees != null ? String(summary.liveEmployees) : "—",
      sub: "Billable this month",
      color: "text-foreground",
    },
    {
      label: "Member Lives",
      value: String(summary.totalLives),
      sub: "Employees + dependents",
      color: "text-foreground",
    },
    {
      label: "Avg PEPM",
      value: `$${summary.avgPEPM.toFixed(2)}`,
      sub: summary.liveEmployees ? "Per employee per month" : "Per member (fallback)",
      color: "text-foreground",
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

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              {m.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{m.sub}</p>}
            </CardContent>
          </Card>
        ))}
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
                    {d.revenueBreakdown && (
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {fmt(d.revenueBreakdown.platformFees)} platform · {fmt(d.revenueBreakdown.commissions)} comm · {fmt(d.revenueBreakdown.ccFees)} card
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{d.liveEmployees ?? "—"}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{d.memberLives || "—"}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{d.employeesQuoted || "—"}</TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell className="text-sm">Total</TableCell>
                <TableCell className="text-sm text-right tabular-nums text-emerald-600">
                  {fmt(won.reduce((s, d) => s + d.revenue, 0))}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums">
                  {won.reduce((s, d) => s + (d.liveEmployees ?? 0), 0) || "—"}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums">
                  {won.reduce((s, d) => s + d.memberLives, 0)}
                </TableCell>
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
