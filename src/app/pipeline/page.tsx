"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useApi } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiStrip } from "@/components/pipeline/kpi-strip";
import { ChannelFunnels } from "@/components/pipeline/channel-funnels";
import { EmployerPipeline } from "@/components/pipeline/employer-pipeline";
import { ContractedRevenue } from "@/components/pipeline/contracted-revenue";
import { Clock } from "lucide-react";
import type { PipelineData } from "@/components/pipeline/types";

export default function PipelinePage() {
  const { data, error, isLoading } = useApi<PipelineData>("/api/hubspot/pipeline", {
    refreshInterval: 5 * 60 * 1000, // auto-refresh every 5 minutes
  });

  return (
    <PageShell
      title="Pipeline"
      description="Live from HubSpot"
    >
      {/* Last refreshed timestamp */}
      {data?.fetchedAt && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-3">
          <Clock className="h-3 w-3" />
          Last refreshed {new Date(data.fetchedAt).toLocaleTimeString()}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load pipeline data: {error.message}
        </div>
      )}

      {isLoading && <LoadingSkeleton />}

      {data && (
        <div className="space-y-8">
          {/* KPI strip */}
          <KpiStrip summary={data.summary} />

          {/* H1: Channel Development */}
          <section>
            <SectionHeader
              title="Channel Development"
              subtitle="Broker and PE partnerships feeding employer pipeline"
            />
            <ChannelFunnels
              broker={data.broker}
              capital={data.capital}
              portalId={data.portalId ?? null}
            />
          </section>

          {/* H2: Employer Pipeline */}
          <section>
            <SectionHeader
              title="Employer Pipeline"
              subtitle="Active employer-level ICHRA deals by stage"
            />
            <EmployerPipeline sales={data.sales} />
          </section>

          {/* H3: Contracted Revenue */}
          <section>
            <SectionHeader
              title="Contracted Revenue"
              subtitle="Signed employers generating recurring ICHRA revenue"
            />
            <ContractedRevenue
              won={data.sales.won}
              summary={data.summary}
            />
          </section>
        </div>
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
