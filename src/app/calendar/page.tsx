"use client";

import { Fragment, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, CheckCircle, XCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { CronJob } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const HOUR_START = 7;
const HOUR_END = 22;
const DISPLAY_HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START);

// ── Cron helpers ─────────────────────────────────────────────────────────────

function parseCronField(field: string, min: number, max: number): number[] {
  if (field === "*") return Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const result = new Set<number>();
  for (const part of field.split(",")) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let i = start; i <= end; i++) result.add(i);
    } else {
      result.add(Number(part));
    }
  }
  return [...result].sort((a, b) => a - b);
}

/**
 * Convert a wall-clock datetime in `tz` to a UTC millisecond timestamp.
 * Uses the Intl trick: format the approx UTC time in the target TZ to find
 * the actual offset, then shift accordingly.
 */
function wallClockToUTC(
  year: number,
  month0: number,
  day: number,
  hour: number,
  minute: number,
  tz: string
): number {
  const approx = Date.UTC(year, month0, day, hour, minute, 0);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(approx))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, parseInt(p.value)])
  );
  let h = parts.hour;
  if (h === 24) h = 0;
  const tzApparent = Date.UTC(parts.year, parts.month - 1, parts.day, h, parts.minute, 0);
  return Date.UTC(year, month0, day, hour, minute, 0) + (approx - tzApparent);
}

/**
 * Get the calendar date (year/month0/day/dow) as seen in `tz` for a given UTC timestamp.
 * Uses midday of the day to avoid DST boundary edge cases.
 */
function getDateInTz(utcMs: number, tz: string): { year: number; month0: number; day: number; dow: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(utcMs))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, parseInt(p.value)])
  );
  const dow = new Date(parts.year, parts.month - 1, parts.day).getDay();
  return { year: parts.year, month0: parts.month - 1, day: parts.day, dow };
}

/**
 * Compute all UTC timestamps at which a cron-kind job fires within [weekStartMs, weekEndMs).
 * Iterates candidate days spanning slightly beyond the window to handle TZ boundary cases.
 */
function getCronRunsInWeek(
  expr: string,
  tz: string,
  weekStartMs: number,
  weekEndMs: number
): number[] {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return [];
  const [minField, hourField, , , dowField] = fields;

  const minutes = parseCronField(minField, 0, 59);
  const hours = parseCronField(hourField, 0, 23);
  const dows = new Set(parseCronField(dowField, 0, 6));

  const runs: number[] = [];

  // Check one extra day on each side to handle timezone wraparound
  for (let dayOffset = -1; dayOffset <= 7; dayOffset++) {
    // Use midday to safely determine the calendar date in the cron TZ
    const midday = weekStartMs + dayOffset * 86400000 + 12 * 3600000;
    const { year, month0, day, dow } = getDateInTz(midday, tz);

    if (!dows.has(dow)) continue;

    for (const hour of hours) {
      for (const minute of minutes) {
        const utcTs = wallClockToUTC(year, month0, day, hour, minute, tz);
        if (utcTs >= weekStartMs && utcTs < weekEndMs) {
          runs.push(utcTs);
        }
      }
    }
  }

  return runs;
}

/**
 * Compute all UTC run timestamps for a job within [weekStartMs, weekEndMs).
 * Handles both "every" (interval) and "cron" (expression) kinds.
 */
