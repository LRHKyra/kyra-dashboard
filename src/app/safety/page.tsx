"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Link2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface SafetyData {
  soulMd: string | null;
  agentsMd: string | null;
  execApprovals: {
    version: number;
    socket?: { path: string; token: string };
    defaults?: Record<string, unknown>;
    agents?: Record<string, unknown>;
  } | null;
  integrations: string[];
}

export default function SafetyPage() {
  const { data, isLoading } = useApi<SafetyData>("/api/safety");

  if (isLoading) {
    return (
      <PageShell title="Safety" description="Guardrails, identity, and governance">
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell title="Safety" description="Guardrails, identity, and governance">
      {/* Identity files side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              SOUL.md
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {data?.soulMd ? (
                <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {data.soulMd}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Not found.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              AGENTS.md
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {data?.agentsMd ? (
                <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {data.agentsMd}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Not found.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Exec approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exec Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.execApprovals ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span>{data.execApprovals.version}</span>
                </div>
                {data.execApprovals.socket && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Socket</span>
                      <span className="font-mono text-xs truncate max-w-[200px]">
                        {data.execApprovals.socket.path}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token</span>
                      <span className="font-mono text-xs">{data.execApprovals.socket.token}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default Rules</span>
                  <span>{Object.keys(data.execApprovals.defaults || {}).length} entries</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent Rules</span>
                  <span>{Object.keys(data.execApprovals.agents || {}).length} entries</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No exec approvals config found.</p>
            )}
          </CardContent>
        </Card>

        {/* External integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              External Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.integrations && data.integrations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.integrations.map((integration) => (
                  <Badge key={integration} variant="secondary" className="text-sm">
                    {integration}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No external integrations detected.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
