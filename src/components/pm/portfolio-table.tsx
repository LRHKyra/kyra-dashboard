"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle, ArrowUpDown, Calendar, RefreshCw, Target,
} from "lucide-react";
import type { InitiativeSummary } from "@/lib/pm-api";

// ── Style maps ─────────────────────────────────────────────────────────────

const RISK_STYLES: Record<string, { label: string; color: string; border: string }> = {
  red:    { label: "Red",    color: "text-red-600",     border: "border-red-400/50" },
  yellow: { label: "Yellow", color: "text-amber-600",   border: "border-amber-400/50" },
  green:  { label: "Green",  color: "text-emerald-600", border: "border-emerald-400/50" },
};

const FORECAST_STYLES: Record<string, { label: string; color: string }> = {
  likely_on_track:  { label: "On Track",    color: "text-emerald-600" },
  at_risk:          { label: "At Risk",     color: "text-amber-600" },
  likely_slip:      { label: "Likely Slip", color: "text-red-600" },
  unknown:          { label: "Unknown",     color: "text-muted-foreground" },
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "border-red-400/50 text-red-600",
  high:     "border-orange-400/50 text-orange-600",
  medium:   "border-amber-400/50 text-amber-600",
  low:      "border-zinc-400/50 text-muted-foreground",
};

const STATUS_STYLES: Record<string, string> = {
  proposed:          "text-muted-foreground",
  planned:           "text-blue-600",
  in_progress:       "text-emerald-600",
  waiting_internal:  "text-amber-600",
  waiting_external:  "text-amber-600",
  blocked:           "text-red-600",
  completed:         "text-emerald-600",
  parked:            "text-muted-foreground/70",
  cancelled:         "text-muted-foreground/70",
};

type FilterPreset = "all" | "active" | "red_yellow" | "blocked" | "likely_slip" | "ceo_attention";
type SortKey = "priority" | "risk_level" | "target_date" | "title";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};
const RISK_ORDER: Record<string, number> = {
  red: 0, yellow: 1, green: 2,
};

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "parked"]);

interface Props {
  initiatives: InitiativeSummary[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function PortfolioTable({
  initiatives, isLoading, error, onSelect, onRefresh, refreshing,
}: Props) {
  const [filter, setFilter] = useState<FilterPreset>("active");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");

  const allInits = initiatives ?? [];

  const owners = useMemo(
    () => [...new Set(allInits.map((i) => i.owner))].sort(),
    [allInits]
  );
  const categories = useMemo(
    () => [...new Set(allInits.map((i) => i.category))].sort(),
    [allInits]
  );

  const filtered = useMemo(() => {
    let list = allInits;

    // Preset filter
    switch (filter) {
      case "active":
        list = list.filter((i) => !TERMINAL_STATUSES.has(i.status));
        break;
      case "red_yellow":
        list = list.filter((i) => i.risk_level === "red" || i.risk_level === "yellow");
        break;
      case "blocked":
        list = list.filter((i) => i.status === "blocked");
        break;
      case "likely_slip":
        list = list.filter((i) => i.forecast_bucket === "likely_slip");
        break;
      case "ceo_attention":
        list = list.filter((i) => i.ceo_attention_needed);
        break;
    }

    // Owner
    if (ownerFilter !== "all") {
      list = list.filter((i) => i.owner === ownerFilter);
    }
    // Category
    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category === categoryFilter);
    }

    // Sort
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "priority":
          return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
        case "risk_level":
          return (RISK_ORDER[a.risk_level] ?? 9) - (RISK_ORDER[b.risk_level] ?? 9);
        case "target_date": {
          const da = a.target_date ?? "9999";
          const db = b.target_date ?? "9999";
          return da.localeCompare(db);
        }
        case "title":
          return a.title.localeCompare(b.title);
      }
    });

    return list;
  }, [allInits, filter, ownerFilter, categoryFilter, sortKey]);

  // Summary stats
  const active = allInits.filter((i) => !TERMINAL_STATUSES.has(i.status));
  const redCount = active.filter((i) => i.risk_level === "red").length;
  const blockedCount = active.filter((i) => i.status === "blocked").length;
  const ceoCount = active.filter((i) => i.ceo_attention_needed).length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Active", value: active.length },
          { label: "Red Risk", value: redCount, alert: redCount > 0 },
          { label: "Blocked", value: blockedCount, alert: blockedCount > 0 },
          { label: "CEO Attention", value: ceoCount, alert: ceoCount > 0 },
        ].map((s) => (
          <Card key={s.label} className={s.alert ? "border-red-500/30" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${s.alert ? "text-red-600" : "text-muted-foreground"}`}>
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.alert ? "text-red-600" : ""}`}>
                {isLoading ? <Skeleton className="h-7 w-12" /> : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterPreset)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="red_yellow">Red / Yellow</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="likely_slip">Likely Slip</SelectItem>
            <SelectItem value="ceo_attention">CEO Attention</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="risk_level">Risk</SelectItem>
            <SelectItem value="target_date">Target Date</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="h-8 text-xs"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh Portfolio"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load portfolio: {error.message}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Owner</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs">Forecast</TableHead>
                <TableHead className="text-xs">Target</TableHead>
                <TableHead className="text-xs w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No initiatives match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((init) => {
                  const risk = RISK_STYLES[init.risk_level] ?? { label: init.risk_level, color: "text-muted-foreground", border: "border-zinc-500/50" };
                  const forecast = FORECAST_STYLES[init.forecast_bucket] ?? { label: init.forecast_bucket, color: "text-muted-foreground" };

                  return (
                    <TableRow
                      key={init.initiative_id}
                      className="cursor-pointer"
                      onClick={() => onSelect(init.initiative_id)}
                    >
                      <TableCell className="font-medium text-sm max-w-[240px] truncate">
                        <div className="flex items-center gap-1.5">
                          {init.ceo_attention_needed && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          )}
                          {init.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{init.owner}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLES[init.priority] ?? ""}`}>
                          {init.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs ${STATUS_STYLES[init.status] ?? "text-muted-foreground"}`}>
                          {init.status.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${risk.color} ${risk.border}`}>
                          {risk.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs ${forecast.color}`}>{forecast.label}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {init.target_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(init.target_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
