"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { SalesDeal, PipelineSummary } from "./types";

const fmt = (n: number) => `$${n.toLocaleString()}`;

export function ContractedRevenue({
  won,
  summary,
}: {
  won: SalesDeal[];
  summary: PipelineSummary;
}) {
  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Contracted ARR", value: fmt(summary.contractedARR), color: "text-emerald-600" },
          { label: "Member Lives", value: String(summary.totalLives), color: "text-foreground" },
          { label: "Avg PEPM", value: `$${summary.avgPEPM.toFixed(2)}`, color: "text-foreground" },
        ].map((m) => (
          <Card key={m.label} className="py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
                <TableHead className="text-xs text-right">Est. Annual Revenue</TableHead>
                <TableHead className="text-xs text-right">Member Lives</TableHead>
                <TableHead className="text-xs text-right">Employees Quoted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {won.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm font-medium">{d.name}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums text-emerald-600 font-medium">
                    {d.revenue > 0 ? fmt(d.revenue) : "—"}
                  </TableCell>
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
