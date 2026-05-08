"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import type { ToolStats, Skill } from "@/lib/types";

export default function SkillsPage() {
  const { data: skills, isLoading: skillsLoading } = useApi<Skill[]>("/api/skills");
  const { data: tools, isLoading: toolsLoading } = useApi<ToolStats[]>("/api/tools");

  return (
    <PageShell title="Skills" description="Registered skills and tool usage statistics">
      {/* Skills cards */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Registered Skills</h3>
        {skillsLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : skills && skills.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Card key={skill.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {skill.name}
                    {skill.source && (
                      <Badge variant="outline" className="text-[10px]">
                        {skill.source}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {skill.description || "No description available"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No skills found.</p>
        )}
      </div>

      {/* Tool usage table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {toolsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : tools && tools.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead className="text-right">Invocations</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Error Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => (
                  <TableRow key={tool.name}>
                    <TableCell className="font-mono text-sm">{tool.name}</TableCell>
                    <TableCell className="text-right">{tool.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{tool.errorCount}</TableCell>
                    <TableCell className="text-right">
                      {tool.errorRate > 0 ? `${(tool.errorRate * 100).toFixed(1)}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No tool data available.</p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
