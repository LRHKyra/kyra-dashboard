"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, Clock, Eye, Radio, ShieldAlert,
} from "lucide-react";
import {
  usePortfolioSummary,
  type PortfolioSummaryEntry,
} from "@/lib/pm-api";

// ── Style maps ──────────────────────────────────────────────────────────────

const RISK_CHIP: Record<string, string> = {
  red:    "bg-red-100 text-red-700",
  yellow: "bg-amber-100 text-amber-700",
  green:  "bg-emerald-100 text-emerald-700",
};

const FORECAST_COLOR: Record<string, string> = {
  likely_on_track: "text-emerald-600",
  at_risk:         "text-amber-600",
  likely_slip:     "text-red-600",
  unknown:         "text-muted-foreground",
};

const CARD_ACCENT: Record<string, string> = {
  red:    "from-red-500",
  yellow: "from-amber-400",
  green:  "from-emerald-500",
};

interface SectionDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  accentClass: string;
  countBg: string;
}

const SECTIONS: SectionDef[] = [
  { key: "at_risk",            label: "At Risk",            icon: <ShieldAlert className="h-3.5 w-3.5" />, accentClass: "text-red-600",      countBg: "bg-red-100 text-red-700" },
  { key: "needs_attention",    label: "Needs Attention",    icon: <AlertTriangle className="h-3.5 w-3.5" />, accentClass: "text-amber-600", countBg: "bg-amber-100 text-amber-700" },
  { key: "blockers",           label: "Blockers",           icon: <Radio className="h-3.5 w-3.5" />, accentClass: "text-red-600",            countBg: "bg-red-100 text-red-700" },
  { key: "changed_recently",   label: "Changed Recently",   icon: <Eye className="h-3.5 w-3.5" />, accentClass: "text-emerald-600",          countBg: "bg-emerald-100 text-emerald-700" },
  { key: "no_recent_evidence", label: "No Recent Evidence", icon: <Clock className="h-3.5 w-3.5" />, accentClass: "text-muted-foreground",   countBg: "bg-muted text-muted-foreground" },
];

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  onSelect: (id: string) => void;
}

export function PortfolioSummary({ onSelect }: Props) {
  const { data, isLoading, error } = usePortfolioSummary();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        Failed to load portfolio summary: {error.message}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const genDate = data.generated_at
    ? new Date(data.generated_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        {data.initiative_count} active initiatives — {genDate}
      </p>

      {SECTIONS.map((section) => {
        const entries = data.sections[section.key] ?? [];
        if (entries.length === 0) return null;
        return (
          <SummarySection
            key={section.key}
            section={section}
            entries={entries}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────

function SummarySection({
  section,
  entries,
  onSelect,
}: {
  section: SectionDef;
  entries: PortfolioSummaryEntry[];
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={section.accentClass}>{section.icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {section.label}
        </h3>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${section.countBg}`}>
          {entries.length}
        </span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
        {entries.map((entry) => (
          <EntryCard key={entry.initiative_id} entry={entry} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ── Entry card ──────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onSelect,
}: {
  entry: PortfolioSummaryEntry;
  onSelect: (id: string) => void;
}) {
  const riskChip = RISK_CHIP[entry.risk_level] ?? "bg-muted text-muted-foreground";
  const forecastColor = FORECAST_COLOR[entry.forecast_bucket] ?? "text-muted-foreground";
  const accent = CARD_ACCENT[entry.risk_level] ?? "from-zinc-400";

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.initiative_id)}
      className="relative w-full min-w-0 text-left rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-[#6045FF]/25 transition-all group"
    >
      {/* Top accent gradient */}
      <div className={`h-1 w-full bg-gradient-to-r ${accent} to-transparent`} />

      <div className="px-3.5 py-2.5 space-y-1.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-medium text-foreground leading-snug group-hover:text-[#6045FF] transition-colors line-clamp-2">
            {entry.title}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${riskChip}`}>
            {entry.risk_level}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-medium">{entry.owner}</span>
          <span className="opacity-40">·</span>
          <span>{entry.status.replace(/_/g, " ")}</span>
          <span className="opacity-40">·</span>
          <span className={forecastColor}>{entry.forecast_bucket.replace(/_/g, " ")}</span>
        </div>

        {/* Reason */}
        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{entry.reason}</p>

        {/* Evidence date + signal context */}
        {(entry.latest_evidence_at || entry.signal_context) && (
          <div className="text-[10px] text-muted-foreground/60">
            {entry.latest_evidence_at && (
              <span>Evidence: {new Date(entry.latest_evidence_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            )}
            {entry.signal_context && (
              <p className="italic mt-0.5">{entry.signal_context}</p>
            )}
          </div>
        )}

        {/* Signals */}
        {entry.supporting_signals.length > 0 && (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {entry.supporting_signals.slice(0, 2).map((sig) => (
              <Badge key={sig.signal_id} variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
                {sig.signal_type.replace("extracted_", "")}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
