"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import {
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type {
  PlaybookStatus,
  PlaybookCandidate,
  PlaybookDigest,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// KPI Strip
// ---------------------------------------------------------------------------

function KpiStrip({ status }: { status: PlaybookStatus }) {
  const totalSearches = status.recentSearches.reduce(
    (sum, s) => sum + s.results_count,
    0
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <KpiCard
        label="Queued"
        value={status.queued}
        icon={<Clock className="h-4 w-4 text-yellow-500" />}
      />
      <KpiCard
        label="Approved"
        value={status.approved}
        icon={<CheckCircle className="h-4 w-4 text-green-500" />}
      />
      <KpiCard
        label="Rejected"
        value={status.rejected}
        icon={<XCircle className="h-4 w-4 text-red-400" />}
      />
      <KpiCard
        label="Total Runs"
        value={status.recentRuns.length}
        icon={<TrendingUp className="h-4 w-4 text-blue-400" />}
      />
      <KpiCard
        label="Searches"
        value={totalSearches}
        icon={<Search className="h-4 w-4 text-purple-400" />}
      />
      <KpiCard
        label="Last Run"
        value={
          status.lastRun
            ? new Date(status.lastRun.timestamp).toLocaleDateString()
            : "Never"
        }
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        isText
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  isText,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isText?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p
          className={
            isText
              ? "text-sm font-medium text-foreground"
              : "text-2xl font-bold text-foreground"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Candidates Table
// ---------------------------------------------------------------------------

function scopeBadgeVariant(
  scope: string
): "default" | "secondary" | "outline" | "destructive" {
  if (scope.includes("global")) return "default";
  if (scope.includes("reject")) return "destructive";
  if (scope.includes("OpenClaw") || scope.includes("Claude Code"))
    return "secondary";
  return "outline";
}

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  if (status.includes("promoted")) return "default";
  if (status.includes("approved")) return "secondary";
  if (status.includes("rejected")) return "destructive";
  return "outline";
}

function CandidatesTable({
  candidates,
  emptyMessage,
}: {
  candidates: PlaybookCandidate[];
  emptyMessage: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[140px]">ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="w-[120px]">Scope</TableHead>
          <TableHead className="w-[80px] text-right">Score</TableHead>
          <TableHead className="w-[150px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((c) => (
          <>
            <TableRow
              key={c.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <TableCell className="font-mono text-xs">{c.id}</TableCell>
              <TableCell className="font-medium">{c.title}</TableCell>
              <TableCell>
                <Badge variant={scopeBadgeVariant(c.scope)} className="text-xs">
                  {c.scope}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {c.averageScore !== null ? c.averageScore.toFixed(1) : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={statusBadgeVariant(c.status)}
                  className="text-xs"
                >
                  {c.status}
                </Badge>
              </TableCell>
            </TableRow>
            {expanded === c.id && (
              <TableRow key={`${c.id}-detail`}>
                <TableCell colSpan={5} className="bg-muted/30 p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Claim
                      </p>
                      <p className="text-sm">{c.claim}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Summary
                      </p>
                      <p className="text-sm">{c.summary}</p>
                    </div>
                    {c.sources.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Sources (Tier {c.sourceTier})
                        </p>
                        <ul className="text-xs space-y-0.5">
                          {c.sources.map((s, i) => (
                            <li key={i} className="text-blue-400 truncate">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Object.keys(c.scores).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Scores
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-1">
                          {Object.entries(c.scores).map(([dim, val]) => (
                            <div
                              key={dim}
                              className="flex justify-between text-xs bg-background rounded px-2 py-1"
                            >
                              <span className="text-muted-foreground truncate mr-2">
                                {dim.replace(/_/g, " ")}
                              </span>
                              <span className="font-mono font-medium">
                                {val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Digest Viewer
// ---------------------------------------------------------------------------

function DigestViewer({ digests }: { digests: PlaybookDigest[] }) {
  const [selected, setSelected] = useState<string | null>(
    digests[0]?.date ?? null
  );

  const active = digests.find((d) => d.date === selected);

  if (digests.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No digests yet. First nightly run will generate one.
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="w-40 shrink-0 space-y-1">
        {digests.map((d) => (
          <button
            key={d.date}
            onClick={() => setSelected(d.date)}
            className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
              selected === d.date
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {d.date}
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        {active ? (
          <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 rounded-md p-4 max-h-[500px] overflow-y-auto">
            {active.content}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">Select a digest</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search Log
// ---------------------------------------------------------------------------

function SearchLog({
  searches,
}: {
  searches: PlaybookStatus["recentSearches"];
}) {
  if (searches.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No search activity yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[160px]">Time</TableHead>
          <TableHead>Query</TableHead>
          <TableHead className="w-[80px] text-right">Results</TableHead>
          <TableHead className="w-[80px] text-right">Approved</TableHead>
          <TableHead className="w-[80px] text-right">Drafted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {searches.map((s, i) => (
          <TableRow key={i}>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(s.timestamp).toLocaleString()}
            </TableCell>
            <TableCell className="font-mono text-xs truncate max-w-[300px]">
              {s.query}
            </TableCell>
            <TableCell className="text-right font-mono text-xs">
              {s.results_count}
            </TableCell>
            <TableCell className="text-right font-mono text-xs">
              {s.approved_domain_hits}
            </TableCell>
            <TableCell className="text-right font-mono text-xs">
              {s.candidates_drafted}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface CandidatesData {
  queued: PlaybookCandidate[];
  approved: PlaybookCandidate[];
  rejected: PlaybookCandidate[];
}

interface DigestsData {
  nightly: PlaybookDigest[];
  weekly: PlaybookDigest[];
}

export default function PlaybookPage() {
  const { data: status, isLoading: statusLoading } =
    useApi<PlaybookStatus>("/api/playbook", {
      refreshInterval: 60_000,
    });

  const { data: candidates, isLoading: candidatesLoading } =
    useApi<CandidatesData>("/api/playbook/candidates", {
      refreshInterval: 60_000,
    });

  const { data: digests, isLoading: digestsLoading } =
    useApi<DigestsData>("/api/playbook/digests", {
      refreshInterval: 60_000,
    });

  return (
    <PageShell
      title="AI Playbook"
      description="Cross-tool workflow research and improvement pipeline"
    >
      {/* KPI Strip */}
      {statusLoading || !status ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        <KpiStrip status={status} />
      )}

      {/* Main Content */}
      <Tabs defaultValue="candidates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="digests">Digests</TabsTrigger>
          <TabsTrigger value="searches">Search Log</TabsTrigger>
        </TabsList>

        {/* Candidates Tab */}
        <TabsContent value="candidates" className="space-y-4">
          {candidatesLoading || !candidates ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Queued ({candidates.queued.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CandidatesTable
                    candidates={candidates.queued}
                    emptyMessage="No candidates in queue"
                  />
                </CardContent>
              </Card>

              {candidates.approved.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Approved ({candidates.approved.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CandidatesTable
                      candidates={candidates.approved}
                      emptyMessage="No approved candidates"
                    />
                  </CardContent>
                </Card>
              )}

              {candidates.rejected.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      Rejected ({candidates.rejected.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CandidatesTable
                      candidates={candidates.rejected}
                      emptyMessage="No rejected candidates"
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Digests Tab */}
        <TabsContent value="digests" className="space-y-4">
          {digestsLoading || !digests ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Nightly Digests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DigestViewer digests={digests.nightly} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Weekly Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DigestViewer digests={digests.weekly} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Search Log Tab */}
        <TabsContent value="searches">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4 text-purple-400" />
                Recent Brave Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusLoading || !status ? (
                <Skeleton className="h-48 rounded-lg" />
              ) : (
                <SearchLog searches={status.recentSearches} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
