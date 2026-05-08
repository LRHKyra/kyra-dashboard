"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Search, FileText, Database, X, Pencil, Trash2, Save, AlertTriangle } from "lucide-react";
import { useMemoryFiles, useMemoryChunks, useMemorySearch } from "@/hooks/use-memory";
import { cn } from "@/lib/utils";
import type { MemoryFile } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fileName(p: string) {
  return p.split("/").pop() ?? p;
}

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function sourceLabel(source: string) {
  if (source === "memory") return "memory";
  if (source === "workspace") return "workspace";
  if (source === "sessions") return "sessions";
  return source;
}

function sourceBadgeClass(source: string) {
  if (source === "memory") return "border-blue-500/40 text-blue-400";
  if (source === "workspace") return "border-purple-500/40 text-purple-400";
  if (source === "sessions") return "border-amber-500/40 text-amber-400";
  return "border-zinc-500/40 text-zinc-400";
}

function groupBySource(files: MemoryFile[]): Record<string, MemoryFile[]> {
  const order = ["memory", "workspace", "sessions"];
  const groups: Record<string, MemoryFile[]> = {};
  for (const f of files) {
    const key = f.source ?? "other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }
  // Sort groups in defined order, then alphabetically within each group
  const sorted: Record<string, MemoryFile[]> = {};
  const keys = Object.keys(groups).sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  for (const k of keys) {
    sorted[k] = groups[k].sort((a, b) => fileName(a.path).localeCompare(fileName(b.path)));
  }
  return sorted;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

// ── File browser ─────────────────────────────────────────────────────────────

function FileBrowser({
  files,
  filter,
  selected,
  onSelect,
}: {
  files: MemoryFile[];
  filter: string;
  selected: string | undefined;
  onSelect: (path: string) => void;
}) {
  const filtered = useMemo(
    () =>
      filter.trim()
        ? files.filter((f) =>
            fileName(f.path).toLowerCase().includes(filter.toLowerCase())
          )
        : files,
    [files, filter]
  );

  const groups = useMemo(() => groupBySource(filtered), [filtered]);

  if (filtered.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-2 py-4">No files match.</p>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([source, groupFiles]) => (
        <div key={source}>
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 pb-1">
            {sourceLabel(source)} ({groupFiles.length})
          </p>
          <div className="space-y-0.5">
            {groupFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => onSelect(file.path)}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md transition-colors group",
                  selected === file.path
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3 w-3 shrink-0 opacity-60" />
                    <span className="text-xs font-medium truncate">{fileName(file.path)}</span>
                  </div>
                  {file.chunkCount ? (
                    <span className="text-[10px] text-muted-foreground shrink-0">{file.chunkCount}</span>
                  ) : null}
                </div>
                <p className="text-[10px] text-muted-foreground/60 pl-4.5 mt-0.5">
                  {fmtSize(file.size)}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chunk viewer ─────────────────────────────────────────────────────────────

function ChunkViewer({
  path,
  editing,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDeleteConfirm,
}: {
  path: string;
  editing: boolean;
  onEditStart: (content: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  const { data: chunks, isLoading } = useMemoryChunks(path);
  const [editContent, setEditContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleEditClick = useCallback(async () => {
    setLoadingContent(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/memory/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load file");
      setEditContent(data.content);
      onEditStart(data.content);
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setLoadingContent(false);
    }
  }, [path, onEditStart]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/memory/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: editContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onEditSave();
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  }, [path, editContent, onEditSave]);

  const handleDelete = useCallback(async () => {
    try {
      const res = await fetch(`/api/memory/file?path=${encodeURIComponent(path)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      onDeleteConfirm();
    } catch (err) {
      setSaveError(String(err));
      setConfirmingDelete(false);
    }
  }, [path, onDeleteConfirm]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
              <Save className="h-3 w-3 mr-1" />
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onEditCancel} disabled={saving} className="h-7 text-xs">
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditClick}
              disabled={loadingContent}
              className="h-7 text-xs"
            >
              <Pencil className="h-3 w-3 mr-1" />
              {loadingContent ? "Loading…" : "Edit"}
            </Button>
            {confirmingDelete ? (
              <>
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Delete this file?
                </span>
                <Button size="sm" variant="destructive" onClick={handleDelete} className="h-7 text-xs">
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)} className="h-7 text-xs">
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingDelete(true)}
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </>
        )}
        {saveError && (
          <span className="text-xs text-destructive ml-2">{saveError}</span>
        )}
      </div>

      {/* Edit mode: full-file textarea */}
      {editing ? (
        <Textarea
          value={editContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
          className="font-mono text-xs min-h-[480px] resize-y"
          spellCheck={false}
        />
      ) : (
        /* Read mode: chunks */
        chunks && chunks.length > 0 ? (
          chunks.map((chunk, i) => (
            <div key={chunk.id} className="rounded-lg border border-border bg-black/20">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
                <span className="text-[10px] text-muted-foreground/60 font-mono">
                  Chunk {i + 1} · L{chunk.startLine}–{chunk.endLine}
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  {chunk.text.length} chars
                </span>
              </div>
              <pre className="text-xs p-3 whitespace-pre-wrap font-mono leading-relaxed text-foreground/80">
                {chunk.text}
              </pre>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No indexed chunks for this file.</p>
        )
      )}
    </div>
  );
}

// ── Search results ────────────────────────────────────────────────────────────

function SearchResults({
  query,
  results,
  isLoading,
}: {
  query: string;
  results: Array<{ id: string; path: string; text: string; rank: number }> | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return <p className="text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;.</p>;
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <div key={result.id} className="rounded-lg border border-border bg-black/20">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50">
            <FileText className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground truncate flex-1">
              {fileName(result.path)}
            </span>
            <span className="text-[10px] text-muted-foreground/50 shrink-0 font-mono">
              {result.path.includes("/memory/") ? "memory" : result.path.includes("/clawd/") ? "workspace" : ""}
            </span>
          </div>
          <p className="text-xs p-3 whitespace-pre-wrap leading-relaxed text-foreground/80">
            {highlight(result.text.slice(0, 600), query)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const [filterText, setFilterText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  const { data: files, isLoading: filesLoading, mutate: refetchFiles } = useMemoryFiles();
  const { data: searchResults, isLoading: searchLoading } = useMemorySearch(activeSearch);

  const allFiles = files ?? [];
  const totalChunks = allFiles.reduce((sum, f) => sum + (f.chunkCount ?? 0), 0);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (q) {
      setActiveSearch(q);
      setSelectedFile(undefined);
      setEditing(false);
    }
  };

  const handleClearSearch = () => {
    setActiveSearch(null);
    setSearchQuery("");
  };

  const handleSelectFile = (path: string) => {
    setSelectedFile(path === selectedFile ? undefined : path);
    setActiveSearch(null);
    setSearchQuery("");
    setEditing(false);
  };

  const rightPanelTitle = activeSearch
    ? `Results for "${activeSearch}"`
    : selectedFile
    ? fileName(selectedFile)
    : "Content";

  return (
    <PageShell title="Memory" description="Vector memory database and workspace files">
      {/* Stats + search row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>{allFiles.length} files</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{totalChunks} chunks</span>
        </div>

        <div className="flex gap-2 ml-auto">
          <Input
            placeholder="Search memory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-64"
          />
          <Button onClick={handleSearch} variant="secondary" size="sm">
            <Search className="h-4 w-4" />
          </Button>
          {activeSearch && (
            <Button variant="ghost" size="sm" onClick={handleClearSearch}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-[220px_1fr] gap-4 min-h-[600px]">
        {/* Left: file browser */}
        <Card className="h-fit">
          <CardHeader className="pb-2 pt-3 px-3">
            <Input
              placeholder="Filter files..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-7 text-xs"
            />
          </CardHeader>
          <CardContent className="px-2 pb-3">
            {filesLoading ? (
              <div className="space-y-2 px-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <FileBrowser
                files={allFiles}
                filter={filterText}
                selected={selectedFile}
                onSelect={handleSelectFile}
              />
            )}
          </CardContent>
        </Card>

        {/* Right: content viewer */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <CardTitle className="text-base truncate flex-1">{rightPanelTitle}</CardTitle>
            {selectedFile && (
              <Badge variant="outline" className={sourceBadgeClass(
                allFiles.find((f) => f.path === selectedFile)?.source ?? ""
              )}>
                {sourceLabel(allFiles.find((f) => f.path === selectedFile)?.source ?? "")}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[560px] pr-2">
              {activeSearch ? (
                <SearchResults
                  query={activeSearch}
                  results={searchResults}
                  isLoading={searchLoading}
                />
              ) : selectedFile ? (
                <ChunkViewer
                  path={selectedFile}
                  editing={editing}
                  onEditStart={() => setEditing(true)}
                  onEditSave={() => { setEditing(false); refetchFiles?.(); }}
                  onEditCancel={() => setEditing(false)}
                  onDeleteConfirm={() => { setSelectedFile(undefined); setEditing(false); refetchFiles?.(); }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Select a file to view its indexed chunks,<br />or search to find content across all memory.
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
