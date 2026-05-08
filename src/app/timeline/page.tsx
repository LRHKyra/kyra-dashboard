"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, User, Bot, Wrench } from "lucide-react";
import { useSessions, useSessionDetail } from "@/hooks/use-sessions";
import type { MessageRecord, JournalRecord } from "@/lib/types";

function MessageBubble({ record }: { record: MessageRecord }) {
  const [expanded, setExpanded] = useState(false);
  const role = record.message.role;
  const isAssistant = role === "assistant";
  const isToolResult = role === "toolResult";

  const textContent = record.message.content
    ?.filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");

  const toolCalls = record.message.content?.filter((b) => b.type === "toolCall") as
    | Array<{ type: "toolCall"; name: string; input: Record<string, unknown> }>
    | undefined;

  const inner = record.message as Record<string, unknown>;
  const usageObj = inner.usage as Record<string, unknown> | undefined;
  const costObj = usageObj?.cost as Record<string, number> | undefined;
  const cost = costObj?.total ?? record.usage?.cost?.total;

  return (
    <div className={`flex gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}>
      <div className="shrink-0 mt-1">
        {isAssistant ? (
          <Bot className="h-5 w-5 text-blue-400" />
        ) : isToolResult ? (
          <Wrench className="h-5 w-5 text-yellow-400" />
        ) : (
          <User className="h-5 w-5 text-green-400" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isAssistant
            ? "bg-accent"
            : isToolResult
            ? "bg-yellow-950/30 border border-yellow-900/30"
            : "bg-primary/10"
        }`}
      >
        {textContent && (
          <p className="whitespace-pre-wrap break-words">
            {textContent.length > 500 && !expanded
              ? textContent.slice(0, 500) + "..."
              : textContent}
            {textContent.length > 500 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-blue-400 text-xs ml-1 hover:underline"
              >
                {expanded ? "show less" : "show more"}
              </button>
            )}
          </p>
        )}
        {toolCalls && toolCalls.length > 0 && (
          <div className="mt-1 space-y-1">
            {toolCalls.map((tc, i) => (
              <Collapsible key={i}>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-mono">{tc.name}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="text-xs mt-1 p-2 rounded bg-black/30 overflow-x-auto max-h-48 overflow-y-auto">
                    {JSON.stringify(tc.input, null, 2).slice(0, 2000)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
        {cost !== undefined && cost > 0 && (
          <span className="text-xs text-muted-foreground mt-1 block">
            ${cost.toFixed(4)}
          </span>
        )}
        <span className="text-xs text-muted-foreground/50 block mt-0.5">
          {record.timestamp && new Date(record.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data: detail, isLoading: detailLoading } = useSessionDetail(selectedSession, offset, limit);

  return (
    <PageShell title="Timeline" description="Session event stream with expandable detail">
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Session list sidebar */}
        <Card className="w-72 shrink-0">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Sessions</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-3rem)]">
            <div className="p-2 space-y-1">
              {sessionsLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))
              ) : (
                sessions?.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSession(s.id); setOffset(0); }}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                      selectedSession === s.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono truncate">{s.id.slice(0, 8)}</span>
                      <Badge variant="outline" className="text-[10px] ml-1">{s.type}</Badge>
                    </div>
                    <div className="text-muted-foreground/60 mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Event stream */}
        <Card className="flex-1">
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {selectedSession ? `Session ${selectedSession.slice(0, 8)}...` : "Select a session"}
            </CardTitle>
            {detail && (
              <span className="text-xs text-muted-foreground">
                {detail.offset + 1}–{Math.min(detail.offset + detail.limit, detail.total)} of {detail.total}
              </span>
            )}
          </CardHeader>
          <ScrollArea className="h-[calc(100%-3rem)]">
            <div className="p-4 space-y-3">
              {detailLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : detail?.records ? (
                <>
                  {detail.records
                    .filter((r): r is MessageRecord => r.type === "message")
                    .map((record, i) => (
                      <MessageBubble key={i} record={record} />
                    ))}
                  {/* Pagination */}
                  <div className="flex gap-2 justify-center pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset + limit >= (detail?.total ?? 0)}
                      onClick={() => setOffset(offset + limit)}
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select a session to view its timeline
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </PageShell>
  );
}
