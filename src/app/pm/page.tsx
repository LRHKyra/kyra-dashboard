"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioTable } from "@/components/pm/portfolio-table";
import { PortfolioSummary } from "@/components/pm/portfolio-summary";
import { InitiativeDetail } from "@/components/pm/initiative-detail";
import { AlertsPanel } from "@/components/pm/alerts-panel";
import { DigestPanel } from "@/components/pm/digest-panel";
import { UnmatchedReview } from "@/components/pm/unmatched-review";
import {
  useInitiatives,
  useUnmatchedCount,
  refreshPortfolio,
} from "@/lib/pm-api";

export default function PMPage() {
  const { data: initiatives, isLoading, error } = useInitiatives();
  const { data: unmatchedCount } = useUnmatchedCount();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshPortfolio();
    } catch {
      // Error visible from SWR revalidation
    } finally {
      setRefreshing(false);
    }
  };

  const pendingCount = unmatchedCount?.total ?? 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero banner with brand gradient */}
      <div className="bg-gradient-to-br from-[#6045FF] via-[#7B66FF] to-[#FFB069] px-6 pt-6 pb-8">
        <h2 className="text-xl font-semibold text-white tracking-tight">Portfolio</h2>
        <p className="text-sm text-white/70 mt-0.5">Initiative tracking and risk intelligence</p>
      </div>

      {/* Content pulled up into the banner with rounded card */}
      <div className="px-6 -mt-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4 overflow-hidden">
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="digest">Digest</TabsTrigger>
              <TabsTrigger value="review" className="relative">
                Review
                {pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFB069] px-1 text-[10px] font-semibold text-[#0A052B]">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <PortfolioSummary onSelect={setSelectedId} />
            </TabsContent>

            <TabsContent value="portfolio">
              <PortfolioTable
                initiatives={initiatives}
                isLoading={isLoading}
                error={error}
                onSelect={setSelectedId}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            </TabsContent>

            <TabsContent value="alerts">
              <AlertsPanel />
            </TabsContent>

            <TabsContent value="digest">
              <DigestPanel />
            </TabsContent>

            <TabsContent value="review">
              <UnmatchedReview />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <InitiativeDetail
        initiativeId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
