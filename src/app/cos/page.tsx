"use client";

import { useState } from "react";
import useSWR from "swr";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronRight, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LANE_COLORS: Record<string, string> = {
  cowork: "border-purple-500/50 text-purple-400",
  claude_code: "border-blue-500/50 text-blue-400",
  chatgpt_pro: "border-green-500/50 text-green-400",
  openclaw: "border-zinc-500/50 text-zinc-400",
  anthropic_api: "border-orange-500/50 text-orange-400",
};

const WORK_TYPE_COLORS: Record<string, string> = {
  deck: "bg-purple-500/20 text-purple-300",
  code: "bg-blue-500/20 text-blue-300",
  research: "bg-green-500/20 text-green-300",
  document: "bg-yellow-500/20 text-yellow-300",
  spreadsheet: "bg-orange-500/20 text-orange-300",
  coordination: "bg-zinc-500/20 text-zinc-300",
};

const STATE_ICONS: Record<string, React.ReactNode> = {
  normalizing: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  contexting: <Clock className="w-3.5 h-3.5 text-blue-400" />,
  waiting_on_me: <AlertCircle className="w-3.5 h-3.5 text-orange-400" />,
  waiting_on_team: <Clock className="w-3.5 h-3.5 text-purple-400" />,
  handoff_ready: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  running_external: <Clock className="w-3.5 h-3.5 text-blue-400" />,
  review_ready: <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
};

interface Assignment {
  id: string;
  raw_request: string;
  normalized_outcome: string | null;
  work_type: string | null;
  route_lane: string | null;
  current_state: string;
  urgency: string;
  risk_class: string;
  created_at: string;
}

function AssignmentCard({ a }: { a: Assignment }) {
  const title = a.normalized_outcome ?? a.raw_request;
  const truncated = title.length > 100 ? title.slice(0, 97) + "..." : title;
  const timeAgo = getTimeAgo(a.created_at);

  return (
    <Link href={`/cos/${a.id}`}>
      <div className="bg-card border border-border rounded-lg p-3 space-y-2 hover:border-border/80 cursor-pointer group transition-colors">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-foreground leading-snug">{truncated}</p>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {a.work_type && (
            <Badge variant="outline" className={`text-xs ${WORK_TYPE_COLORS[a.work_type] ?? ""}`}>
              {a.work_type}
            </Badge>
          )}
          {a.route_lane && (
            <Badge variant="outline" className={`text-xs ${LANE_COLORS[a.route_lane] ?? ""}`}>
              {a.route_lane}
            </Badge>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {STATE_ICONS[a.current_state]}
            {a.current_state.replace(/_/g, " ")}
          </span>
          {a.urgency !== "normal" && (
            <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">
              {a.urgency}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + "Z").getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CosQueuePage() {
  const { data: assignments, error, isLoading } = useSWR<Assignment[]>(
    "/api/cos/assignments",
    fetcher,
    { refreshInterval: 15_000 },
  );

  const active = assignments?.filter((a) => !["done", "cancelled"].includes(a.current_state)) ?? [];
  const needsMe = active.filter((a) => ["waiting_on_me", "review_ready"].includes(a.current_state));
  const inProgress = active.filter((a) => !["waiting_on_me", "review_ready", "done", "cancelled"].includes(a.current_state));
  const completed = assignments?.filter((a) => a.current_state === "done") ?? [];

  return (
    <PageShell title="Chief of Staff" description="Assignment tracker and routing dashboard">
      <div className="flex justify-end mb-4">
        <Link href="/cos/new">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Assignment
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-4 text-red-400 text-sm">
            Failed to load assignments: {error.message ?? "Connection error"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          {needsMe.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-orange-400 mb-2">
                Needs you ({needsMe.length})
              </h2>
              <div className="space-y-2">
                {needsMe.map((a) => <AssignmentCard key={a.id} a={a} />)}
              </div>
            </div>
          )}

          {inProgress.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-blue-400 mb-2">
                In progress ({inProgress.length})
              </h2>
              <div className="space-y-2">
                {inProgress.map((a) => <AssignmentCard key={a.id} a={a} />)}
              </div>
            </div>
          )}

          {active.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No active assignments. Click "New Assignment" to create one.
              </CardContent>
            </Card>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-green-400 mb-2">
                Completed ({completed.length})
              </h2>
              <div className="space-y-2">
                {completed.slice(0, 5).map((a) => <AssignmentCard key={a.id} a={a} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
