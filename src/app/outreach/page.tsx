"use client";

import { useState, useEffect, useRef } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import {
  CheckCircle,
  XCircle,
  Clock,
  Minus,
  RefreshCw,
  ChevronRight,
  Eye,
  Trash2,
  PlusCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Run {
  run_id: string;
  created_at: string;
  allow_spend: boolean;
  status: string;
  campaign_name: string | null;
}

interface StepEntry {
  step: string;
  status: string;
  ts: string;
  message: string;
}

interface RunSummary {
  run_id: string;
  campaign_name: string | null;
  created_at: string | null;
  allow_spend: boolean;
  status: string;
  steps: StepEntry[];
  counts: {
    leads: number;
    researched: number;
    approved: number;
    sequences: number;
  };
  spend: Array<{ tool: string; total: number }>;
}

interface KeyMeta {
  isSet: boolean;
  updatedAt: string | null;
}

interface OutreachSettings {
  kyraOutreachRoot: string;
  dbPath: string;
  llmProvider: string;
  llmModel: string;
  keys: Record<string, KeyMeta>;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "completed"
      ? ("default" as const)
      : status === "running"
        ? ("secondary" as const)
        : status === "error"
          ? ("destructive" as const)
          : ("outline" as const);
  return <Badge variant={variant}>{status}</Badge>;
}

function StepIcon({ status }: { status: string }) {
  if (status === "success" || status === "completed")
    return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
  if (status === "error")
    return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  if (status === "skipped" || status === "dry_run")
    return <Minus className="h-4 w-4 text-muted-foreground shrink-0" />;
  return <Clock className="h-4 w-4 text-yellow-500 shrink-0" />;
}

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------

function KeyField({
  name,
  meta,
  onSave,
}: {
  name: string;
  meta: KeyMeta;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(value);
      setValue("");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <label className="font-mono text-sm font-medium">{name}</label>
          {meta.isSet ? (
            <Badge variant="secondary" className="text-xs">
              Set
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Not set
            </Badge>
          )}
          {meta.updatedAt && (
            <span className="text-xs text-muted-foreground">
              updated {new Date(meta.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {editing && (
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Paste ${name} here`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setValue("");
                setEditing(false);
              }
            }}
          />
        )}
      </div>
      {editing ? (
        <div className="flex gap-2 pt-0.5">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setValue("");
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="mt-0.5"
          onClick={() => setEditing(true)}
        >
          {meta.isSet ? "Update" : "Set"}
        </Button>
      )}
    </div>
  );
}

function SettingsPanel() {
  const {
    data,
    isLoading,
    mutate,
  } = useApi<OutreachSettings>("/api/outreach/settings");

  const [root, setRoot] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setRoot(data.kyraOutreachRoot);
      setDbPath(data.dbPath);
      setProvider(data.llmProvider);
      setModel(data.llmModel);
    }
  }, [data]);

  async function saveGeneral() {
    setSaving(true);
    try {
      await fetch("/api/outreach/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kyraOutreachRoot: root,
          dbPath,
          llmProvider: provider,
          llmModel: model,
        }),
      });
      await mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function saveKey(keyName: string, value: string) {
    await fetch("/api/outreach/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: { [keyName]: value || null } }),
    });
    await mutate();
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Kyra Outreach Root</label>
            <Input
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              placeholder="/Users/lucas/kyra-outreach"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              DB Path{" "}
              <span className="font-normal text-muted-foreground">
                (leave blank for default: data/state.db inside root)
              </span>
            </label>
            <Input
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
              placeholder="Absolute path or blank for default"
              className="font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">LLM Provider</label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="claude-sonnet-4-6"
              />
            </div>
          </div>
          <Button onClick={saveGeneral} disabled={saving} size="sm">
            {saving ? "Saving…" : saved ? "Saved!" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Keys</CardTitle>
          <p className="text-sm text-muted-foreground">
            Stored in{" "}
            <code className="font-mono text-xs">
              ~/.openclaw/kyra-outreach.env
            </code>{" "}
            (chmod 600). Values are never returned to the browser.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {data &&
            Object.entries(data.keys).map(([keyName, meta]) => (
              <KeyField
                key={keyName}
                name={keyName}
                meta={meta}
                onSave={(val) => saveKey(keyName, val)}
              />
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Runs list
// ---------------------------------------------------------------------------

function RunsList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data, isLoading, mutate } = useApi<Run[]>("/api/outreach/runs");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
          Runs
        </p>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => mutate()}
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No runs found.
          <br />
          <span className="text-xs">Check kyra-outreach root in Settings.</span>
        </p>
      )}

      {data &&
        data.map((run) => (
          <button
            key={run.run_id}
            onClick={() => onSelect(run.run_id)}
            className={[
              "w-full text-left rounded-md border p-3 text-sm transition-colors",
              selectedId === run.run_id
                ? "bg-accent border-accent-foreground/20"
                : "border-border hover:bg-accent/50",
            ].join(" ")}
          >
            <div className="flex items-center justify-between mb-1">
              <StatusBadge status={run.status} />
              <span className="text-xs text-muted-foreground">
                {run.allow_spend ? "live" : "dry-run"}
              </span>
            </div>
            <div className="font-medium truncate">
              {run.campaign_name ?? "Unnamed Campaign"}
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
              {run.run_id}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(run.created_at).toLocaleString()}
            </div>
          </button>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live events viewer
// ---------------------------------------------------------------------------

interface EventRecord {
  ts?: string;
  step?: string;
  event_type?: string;
  [key: string]: unknown;
}

function EventsViewer({
  runId,
}: {
  runId: string;
}) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEvents([]);
    const offsetRef = { current: 0 };
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/outreach/runs/${encodeURIComponent(runId)}/events?offset=${offsetRef.current}`
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          events: EventRecord[];
          nextOffset: number;
        };
        if (data.events?.length > 0) {
          setEvents((prev) => [...prev, ...data.events]);
          offsetRef.current = data.nextOffset;
          requestAnimationFrame(() =>
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
          );
        }
      } catch {
        /* network errors are non-fatal */
      }
    }

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [runId]);

  return (
    <div className="bg-muted/40 rounded-md p-3 font-mono text-xs h-64 overflow-y-auto space-y-0.5">
      {events.length === 0 && (
        <span className="text-muted-foreground">No events yet.</span>
      )}
      {events.map((ev, i) => (
        <div key={i} className="flex gap-2 items-baseline">
          <span className="text-muted-foreground shrink-0 w-[60px]">
            {String(ev.ts ?? "").slice(11, 19)}
          </span>
          {ev.step && (
            <span className="text-muted-foreground shrink-0">[{ev.step}]</span>
          )}
          <span className="break-all">{String(ev.event_type ?? "")}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Artifact viewer
// ---------------------------------------------------------------------------

function ArtifactViewer({ runId }: { runId: string }) {
  const [inputPath, setInputPath] = useState("research/research.jsonl");
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  const { data, isLoading } = useApi<{
    lines: unknown[];
    total: number;
    truncated: boolean;
  }>(
    loadedPath
      ? `/api/outreach/runs/${encodeURIComponent(runId)}/artifact?path=${encodeURIComponent(loadedPath)}`
      : null
  );

  const quickPaths = [
    "events.jsonl",
    "prospecting/leads_final.jsonl",
    "research/research.jsonl",
    "qc/emails_approved.jsonl",
    "copywriting/sequences.jsonl",
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          className="font-mono text-sm"
          placeholder="path/relative/to/run"
          onKeyDown={(e) => {
            if (e.key === "Enter") setLoadedPath(inputPath);
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLoadedPath(inputPath)}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          View
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quickPaths.map((p) => (
          <button
            key={p}
            onClick={() => {
              setInputPath(p);
              setLoadedPath(p);
            }}
            className="text-xs px-2 py-0.5 rounded border border-border font-mono hover:bg-accent/50 transition-colors"
          >
            {p.split("/").pop()}
          </button>
        ))}
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {data && (
        <div className="space-y-1">
          {data.truncated && (
            <p className="text-xs text-muted-foreground">
              Showing first 500 of {data.total} lines.
            </p>
          )}
          <div className="bg-muted/40 rounded-md p-3 font-mono text-xs h-64 overflow-auto">
            {data.lines.map((line, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap break-all border-b border-border/20 py-0.5"
              >
                {typeof line === "string" ? line : JSON.stringify(line)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Run detail
// ---------------------------------------------------------------------------

function RunDetail({ runId }: { runId: string }) {
  const { data, isLoading } = useApi<RunSummary>(
    `/api/outreach/runs/${encodeURIComponent(runId)}/summary`,
    { refreshInterval: 5000 }
  );

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  const countCards = [
    { label: "Leads", value: data.counts.leads },
    { label: "Researched", value: data.counts.researched },
    { label: "Approved", value: data.counts.approved },
    { label: "Sequences", value: data.counts.sequences },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-base">
            {data.campaign_name ?? "Unnamed Campaign"}
          </h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {runId}
          </p>
          {data.created_at && (
            <p className="text-xs text-muted-foreground">
              {new Date(data.created_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={data.status} />
          <Badge variant="outline">{data.allow_spend ? "live" : "dry-run"}</Badge>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-4 gap-3">
        {countCards.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-4">
          {/* Step timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Steps</CardTitle>
            </CardHeader>
            <CardContent>
              {data.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No step records yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {data.steps.map((s) => (
                    <div
                      key={s.step}
                      className="flex items-center gap-3 py-1 text-sm"
                    >
                      <StepIcon status={s.status} />
                      <span className="font-mono w-28 shrink-0 text-xs">
                        {s.step}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {s.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spend */}
          {data.spend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tool</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.spend.map((s) => (
                      <TableRow key={s.tool}>
                        <TableCell className="font-mono text-sm">
                          {s.tool}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                Live Log
                {data.status === "running" && (
                  <span className="text-xs text-green-500 animate-pulse">
                    ● Live
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EventsViewer runId={runId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artifacts" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Artifact Viewer</CardTitle>
            </CardHeader>
            <CardContent>
              <ArtifactViewer runId={runId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Templates panel
// ---------------------------------------------------------------------------

interface Step1Variant {
  persona: string;
  sender: string;
  body: string;
}

interface Step23Variant {
  sender: string;
  body: string;
}

interface Step1Data {
  step_number: 1;
  note?: string;
  subject_pool: string[];
  variants: Step1Variant[];
}

interface Step23Data {
  step_number: number;
  subject: string;
  note?: string;
  variants: Step23Variant[];
}

type StepData = Step1Data | Step23Data;

interface TemplatesData {
  copywriterPrompt: string;
  steps: StepData[];
}

function BodyPreview({ body }: { body: string }) {
  return (
    <div className="bg-muted/40 rounded-md p-3 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-border/30">
      {body}
    </div>
  );
}

const PERSONA_LABELS: Record<string, string> = {
  owner: "Owner",
  producer: "Producer",
  admin: "Admin / Ops",
  practice_leader: "Practice Leader",
};

function Step1Card({ step }: { step: Step1Data }) {
  const personas = [...new Set(step.variants.map((v) => v.persona))];
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            Step 1
          </Badge>
          <Badge variant="secondary" className="text-xs">
            LLM opener
          </Badge>
        </div>
        {step.note && (
          <p className="text-xs text-muted-foreground mt-1">{step.note}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Subject Pool
          </p>
          <div className="flex flex-wrap gap-1.5">
            {step.subject_pool.map((s) => (
              <code
                key={s}
                className="text-xs px-2 py-0.5 rounded bg-muted border border-border"
              >
                {s}
              </code>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Rotated deterministically per lead via email hash.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Body Variants
          </p>
          <Tabs defaultValue={personas[0]}>
            <TabsList>
              {personas.map((p) => (
                <TabsTrigger key={p} value={p}>{PERSONA_LABELS[p] ?? p}</TabsTrigger>
              ))}
            </TabsList>
            {personas.map((persona) => {
              const lucasV = step.variants.find(
                (v) => v.persona === persona && v.sender === "lucas"
              );
              const kylieV = step.variants.find(
                (v) => v.persona === persona && v.sender === "kylie"
              );
              return (
                <TabsContent key={persona} value={persona} className="mt-3">
                  <Tabs defaultValue="lucas">
                    <TabsList className="w-fit">
                      <TabsTrigger value="lucas">Lucas</TabsTrigger>
                      <TabsTrigger value="kylie">Kylie</TabsTrigger>
                    </TabsList>
                    <TabsContent value="lucas" className="mt-2">
                      {lucasV ? (
                        <BodyPreview body={lucasV.body} />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No variant.
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="kylie" className="mt-2">
                      {kylieV ? (
                        <BodyPreview body={kylieV.body} />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No variant.
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

function Step23Card({ step }: { step: Step23Data }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            Step {step.step_number}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Fully templated
          </Badge>
        </div>
        {step.note && (
          <p className="text-xs text-muted-foreground mt-1">{step.note}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Subject
          </p>
          <code className="text-xs px-2 py-1 rounded bg-muted border border-border block w-fit">
            {step.subject}
          </code>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Body
          </p>
          <Tabs defaultValue={step.variants[0]?.sender ?? "lucas"}>
            <TabsList className="w-fit">
              {step.variants.map((v) => (
                <TabsTrigger key={v.sender} value={v.sender}>
                  {v.sender === "lucas" ? "Lucas" : "Kylie"}
                </TabsTrigger>
              ))}
            </TabsList>
            {step.variants.map((v) => (
              <TabsContent key={v.sender} value={v.sender} className="mt-2">
                <BodyPreview body={v.body} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatesPanel() {
  const { data, isLoading, mutate } = useApi<TemplatesData>(
    "/api/outreach/templates"
  );
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setPrompt(data.copywriterPrompt);
    }
  }, [data]);

  async function savePrompt() {
    setSaving(true);
    try {
      await fetch("/api/outreach/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copywriterPrompt: prompt }),
      });
      await mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      {/* Copywriter prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Copywriter Prompt</CardTitle>
          <p className="text-sm text-muted-foreground">
            System prompt used by the LLM to generate the personalised{" "}
            <code className="font-mono text-xs">opener</code> slot for Step 1.
            The user message supplies{" "}
            <code className="font-mono text-xs">sender_identity</code>,{" "}
            <code className="font-mono text-xs">broker_persona</code>,{" "}
            <code className="font-mono text-xs">ICP_definition</code>,{" "}
            <code className="font-mono text-xs">max_words</code>, and{" "}
            <code className="font-mono text-xs">proof_insertion</code> per lead.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="font-mono text-xs min-h-48 resize-y"
          />
          <div className="flex items-center gap-3">
            <Button onClick={savePrompt} disabled={saving} size="sm">
              {saving ? "Saving…" : saved ? "Saved!" : "Save Prompt"}
            </Button>
            {saved && (
              <p className="text-sm text-muted-foreground">
                Saved — takes effect on the next pipeline run.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step templates — read-only reference view */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Email Step Templates</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            3-step sequence. Step 1 embeds the LLM-generated{" "}
            <code className="font-mono text-xs">[OPENER]</code> slot; Steps
            2–3 are fully baked. Smartlead merge variables:{" "}
            <code className="font-mono text-xs">{"{{first_name}}"}</code>{" "}
            <code className="font-mono text-xs">{"{{company_name}}"}</code>{" "}
            <code className="font-mono text-xs">{"{{ICP_definition}}"}</code>{" "}
            <code className="font-mono text-xs">{"%signature%"}</code>. Source
            of truth:{" "}
            <code className="font-mono text-xs">
              src/kyra_outreach/copywriting/templates.py
            </code>
            .
          </p>
        </div>

        {data?.steps.map((step) =>
          step.step_number === 1 ? (
            <Step1Card key={1} step={step as Step1Data} />
          ) : (
            <Step23Card key={step.step_number} step={step as Step23Data} />
          )
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suppression panel
// ---------------------------------------------------------------------------

interface SuppressionEntry {
  email: string;
  name: string;
  reason: string;
  ts: string;
}

const REASON_LABELS: Record<string, string> = {
  existing_advisor: "Existing Advisor",
  investor: "Investor",
  client: "Client",
  partner: "Partner",
  do_not_contact: "Do Not Contact",
};

function SuppressionPanel() {
  const { data, isLoading, mutate } = useApi<SuppressionEntry[]>(
    "/api/outreach/suppression"
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  async function handleAdd() {
    if (!email || !reason) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach/suppression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason, name }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "Failed to add entry");
      } else {
        setEmail("");
        setName("");
        setReason("");
        await mutate();
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(targetEmail: string) {
    setDeletingEmail(targetEmail);
    try {
      await fetch("/api/outreach/suppression", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      await mutate();
    } finally {
      setDeletingEmail(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add to Suppression List</CardTitle>
          <p className="text-sm text-muted-foreground">
            Suppressed contacts are filtered out during prospecting before any
            emails are sent or credits spent.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="wendy.smith@mercer.com"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Wendy Smith"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason <span className="text-red-500">*</span></label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button
            onClick={handleAdd}
            disabled={adding || !email || !reason}
            size="sm"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            {adding ? "Adding…" : "Add Entry"}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Suppressed Contacts
              {data && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({data.length})
                </span>
              )}
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => mutate()}
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-32 w-full" />}
          {data && data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No suppressed contacts yet.
            </p>
          )}
          {data && data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry) => (
                  <TableRow key={entry.email}>
                    <TableCell className="font-medium">
                      {entry.name || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{entry.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {REASON_LABELS[entry.reason] ?? entry.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(entry.ts).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        disabled={deletingEmail === entry.email}
                        onClick={() => handleDelete(entry.email)}
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OutreachPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  return (
    <PageShell
      title="Outreach"
      description="Monitor kyra-outreach pipeline runs and manage settings"
    >
      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="suppression">Suppression</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4">
          <div className="grid grid-cols-[280px_1fr] gap-4 items-start">
            <RunsList
              selectedId={selectedRunId}
              onSelect={setSelectedRunId}
            />

            <div>
              {selectedRunId ? (
                <RunDetail runId={selectedRunId} />
              ) : (
                <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border">
                  <div className="text-center text-muted-foreground">
                    <ChevronRight className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Select a run to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="max-w-3xl">
            <TemplatesPanel />
          </div>
        </TabsContent>

        <TabsContent value="suppression" className="mt-4">
          <SuppressionPanel />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="max-w-2xl">
            <SettingsPanel />
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
