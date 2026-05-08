"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Check, Eye, X } from "lucide-react";
import {
  useAlerts,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  type AlertOut,
} from "@/lib/pm-api";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-400/50 text-red-600",
  high:     "border-orange-400/50 text-orange-600",
  medium:   "border-amber-400/50 text-amber-600",
  low:      "border-zinc-400/50 text-muted-foreground",
  info:     "border-blue-400/50 text-blue-600",
};

export function AlertsPanel() {
  const { data: alerts, isLoading, error } = useAlerts();
  const [acting, setActing] = useState<string | null>(null);

  const handleAction = async (
    alertId: string,
    action: "acknowledge" | "resolve" | "dismiss"
  ) => {
    setActing(alertId);
    try {
      switch (action) {
        case "acknowledge":
          await acknowledgeAlert(alertId);
          break;
        case "resolve":
          await resolveAlert(alertId);
          break;
        case "dismiss":
          await dismissAlert(alertId);
          break;
      }
    } catch {
      // Errors are visible from the mutate/revalidation
    } finally {
      setActing(null);
    }
  };

  const openAlerts = alerts ?? [];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={openAlerts.length > 0 ? "border-amber-500/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${openAlerts.length > 0 ? "text-amber-600" : ""}`}>
              {isLoading ? <Skeleton className="h-7 w-12" /> : openAlerts.length}
            </div>
          </CardContent>
        </Card>
        <Card className={openAlerts.filter((a) => a.severity === "critical").length > 0 ? "border-red-500/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${openAlerts.filter((a) => a.severity === "critical").length > 0 ? "text-red-600" : ""}`}>
              {isLoading ? <Skeleton className="h-7 w-12" /> : openAlerts.filter((a) => a.severity === "critical").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Initiatives Affected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-7 w-12" /> : new Set(openAlerts.map((a) => a.initiative_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load alerts: {error.message}
        </div>
      )}

      {/* Alert table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Alert</TableHead>
                <TableHead className="text-xs">Initiative</TableHead>
                <TableHead className="text-xs">Severity</TableHead>
                <TableHead className="text-xs">Reason</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : openAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Check className="h-5 w-5 text-emerald-600" />
                      No open alerts
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                openAlerts.map((alert) => (
                  <AlertRow
                    key={alert.alert_id}
                    alert={alert}
                    acting={acting === alert.alert_id}
                    onAction={(action) => handleAction(alert.alert_id, action)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertRow({
  alert,
  acting,
  onAction,
}: {
  alert: AlertOut;
  acting: boolean;
  onAction: (action: "acknowledge" | "resolve" | "dismiss") => void;
}) {
  const sevStyle = SEVERITY_STYLES[alert.severity] ?? "border-zinc-500/50 text-muted-foreground";

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium">{alert.title}</p>
            <p className="text-[10px] text-muted-foreground">{alert.alert_type.replace(/_/g, " ")}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{alert.initiative_id}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-[10px] ${sevStyle}`}>
          {alert.severity}
        </Badge>
      </TableCell>
      <TableCell className="text-xs max-w-[200px] truncate">{alert.reason}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {alert.created_at
          ? new Date(alert.created_at).toLocaleDateString([], { month: "short", day: "numeric" })
          : "—"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {alert.status === "open" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onAction("acknowledge")}
              disabled={acting}
              title="Acknowledge"
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAction("resolve")}
            disabled={acting}
            title="Resolve"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAction("dismiss")}
            disabled={acting}
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
