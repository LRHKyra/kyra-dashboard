"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ExternalLink, AlertCircle, Calendar, ChevronRight } from "lucide-react";
import type { NotionTask, TaskStatus, TaskPriority, TaskCategory } from "@/lib/notion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Constants ──────────────────────────────────────────────────────────────

const STATUSES: { key: TaskStatus; label: string; color: string; border: string }[] = [
  { key: "Backlog",     label: "Backlog",     color: "text-zinc-400",   border: "border-zinc-600/50" },
  { key: "Todo",        label: "Todo",        color: "text-blue-400",   border: "border-blue-500/40" },
  { key: "In Progress", label: "In Progress", color: "text-yellow-400", border: "border-yellow-500/40" },
  { key: "Blocked",     label: "Blocked",     color: "text-red-400",    border: "border-red-500/40" },
  { key: "Done",        label: "Done",        color: "text-green-400",  border: "border-green-500/40" },
];

const PRIORITY_STYLES: Record<string, string> = {
  P0: "border-red-500/50 text-red-400",
  P1: "border-orange-500/50 text-orange-400",
  P2: "border-yellow-500/50 text-yellow-400",
  P3: "border-zinc-500/50 text-zinc-400",
};

const CATEGORIES: TaskCategory[] = ["Product", "GTM", "Fundraising", "Ops", "Legal", "People", "Personal"];
const PRIORITIES: TaskPriority[] = ["P0", "P1", "P2", "P3"];

