"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Link2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  useUnmatchedSignals,
  useInitiatives,
  resolveUnmatched,
  rejectUnmatched,
  type UnmatchedSignal,
  type InitiativeSummary,
} from "@/lib/pm-api";

// ── Style maps ──────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, { label: string; color: string }> = {
  extracted_blocker: {
    label: "Blocker",
    color: "bg-red-500/20 text-red-300",
  },
  extracted_decision: {
    label: "Decision",
    color: "bg-blue-500/20 text-blue-300",
  },
  extracted_commitment: {
    label: "Commitment",
    color: "bg-purple-500/20 text-purple-300",
  },
  extracted_progress: {
    label: "Progress",
    color: "bg-green-500/20 text-green-300",
  },
  meeting_occurred: {
    label: "Meeting",
    color: "bg-zinc-500/20 text-foreground/80",
  },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-red-600",
};

const RESOLUTION_LABELS: Record<string, string> = {
  manual_attach: "Manually attached",
  rejected: "Rejected",
  auto_linked: "Auto-linked",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function isBlocker(item: UnmatchedSignal) {
  return item.signal_type === "extracted_blocker";
}

/** Group items by source_note_id, preserving order within groups. */
function groupByNote(items: UnmatchedSignal[]) {
  const groups: { noteId: string; noteTitle: string; date: string; items: UnmatchedSignal[] }[] = [];
  const seen = new Map<string, number>();

  for (const item of items) {
    const key = item.source_note_id || `_standalone_${item.id}`;
    const idx = seen.get(key);
    if (idx !== undefined) {
      groups[idx].items.push(item);
    } else {
      seen.set(key, groups.length);
      groups.push({
        noteId: item.source_note_id,
        noteTitle: item.source_note_title || item.title,
        date: item.meeting_date,
        items: [item],
      });
    }
  }
  return groups;
}

// ── Main component ──────────────────────────────────────────────────────────

export function UnmatchedReview() {
  const [showResolved, setShowResolved] = useState(false);
  const {
    data: pendingData,
    isLoading: pendingLoading,
    error: pendingError,
    mutate: revalidatePending,
  } = useUnmatchedSignals(false);
  const {
    data: resolvedData,
    mutate: revalidateResolved,
  } = useUnmatchedSignals(true);
  const { data: initiatives } = useInitiatives();

  const [actionInFlight, setActionInFlight] = useState<number | null>(null);
  const [resolveTarget, setResolveTarget] = useState<Record<number, string>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    item: UnmatchedSignal;
    initiativeId: string;
    initiativeTitle: string;
  } | null>(null);

  const revalidateAll = () => {
    revalidatePending();
    revalidateResolved();
  };

  if (pendingLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (pendingError) {
    return (
      <Card className="border-red-500/50">
        <CardContent className="py-6 text-red-600">
          Failed to load unmatched signals: {pendingError.message}
        </CardContent>
      </Card>
    );
  }

  const pendingItems = pendingData?.items ?? [];
  const resolvedItems = resolvedData?.items ?? [];
  const pendingGroups = groupByNote(pendingItems);

  // ── Actions ─────────────────────────────────────────────────────────────

  const getSelectedInitiativeId = (item: UnmatchedSignal) =>
    resolveTarget[item.id] || item.suggested_initiative_id || "";

  const getInitiativeTitle = (id: string) =>
    initiatives?.find((i) => i.initiative_id === id)?.title ?? id;

  const startResolve = (item: UnmatchedSignal) => {
    const initiativeId = getSelectedInitiativeId(item);
    if (!initiativeId) return;

    // Blockers require explicit confirmation
    if (isBlocker(item)) {
      setConfirmDialog({
        item,
        initiativeId,
        initiativeTitle: getInitiativeTitle(initiativeId),
      });
      return;
    }

    doResolve(item.id, initiativeId);
  };

  const doResolve = async (id: number, initiativeId: string) => {
    setActionInFlight(id);
    try {
      await resolveUnmatched(id, initiativeId);
      revalidateAll();
    } catch {
      // User sees item still in list
    } finally {
      setActionInFlight(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionInFlight(id);
    try {
      await rejectUnmatched(id);
      revalidateAll();
    } catch {
      // Silent
    } finally {
      setActionInFlight(null);
    }
  };

  const confirmBlockerResolve = () => {
    if (!confirmDialog) return;
    doResolve(confirmDialog.item.id, confirmDialog.initiativeId);
    setConfirmDialog(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-foreground/80">
          {pendingItems.length === 0
            ? "No signals pending review"
            : `${pendingItems.length} signal${pendingItems.length !== 1 ? "s" : ""} pending review`}
        </h3>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="text-xs text-amber-600 border-yellow-500/40"
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            Blockers first, then confidence
          </Badge>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground/80 transition-colors"
          >
            {showResolved ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {resolvedItems.length} resolved
          </button>
        </div>
      </div>

      {/* Empty state */}
      {pendingItems.length === 0 && !showResolved && (
        <Card className="border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
            All signals have been reviewed.
          </CardContent>
        </Card>
      )}

      {/* Pending — grouped by source note */}
      {pendingGroups.map((group) => (
        <div key={group.noteId || group.items[0].id} className="space-y-2">
          {/* Note group header (only when >1 signal from same note) */}
          {group.items.length > 1 && group.noteId && (
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground/70">
              <Clock className="h-3 w-3" />
              <span>
                {group.noteTitle}
                {group.date && ` — ${group.date}`}
              </span>
              <span className="text-muted-foreground/50">
                ({group.items.length} signals)
              </span>
            </div>
          )}

          {group.items.map((item) => (
            <UnmatchedCard
              key={item.id}
              item={item}
              initiatives={initiatives ?? []}
              resolveTarget={resolveTarget[item.id] ?? ""}
              onResolveTargetChange={(val) =>
                setResolveTarget((prev) => ({ ...prev, [item.id]: val }))
              }
              onResolve={() => startResolve(item)}
              onReject={() => handleReject(item.id)}
              busy={actionInFlight === item.id}
            />
          ))}
        </div>
      ))}

      {/* Resolved history */}
      {showResolved && resolvedItems.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="px-1 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            Recently resolved
          </h4>
          {resolvedItems.map((item) => (
            <ResolvedCard key={item.id} item={item} />
          ))}
        </div>
      )}
      {showResolved && resolvedItems.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground/50">No resolved signals yet.</p>
      )}

      {/* Blocker confirmation dialog */}
      <BlockerConfirmDialog
        open={confirmDialog !== null}
        item={confirmDialog?.item ?? null}
        initiativeTitle={confirmDialog?.initiativeTitle ?? ""}
        onConfirm={confirmBlockerResolve}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}

// ── Pending card ────────────────────────────────────────────────────────────

function UnmatchedCard({
  item,
  initiatives,
  resolveTarget,
  onResolveTargetChange,
  onResolve,
  onReject,
  busy,
}: {
  item: UnmatchedSignal;
  initiatives: InitiativeSummary[];
  resolveTarget: string;
  onResolveTargetChange: (val: string) => void;
  onResolve: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const style = TYPE_STYLES[item.signal_type] ?? {
    label: item.signal_type,
    color: "bg-zinc-500/20 text-foreground/80",
  };
  const confStyle = CONFIDENCE_STYLES[item.match_confidence] ?? "text-muted-foreground";
  const blocker = isBlocker(item);
  const selectedId = resolveTarget || item.suggested_initiative_id || "";

  return (
    <Card
      className={
        blocker
          ? "border-red-500/30 bg-red-50"
          : "border-border"
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className={style.color}>{style.label}</Badge>
            {blocker && (
              <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
            )}
            <span className="text-sm text-foreground">{item.summary}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {item.match_confidence && (
              <Badge
                variant="outline"
                className={`text-[10px] ${confStyle} border-current/30`}
              >
                {item.match_confidence}
              </Badge>
            )}
            {item.meeting_date && (
              <span className="text-xs text-muted-foreground/70">{item.meeting_date}</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Evidence — prominent for blockers */}
        {item.evidence && (
          <p
            className={`rounded px-3 py-2 text-xs italic ${
              blocker
                ? "bg-red-50 text-red-200 border border-red-500/20"
                : "bg-muted text-foreground/80"
            }`}
          >
            &ldquo;{item.evidence}&rdquo;
          </p>
        )}

        {/* Source & match info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {item.source_note_title && (
            <span>Note: {item.source_note_title}</span>
          )}
          {item.attendees.length > 0 && (
            <span>Attendees: {item.attendees.join(", ")}</span>
          )}
          {item.match_method && (
            <span>
              Match:{" "}
              <span className={confStyle}>{item.match_method}</span>
            </span>
          )}
        </div>

        {/* Match reasons — why it didn't auto-link */}
        {item.match_reasons.length > 0 && (
          <div className="rounded bg-muted/50 px-3 py-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Why not auto-linked:
            </p>
            <ul className="space-y-0.5 text-xs text-muted-foreground/70">
              {item.match_reasons.map((r, i) => (
                <li key={i}>
                  <span className="text-muted-foreground/50">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick-confirm for suggested initiative */}
        {item.suggested_initiative_title && !resolveTarget && (
          <div className="flex items-center gap-2 rounded bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Suggested:</span>
            <span className="text-xs font-medium text-foreground">
              {item.suggested_initiative_title}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-6 text-[10px] px-2"
              disabled={busy}
              onClick={onResolve}
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              Confirm
            </Button>
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-2 pt-1">
          <Select value={selectedId} onValueChange={onResolveTargetChange}>
            <SelectTrigger className="h-8 w-[220px] text-xs">
              <SelectValue placeholder="Attach to initiative..." />
            </SelectTrigger>
            <SelectContent>
              {/* Suggested first if exists */}
              {item.suggested_initiative_id && item.suggested_initiative_title && (
                <SelectItem
                  value={item.suggested_initiative_id}
                  className="font-medium"
                >
                  {item.suggested_initiative_title} (suggested)
                </SelectItem>
              )}
              {initiatives
                .filter((i) => i.initiative_id !== item.suggested_initiative_id)
                .map((init) => (
                  <SelectItem
                    key={init.initiative_id}
                    value={init.initiative_id}
                  >
                    {init.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            className={`h-8 text-xs ${
              blocker ? "border-red-500/40 text-red-300 hover:bg-red-50" : ""
            }`}
            disabled={busy || !selectedId}
            onClick={onResolve}
          >
            <Link2 className="mr-1 h-3 w-3" />
            {blocker ? "Attach blocker" : "Attach"}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-red-600 hover:text-red-700"
            disabled={busy}
            onClick={onReject}
          >
            <XCircle className="mr-1 h-3 w-3" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Resolved card ───────────────────────────────────────────────────────────

function ResolvedCard({ item }: { item: UnmatchedSignal }) {
  const style = TYPE_STYLES[item.signal_type] ?? {
    label: item.signal_type,
    color: "bg-zinc-500/20 text-foreground/80",
  };
  const method = item.resolution_method ?? "";
  const isRejected = method === "rejected";

  return (
    <Card className="border-border opacity-70">
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className={`${style.color} text-[10px]`}>
              {style.label}
            </Badge>
            <span
              className={`text-xs ${isRejected ? "line-through text-muted-foreground/70" : "text-foreground/80"}`}
            >
              {item.summary}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[10px] text-muted-foreground/70">
            <span>
              {RESOLUTION_LABELS[method] || method || "Resolved"}
            </span>
            {item.resolved_initiative_title && (
              <span className="text-muted-foreground">
                → {item.resolved_initiative_title}
              </span>
            )}
            {item.resolved_at && (
              <span>{new Date(item.resolved_at).toLocaleDateString()}</span>
            )}
            {item.match_confidence && (
              <span className="text-muted-foreground/50">
                was: {item.match_method} ({item.match_confidence})
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Blocker confirmation dialog ─────────────────────────────────────────────

function BlockerConfirmDialog({
  open,
  item,
  initiativeTitle,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  item: UnmatchedSignal | null;
  initiativeTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" />
            Attach blocker to initiative?
          </DialogTitle>
          <DialogDescription>
            You are manually attaching a <strong>blocker signal</strong> to an
            initiative. This will appear in risk assessments and portfolio views.
            Please verify the evidence carefully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Target initiative */}
          <div className="rounded bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">Attaching to:</p>
            <p className="text-sm font-medium text-foreground">
              {initiativeTitle}
            </p>
          </div>

          {/* Signal summary */}
          <div className="rounded bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">Signal:</p>
            <p className="text-sm text-foreground">{item.summary}</p>
          </div>

          {/* Evidence — must be reviewed */}
          {item.evidence && (
            <div className="rounded border border-red-500/20 bg-red-50 px-3 py-2">
              <p className="text-xs font-medium text-red-300">Evidence:</p>
              <p className="text-sm text-red-200 italic">
                &ldquo;{item.evidence}&rdquo;
              </p>
            </div>
          )}

          {/* Match info */}
          <div className="rounded bg-muted px-3 py-2 text-xs text-muted-foreground">
            <p>
              Match method:{" "}
              <span className="text-foreground">
                {item.match_method || "none"}
              </span>{" "}
              ({item.match_confidence || "no confidence"})
            </p>
            {item.match_reasons.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-muted-foreground/70">
                {item.match_reasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            <ShieldAlert className="mr-1 h-4 w-4" />
            Confirm attach blocker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