function getJobRunsInWeek(job: CronJob, weekStartMs: number, weekEndMs: number): number[] {
  if (!job.enabled) return [];

  if (job.schedule.kind === "cron" && job.schedule.expr) {
    return getCronRunsInWeek(
      job.schedule.expr,
      job.schedule.tz ?? "UTC",
      weekStartMs,
      weekEndMs
    );
  }

  if (job.schedule.kind === "every" && job.schedule.everyMs) {
    const interval = job.schedule.everyMs;
    const base = job.state?.nextRunAtMs ?? job.state?.lastRunAtMs ?? Date.now();
    let t = base;
    if (t < weekStartMs) {
      const steps = Math.ceil((weekStartMs - t) / interval);
      t = t + steps * interval;
    }
    const runs: number[] = [];
    let count = 0;
    while (t < weekEndMs && count < 1000) {
      count++;
      runs.push(t);
      t += interval;
    }
    return runs;
  }

  return [];
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startStr = `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()}`;
  const endStr =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
      : `${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  return `${startStr} – ${endStr}`;
}

function getNextRuns(job: CronJob, count = 3): number[] {
  const now = Date.now();
  const lookahead = 14 * 86400000; // look 2 weeks ahead
  const runs = getJobRunsInWeek(
    { ...job, enabled: true },
    now,
    now + lookahead
  );
  return runs.filter((t) => t > now).slice(0, count);
}

// ── Components ────────────────────────────────────────────────────────────────

function CronJobCard({ job }: { job: CronJob }) {
  const nextRuns = getNextRuns(job, 3);
  const lastOk = job.state?.lastStatus === "ok";

  return (
    <Card className={`border ${job.enabled ? "border-green-500/20" : "border-zinc-700/40"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className={`h-4 w-4 ${job.enabled ? "text-green-400" : "text-zinc-500"}`} />
              {job.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{job.agentId}</p>
          </div>
          <div className="flex gap-1.5 items-center shrink-0">
            {job.state?.lastStatus && (
              lastOk ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400" />
              )
            )}
            <Badge variant={job.enabled ? "default" : "secondary"} className="text-[10px]">
              {job.enabled ? "active" : "disabled"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {job.schedule.everyMs && (
            <div>
              <p className="text-muted-foreground">Interval</p>
              <p className="font-medium">Every {formatDuration(job.schedule.everyMs)}</p>
            </div>
          )}
          {job.schedule.expr && (
            <div>
              <p className="text-muted-foreground">Schedule</p>
              <p className="font-medium font-mono">{job.schedule.expr}</p>
            </div>
          )}
          {job.state?.lastRunAtMs && (
            <div>
              <p className="text-muted-foreground">Last run</p>
              <p className="font-medium">
                {formatDate(job.state.lastRunAtMs)} {formatTime(job.state.lastRunAtMs)}
              </p>
            </div>
          )}
          {job.state?.lastDurationMs && (
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">{formatDuration(job.state.lastDurationMs)}</p>
            </div>
          )}
          {job.state?.lastStatus && (
            <div>
              <p className="text-muted-foreground">Last status</p>
              <p className={`font-medium ${lastOk ? "text-green-400" : "text-red-400"}`}>
                {job.state.lastStatus}
              </p>
            </div>
          )}
        </div>

        {nextRuns.length > 0 && job.enabled && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Upcoming runs</p>
            <div className="space-y-0.5">
              {nextRuns.map((ts, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{formatDate(ts)}</span>
                  <span className="font-medium">{formatTime(ts)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {job.payload?.message && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Payload</p>
            <p className="text-xs font-mono bg-black/30 rounded px-2 py-1 line-clamp-2">
              {job.payload.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeekGrid({ jobs, weekStart }: { jobs: CronJob[]; weekStart: Date }) {
  const weekStartMs = weekStart.getTime();
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Build slot map: "localDayOfWeek-localHour" → deduplicated CronJob[]
  const slots = useMemo(() => {
    const map = new Map<string, CronJob[]>();

    for (const job of jobs) {
      const runs = getJobRunsInWeek(job, weekStartMs, weekEndMs);
      for (const ts of runs) {
        const d = new Date(ts);
        const key = `${d.getDay()}-${d.getHours()}`;
        if (!map.has(key)) map.set(key, []);
        const existing = map.get(key)!;
        if (!existing.find((j) => j.id === job.id)) {
          existing.push(job);
        }
      }
    }
    return map;
  }, [jobs, weekStartMs, weekEndMs]);

  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[600px]" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
        {/* Header row */}
        <div className="bg-card border-b border-border" />
        {days.map((day, i) => {
          const isToday = day.toDateString() === today.toDateString();
          return (
            <div
              key={i}
              className={`bg-card border-b border-border text-center py-2 ${isToday ? "bg-blue-500/5" : ""}`}
            >
              <div className="text-xs text-muted-foreground">{DAYS[day.getDay()]}</div>
              <div className={`text-sm font-semibold ${isToday ? "text-blue-400" : "text-foreground"}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}

        {/* Hour rows */}
        {DISPLAY_HOURS.map((hour) => (
          <Fragment key={hour}>
            <div className="text-right pr-2 pt-1 text-[10px] text-muted-foreground border-t border-border/40 leading-none">
              {formatHour(hour)}
            </div>
            {days.map((day, dayIdx) => {
              const key = `${day.getDay()}-${hour}`;
              const jobsInSlot = slots.get(key) ?? [];
              const isToday = day.toDateString() === today.toDateString();
              const isCurrentHour = isToday && today.getHours() === hour;

              return (
                <div
                  key={`${dayIdx}-${hour}`}
                  className={`border-t border-border/40 min-h-[36px] p-0.5 ${
                    isToday ? "bg-blue-500/5" : "bg-card"
                  } ${isCurrentHour ? "ring-1 ring-inset ring-blue-500/40" : ""}`}
                >
                  {jobsInSlot.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      className="text-[9px] bg-green-500/15 text-green-400 rounded px-1 py-0.5 truncate mb-0.5"
                      title={job.name}
                    >
                      {job.name}
                    </div>
                  ))}
                  {jobsInSlot.length > 3 && (
                    <div className="text-[9px] text-muted-foreground pl-1">+{jobsInSlot.length - 3}</div>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { data: cronJobs, isLoading } = useApi<CronJob[]>("/api/cron");

  const now = new Date();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);

  const active = (cronJobs ?? []).filter((j) => j.enabled);
  const inactive = (cronJobs ?? []).filter((j) => !j.enabled);

  return (
    <PageShell title="Calendar" description="Scheduled tasks and cron jobs">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Jobs", value: cronJobs?.length ?? 0 },
          { label: "Active", value: active.length },
          { label: "Disabled", value: inactive.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-7 w-12" /> : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Week calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{formatWeekRange(weekStart)}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((o) => o - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setWeekOffset(0)}
              >
                Today
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((o) => o + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <WeekGrid jobs={cronJobs ?? []} weekStart={weekStart} />
          )}
        </CardContent>
      </Card>

      {/* Job cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (cronJobs?.length ?? 0) > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {cronJobs!.map((job) => <CronJobCard key={job.id} job={job} />)}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Timer className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No cron jobs configured yet.</p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
