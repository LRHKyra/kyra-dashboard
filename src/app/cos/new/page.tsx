"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface IntakeResult {
  kind: string;
  assignment_id?: string;
  work_type?: string;
  route_lane?: string;
  flow_template?: string;
  reasoning?: string;
  errors?: string[];
}

export default function CosNewPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/cos/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? data.error ?? "Failed to create assignment");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell title="New Assignment" description="Submit work to the Chief of Staff tracker">
      <Link href="/cos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to queue
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What do you need done?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="w-full min-h-[120px] bg-background border border-border rounded-md p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            placeholder="Describe the assignment... e.g., 'Build a board deck for next week's investor meeting focused on Q2 revenue growth and pipeline health'"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting}
          />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Urgency:</label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto">
              <Button onClick={handleSubmit} disabled={submitting || !text.trim()} size="sm">
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-1" />
                )}
                Submit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mt-4 border-red-500/30">
          <CardContent className="p-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mt-4 border-green-500/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Assignment created</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {result.work_type && (
                <Badge variant="outline" className="text-xs">
                  {result.work_type}
                </Badge>
              )}
              {result.route_lane && (
                <Badge variant="outline" className="text-xs">
                  {result.route_lane}
                </Badge>
              )}
            </div>

            {result.reasoning && (
              <p className="text-xs text-muted-foreground">{result.reasoning}</p>
            )}

            {result.assignment_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/cos/${result.assignment_id}`)}
              >
                View assignment
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
