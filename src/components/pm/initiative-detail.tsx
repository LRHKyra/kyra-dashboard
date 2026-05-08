"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, Calendar, ChevronRight, Lightbulb, Loader2, ShieldAlert, TrendingUp, User,
} from "lucide-react";
import {
  useInitiative, useDependencies, useSignals, useSignalRollup,
  suggestNextStep, applyNextStep,
  type NextStepSuggestion,
} from "@/lib/pm-api";

const RISK_COLOR: Record<string, string> = {
  red: "text-red-600", yellow: "text-amber-600", green: "text-emerald-600",
};
const FORECAST_COLOR: Record<string, string> = {
  likely_on_track: "text-emerald-600", at_risk: "text-amber-600",
  likely_slip: "text-red-600", unknown: "text-muted-foreground",
};

interface Props {
  initiativeId: string | null;
  onClose: () => void;
}

export function InitiativeDetail({ initiativeId, onClose }: Props) {
  const { data: init, isLoading } = useInitiative(initiativeId);
  const { data: deps } = useDependencies(initiativeId ?? undefined);
  const { data: signals } = useSignals(initiativeId);
  const { data: rollup } = useSignalRollup(initiativeId);

  const [signalFilter, setSignalFilter] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<NextStepSuggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [applying, setApplying] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);

  const handleSuggest = async () => {
    if (!initiativeId) return;
    setSuggesting(true);
    setSuggestion(null);
    setApplied(false);
    try {
      const result = await suggestNextStep(initiativeId);
      setSuggestion(result);
    } catch {
      // Error handled by UI state
    } finally {
      setSuggesting(false);
    }
  };

  const handleApply = async (index: number) => {
    if (!initiativeId) return;
    setApplying(index);
    try {
      await applyNextStep(initiativeId, index);
      setApplied(true);
      setSuggestion(null);
    } catch {
      // Error handled by UI state
    } finally {
      setApplying(null);
    }
  };

  const handleClose = () => {
    setSuggestion(null);
    setSuggesting(false);
    setApplying(null);
    setApplied(false);
    onClose();
  };

  return (
    <Dialog open={!!initiativeId} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading || !init ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start gap-2">
                {init.ceo_attention_needed && (
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <DialogTitle className="text-base leading-snug">{init.title}</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {init.initiative_id} · {init.category}
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Key fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Owner" icon={<User className="h-3 w-3" />}>
                {init.owner}
              </Field>
              <Field label="Priority">
                <Badge variant="outline" className="text-[10px]">{init.priority}</Badge>
              </Field>
              <Field label="Status">
                <span className="text-xs">{init.status.replace(/_/g, " ")}</span>
              </Field>
              <Field label="Target" icon={<Calendar className="h-3 w-3" />}>
                {init.target_date
                  ? new Date(init.target_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </Field>
            </div>

            {/* Risk + Forecast */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className={`text-sm font-semibold ${RISK_COLOR[init.risk_level] ?? "text-muted-foreground"}`}>
                    {init.risk_level}
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className={`text-sm font-semibold ${FORECAST_COLOR[init.forecast_bucket] ?? "text-muted-foreground"}`}>
                    {init.forecast_bucket.replace(/_/g, " ")}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            {init.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{init.description}</p>
              </div>
            )}

            {/* Next step */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Next Step</p>
              {init.next_step_text ? (
                <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm">{init.next_step_text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Owner: {init.next_step_owner || "—"}
                        {init.next_step_due_date && ` · Due: ${init.next_step_due_date}`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No next step set</p>
              )}
            </div>

            {/* Blocker summary */}
            {init.blocker_summary && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Blockers</p>
                <p className="text-sm text-red-600">{init.blocker_summary}</p>
                {init.blockers.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {init.blockers.map((b) => (
                      <li key={b.blocker_id} className="text-xs flex items-center gap-1.5">
                        <span className={b.resolved ? "text-emerald-600" : "text-red-600"}>
                          {b.resolved ? "✓" : "✗"}
                        </span>
                        {b.description}
                        <span className="text-muted-foreground">({b.reported_by})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* CEO attention */}
            {init.ceo_attention_needed && init.ceo_attention_reason && (
              <div className="rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-600 mb-0.5">CEO Attention Needed</p>
                <p className="text-sm">{init.ceo_attention_reason}</p>
              </div>
            )}

            {/* Signal Rollup */}
            {rollup && rollup.signal_counts.total > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Signal Summary</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(rollup.signal_counts)
                    .filter(([k]) => k !== "total")
                    .map(([type, count]) => (
                      <Badge
                        key={type}
                        variant={signalFilter === type ? "default" : "secondary"}
                        className="text-[10px] cursor-pointer"
                        onClick={() => setSignalFilter(signalFilter === type ? null : type)}
                      >
                        {type.replace("extracted_", "")} ({count})
                      </Badge>
                    ))}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {rollup.signal_counts.total} total
                    {rollup.days_since_last_signal != null && (
                      <> · last {rollup.days_since_last_signal === 0 ? "today" : `${rollup.days_since_last_signal}d ago`}</>
                    )}
                  </span>
                  {rollup.pending_unmatched_count > 0 && (
                    <span className="text-[10px] text-amber-600">
                      {rollup.pending_unmatched_count} unmatched pending review
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Recent Signals */}
            {signals && signals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Recent Signals</p>
                  {signalFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] px-1.5"
                      onClick={() => setSignalFilter(null)}
                    >
                      Clear filter
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {signals
                    .filter((s) => !signalFilter || s.signal_type === signalFilter)
                    .slice(0, 10)
                    .map((s) => (
                    <div key={s.signal_id} className="rounded-md border border-border bg-card/50 px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {s.signal_type.replace("extracted_", "")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {s.timestamp
                            ? new Date(s.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : ""}
                        </span>
                        {s.source && (
                          <span className="text-[10px] text-muted-foreground">{s.source}</span>
                        )}
                        {s.granola_note_id && (
                          <span className="text-[10px] text-muted-foreground/70">via note</span>
                        )}
                      </div>
                      <p className="text-xs">{s.summary}</p>
                      {s.evidence && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 pl-2 border-l-2 border-border">
                          {s.evidence}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            {deps && deps.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dependencies</p>
                <div className="space-y-1">
                  {deps.map((d) => (
                    <div key={d.dependency_id} className="text-xs flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{d.dependency_type}</Badge>
                      <span>{d.upstream_id} → {d.downstream_id}</span>
                      <Badge variant={d.status === "active" ? "destructive" : "secondary"} className="text-[10px]">
                        {d.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stakeholders */}
            {init.stakeholders.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Stakeholders</p>
                <div className="flex gap-1 flex-wrap">
                  {init.stakeholders.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              {init.created_at && <span>Created: {new Date(init.created_at).toLocaleDateString()}</span>}
              {init.updated_at && <span>Updated: {new Date(init.updated_at).toLocaleDateString()}</span>}
              {init.last_meaningful_movement_at && (
                <span>Last movement: {new Date(init.last_meaningful_movement_at).toLocaleDateString()}</span>
              )}
            </div>

            <Separator />

            {/* Suggest next step */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> Next Step Suggestions
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSuggest}
                  disabled={suggesting}
                >
                  {suggesting ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Thinking…</>
                  ) : (
                    "Suggest"
                  )}
                </Button>
              </div>

              {applied && (
                <div className="rounded-md border border-green-500/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-600 mb-2">
                  Next step applied successfully.
                </div>
              )}

              {suggestion && suggestion.suggestions.length > 0 && (
                <div className="space-y-2">
                  {suggestion.suggestions.map((s, i) => (
                    <div key={i} className="rounded-md border border-border bg-card/50 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{s.action}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Owner: {s.owner}
                          </p>
                          <p className="text-xs text-muted-foreground">{s.rationale}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => handleApply(i)}
                          disabled={applying !== null}
                        >
                          {applying === i ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground">
                    Source: {suggestion.source}
                    {suggestion.model_used && ` · ${suggestion.model_used}`}
                  </p>
                </div>
              )}

              {suggestion && suggestion.suggestions.length === 0 && (
                <p className="text-xs text-muted-foreground">No suggestions available.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
