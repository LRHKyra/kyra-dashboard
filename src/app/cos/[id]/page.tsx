"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, MessageSquare, Clock, Loader2 } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Assignment {
  id: string;
  project_id: string;
  raw_request: string;
  normalized_outcome: string | null;
  work_type: string | null;
  artifact_type: string | null;
  route_lane: string | null;
  current_state: string;
  urgency: string;
  risk_class: string;
  normalized_payload: string | null;
  router_output: string | null;
  created_at: string;
  updated_at: string;
}

interface EventEntry {
  id: string;
  event_type: string;
  event_payload: string;
  created_at: string;
}

interface AssignmentDetail {
  assignment: Assignment;
  events: EventEntry[];
}

const STATE_COLORS: Record<string, string> = {
  captured: "bg-zinc-500/20 text-zinc-300",
  normalizing: "bg-yellow-500/20 text-yellow-300",
  contexting: "bg-blue-500/20 text-blue-300",
  waiting_on_team: "bg-purple-500/20 text-purple-300",
  waiting_on_me: "bg-orange-500/20 text-orange-300",
  planning: "bg-cyan-500/20 text-cyan-300",
  researching: "bg-green-500/20 text-green-300",
  handoff_ready: "bg-emerald-500/20 text-emerald-300",
  running_external: "bg-blue-500/20 text-blue-300",
  review_ready: "bg-yellow-500/20 text-yellow-300",
  done: "bg-green-500/20 text-green-300",
  cancelled: "bg-red-500/20 text-red-300",
  stalled: "bg-red-500/20 text-red-300",
};

export default function CosAssignmentPage() {
  const params = useParams();
  const id = params.id as string;
  const [resuming, setResuming] = useState(false);
  const [clarText, setClarText] = useState("");
  const [clarifying, setClarifying] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<AssignmentDetail>(
    id ? `/api/cos/assignments?id=${id}` : null,
    async (url: string) => {
      // Use the SSH-based inspect endpoint
      const res = await fetch(`/api/cos/assignments`);
      const assignments = await res.json();
      // Find the matching assignment and get its events
      // For now, return just the assignment; events need a separate endpoint
      const assignment = Array.isArray(assignments) ? assignments.find((a: Assignment) => a.id === id) : null;
      return { assignment, events: [] };
    },
    { refreshInterval: 10_000 },
  );

  const a = data?.assignment;

  async function handleResume() {
    setResuming(true);
    try {
      await fetch(`/api/cos/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `__resume__:${id}` }),
      });
      mutate();
    } finally {
      setResuming(false);
    }
  }

  return (
    <PageShell title="Assignment Detail" description={a?.raw_request?.slice(0, 80) ?? "Loading..."}>
      <Link href="/cos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to queue
      </Link>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-4 text-red-400 text-sm">
            Failed to load assignment
          </CardContent>
        </Card>
      )}

      {a && (
        <div className="space-y-4">
          {/* Header card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-foreground">{a.raw_request}</p>

              {a.normalized_outcome && a.normalized_outcome !== a.raw_request && (
                <p className="text-xs text-muted-foreground italic">
                  Normalized: {a.normalized_outcome}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={STATE_COLORS[a.current_state] ?? ""}>
                  {a.current_state.replace(/_/g, " ")}
                </Badge>
                {a.work_type && <Badge variant="outline">{a.work_type}</Badge>}
                {a.route_lane && <Badge variant="outline">{a.route_lane}</Badge>}
                {a.urgency !== "normal" && (
                  <Badge variant="outline" className="border-red-500/50 text-red-400">{a.urgency}</Badge>
                )}
                {a.risk_class !== "normal" && (
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">{a.risk_class}</Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Created: {new Date(a.created_at + "Z").toLocaleString()}
                {" | "}
                ID: <code className="text-xs">{a.id.slice(0, 8)}</code>
              </div>
            </CardContent>
          </Card>

          {/* Router output */}
          {a.router_output && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Routing Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(JSON.parse(a.router_output), null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Normalized payload */}
          {a.normalized_payload && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Classification</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(JSON.parse(a.normalized_payload), null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {["waiting_on_me", "waiting_on_team", "contexting"].includes(a.current_state) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button size="sm" onClick={handleResume} disabled={resuming}>
                  {resuming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                  Resume pipeline
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PageShell>
  );
}