// ── Task card ──────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onEdit,
  onMove,
  onDelete,
}: {
  task: NotionTask;
  onEdit: (t: NotionTask) => void;
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}) {
  const statusIdx = STATUSES.findIndex((s) => s.key === task.status);
  const nextStatus = statusIdx < STATUSES.length - 1 ? STATUSES[statusIdx + 1].key : null;
  const prevStatus = statusIdx > 0 ? STATUSES[statusIdx - 1].key : null;

  return (
    <div
      className="bg-card border border-border rounded-lg p-3 space-y-2 hover:border-border/80 cursor-pointer group"
      onClick={() => onEdit(task)}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <p className="text-sm font-medium leading-tight flex-1">{task.title}</p>
        <button
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Next action */}
      {task.nextAction && (
        <p className="text-xs text-muted-foreground line-clamp-2">→ {task.nextAction}</p>
      )}

      {/* Blocking reason */}
      {task.blockingReason && task.status === "Blocked" && (
        <div className="flex items-start gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span className="line-clamp-1">{task.blockingReason}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {task.priority && (
            <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLES[task.priority] ?? ""}`}>
              {task.priority}
            </Badge>
          )}
          {task.category && (
            <Badge variant="secondary" className="text-[10px]">{task.category}</Badge>
          )}
          {task.due && (
            <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-400 gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(task.due).toLocaleDateString([], { month: "short", day: "numeric" })}
            </Badge>
          )}
        </div>

        {/* Move arrows */}
        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
          {prevStatus && (
            <button
              className="text-[11px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent"
              onClick={() => onMove(task.id, prevStatus)}
              title={`Move to ${prevStatus}`}
            >
              ←
            </button>
          )}
          {nextStatus && (
            <button
              className="text-[11px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent"
              onClick={() => onMove(task.id, nextStatus)}
              title={`Move to ${nextStatus}`}
            >
              →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add task dialog ────────────────────────────────────────────────────────

function AddTaskDialog({
  open,
  defaultStatus,
  onClose,
}: {
  open: boolean;
  defaultStatus: TaskStatus;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [category, setCategory] = useState<TaskCategory | "">("");
  const [nextAction, setNextAction] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(""); setStatus(defaultStatus); setPriority("");
    setCategory(""); setNextAction(""); setDue("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        status,
        priority: priority || undefined,
        category: category || undefined,
        nextAction: nextAction.trim() || undefined,
        due: due || undefined,
      }),
    });
    mutate("/api/tasks");
    setSaving(false);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <Input
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due date</p>
              <Input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Next action</p>
            <Input
              placeholder="What's the next step?"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!title.trim() || saving}>
              {saving ? "Adding…" : "Add Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit task dialog ───────────────────────────────────────────────────────

function EditTaskDialog({
  task,
  onClose,
}: {
  task: NotionTask | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "Todo");
  const [priority, setPriority] = useState<TaskPriority | "">(task?.priority ?? "");
  const [category, setCategory] = useState<TaskCategory | "">(task?.category ?? "");
  const [nextAction, setNextAction] = useState(task?.nextAction ?? "");
  const [blockingReason, setBlockingReason] = useState(task?.blockingReason ?? "");
  const [due, setDue] = useState(task?.due ?? "");
  const [saving, setSaving] = useState(false);

  if (!task) return null;

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || task.title,
        status,
        priority: priority || null,
        category: category || null,
        nextAction: nextAction.trim() || null,
        blockingReason: blockingReason.trim() || null,
        due: due || null,
      }),
    });
    mutate("/api/tasks");
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base">Edit Task</DialogTitle>
            {task.url && (
              <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                Open in Notion
              </a>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due date</p>
              <Input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Next action</p>
            <Input
              placeholder="What's the next step?"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />
          </div>

          {(status === "Blocked" || blockingReason) && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Blocking reason</p>
              <Input
                placeholder="What's blocking this?"
                value={blockingReason}
                onChange={(e) => setBlockingReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save to Notion"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { data: tasks, isLoading, error } = useSWR<NotionTask[]>("/api/tasks", fetcher, {
    refreshInterval: 30_000,
  });

  const [addCol, setAddCol] = useState<TaskStatus | null>(null);
  const [editTask, setEditTask] = useState<NotionTask | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const moveTask = async (id: string, status: TaskStatus) => {
    // Optimistic update
    mutate(
      "/api/tasks",
      (current: NotionTask[] | undefined) =>
        current?.map((t) => (t.id === id ? { ...t, status } : t)),
      false
    );
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutate("/api/tasks");
  };

  const deleteTask = async (id: string) => {
    mutate(
      "/api/tasks",
      (current: NotionTask[] | undefined) => current?.filter((t) => t.id !== id),
      false
    );
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    mutate("/api/tasks");
  };

  const allTasks = tasks ?? [];
  const visibleTasks = showCancelled ? allTasks : allTasks.filter((t) => t.status !== "Cancelled");
  const byStatus = (status: TaskStatus) => visibleTasks.filter((t) => t.status === status);

  const totalActive = allTasks.filter((t) => t.status !== "Done" && t.status !== "Cancelled").length;
  const blocked = byStatus("Blocked").length;
  const done = byStatus("Done").length;
  const p0Count = allTasks.filter((t) => t.priority === "P0" && t.status !== "Done" && t.status !== "Cancelled").length;

  return (
    <PageShell title="Tasks" description="Synced with Notion · Lucas's Tasks">
      {/* Notion link */}
      <div className="flex justify-end -mt-2">
        <a
          href="https://www.notion.so/788cf0932dba4fccbaa95ac0ecbcd4f5"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3" />
          Open in Notion
        </a>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Active Tasks", value: totalActive },
          { label: "Blocked", value: blocked, alert: blocked > 0 },
          { label: "P0 Open", value: p0Count, alert: p0Count > 0 },
          { label: "Done", value: done },
        ].map((s) => (
          <Card key={s.label} className={s.alert ? "border-red-500/30" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${s.alert ? "text-red-400" : "text-muted-foreground"}`}>
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.alert ? "text-red-400" : ""}`}>
                {isLoading ? <Skeleton className="h-7 w-12" /> : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load from Notion: {String(error)}
        </div>
      )}

      {/* Board */}
      <div className="grid gap-3 md:grid-cols-5">
        {STATUSES.map((col) => {
          const colTasks = byStatus(col.key);
          return (
            <div key={col.key} className="space-y-2">
              <div className={`flex items-center justify-between px-3 py-2 rounded-md border ${col.border} bg-card/50`}>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium ${col.color}`}>{col.label}</span>
                  <Badge variant="secondary" className="text-[10px]">{colTasks.length}</Badge>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setAddCol(col.key)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2 min-h-[100px]">
                {isLoading ? (
                  <>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : colTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-20 border border-dashed border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">Empty</p>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={setEditTask}
                      onMove={moveTask}
                      onDelete={deleteTask}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <button
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={() => setShowCancelled((v) => !v)}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${showCancelled ? "rotate-90" : ""}`} />
          {showCancelled ? "Hide" : "Show"} cancelled
          {allTasks.filter((t) => t.status === "Cancelled").length > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              {allTasks.filter((t) => t.status === "Cancelled").length}
            </Badge>
          )}
        </button>
        <Button size="sm" onClick={() => setAddCol("Todo")}>
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Cancelled row */}
      {showCancelled && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">Cancelled</p>
          <div className="grid gap-2 md:grid-cols-3">
            {allTasks
              .filter((t) => t.status === "Cancelled")
              .map((task) => (
                <div key={task.id} className="opacity-50 hover:opacity-80 transition-opacity">
                  <TaskCard
                    task={task}
                    onEdit={setEditTask}
                    onMove={moveTask}
                    onDelete={deleteTask}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      <AddTaskDialog
        open={!!addCol}
        defaultStatus={addCol ?? "Todo"}
        onClose={() => setAddCol(null)}
      />
      <EditTaskDialog task={editTask} onClose={() => setEditTask(null)} />
    </PageShell>
  );
}
