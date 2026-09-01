import { NextResponse } from "next/server";
import {
  attachLedgerToWonDeals,
  buildLedgerSummaryPatch,
  fetchDealCompanyAssociations,
  fetchLedgerRevenueSummary,
  type LedgerRevenueSummary,
} from "@/lib/ledger-revenue";
import type { SalesDeal } from "@/components/pipeline/types";

// ---------------------------------------------------------------------------
// HubSpot pipeline IDs & stage mappings (from Kyra's HubSpot instance)
// ---------------------------------------------------------------------------

const PIPELINES = {
  sales: "753712731",
  brokerOutreach: "863744854",
  capital: "867408725",
} as const;

const SALES_STAGES: Record<string, { label: string; order: number; bucket: "open" | "won" | "lost" | "future" }> = {
  "1098882446": { label: "Lead Identified", order: 1, bucket: "open" },
  "1098882447": { label: "RFP Received", order: 2, bucket: "open" },
  "1098882448": { label: "RFP Sent for Quote", order: 3, bucket: "open" },
  "1098882449": { label: "RFP Converted to Proposal", order: 4, bucket: "open" },
  "1098882450": { label: "Proposal Sent", order: 5, bucket: "open" },
  "1098882451": { label: "Broker Presenting", order: 6, bucket: "open" },
  "1295634001": { label: "Verbal Commitment", order: 7, bucket: "open" },
  "1295634002": { label: "Contract Negotiation", order: 8, bucket: "open" },
  "1295634003": { label: "Contract Agreement", order: 9, bucket: "open" },
  "1098882452": { label: "Closed Lost", order: 10, bucket: "lost" },
  "1099288355": { label: "Closed Won", order: 11, bucket: "won" },
  "1099288356": { label: "Future Plan Year", order: 12, bucket: "future" },
};

const BROKER_STAGES: Record<string, { label: string; order: number }> = {
  "1291347739": { label: "Identified", order: 1 },
  "1291347740": { label: "Contacted", order: 2 },
  "1291347741": { label: "Educated", order: 3 },
  "1291347742": { label: "Committed", order: 4 },
  "1291347744": { label: "Producing", order: 5 },
  "1291347746": { label: "Closed Lost", order: 6 },
};

const CAPITAL_STAGES: Record<string, { label: string; order: number }> = {
  "1298529032": { label: "Lead Identified", order: 1 },
  "1298529033": { label: "Intro Made", order: 2 },
  "1298529034": { label: "Engaged", order: 3 },
  "1298529035": { label: "Meeting Scheduled", order: 4 },
  "1298529036": { label: "Active Partnership", order: 5 },
  "1298529042": { label: "Closed Won", order: 6 },
  "1298529041": { label: "Closed Lost", order: 7 },
};

// ---------------------------------------------------------------------------
// HubSpot API helpers
// ---------------------------------------------------------------------------

const HUBSPOT_BASE = "https://api.hubapi.com";

async function hubspotSearch(token: string, objectType: string, body: Record<string, unknown>) {
  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/${objectType}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot ${res.status}: ${text}`);
  }
  return res.json();
}

// Portal ID is stable per HubSpot account — fetch once per server process.
let cachedPortalId: number | null = null;

async function fetchPortalId(token: string): Promise<number | null> {
  if (cachedPortalId !== null) return cachedPortalId;
  try {
    const res = await fetch(`${HUBSPOT_BASE}/account-info/v3/details`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error(`HubSpot account-info ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const portalId = typeof data.portalId === "number" ? data.portalId : null;
    cachedPortalId = portalId;
    return portalId;
  } catch (err) {
    console.error("HubSpot portal ID fetch error:", err);
    return null;
  }
}

async function fetchAllDeals(token: string, pipelineId: string, properties: string[]) {
  const deals: Record<string, unknown>[] = [];
  let after: string | undefined;
  // Paginate (HubSpot search max 200 per page)
  do {
    const body: Record<string, unknown> = {
      filterGroups: [{ filters: [{ propertyName: "pipeline", operator: "EQ", value: pipelineId }] }],
      properties,
      limit: 200,
      ...(after ? { after } : {}),
    };
    const data = await hubspotSearch(token, "deals", body);
    deals.push(...(data.results || []));
    after = data.paging?.next?.after;
  } while (after);
  return deals;
}

// ---------------------------------------------------------------------------
// GET /api/hubspot/pipeline
// ---------------------------------------------------------------------------

export async function GET() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "HUBSPOT_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  try {
    const dealProps = [
      "dealname", "pipeline", "dealstage", "amount",
      "estimated_annual_revenue", "total_member_lives",
      "employees_quoted", "source_channel",
      "hs_deal_stage_probability", "closedate",
      "renewal_date",
      "hubspot_owner_id",
      "createdate", "notes_last_updated",
    ];

    // Commission ledger is the source of truth for contracted revenue.
    // Any failure degrades to HubSpot fallback values with a visible warning.
    const ledgerBaseUrl = process.env.LEDGER_API_URL;
    let ledgerError: string | null = ledgerBaseUrl ? null : "LEDGER_API_URL not configured";

    // Fetch all three pipelines, portal ID, and ledger summary in parallel
    const [salesDeals, brokerDeals, capitalDeals, portalId, ledger] = await Promise.all([
      fetchAllDeals(token, PIPELINES.sales, dealProps),
      fetchAllDeals(token, PIPELINES.brokerOutreach, dealProps),
      fetchAllDeals(token, PIPELINES.capital, dealProps),
      fetchPortalId(token),
      ledgerBaseUrl
        ? fetchLedgerRevenueSummary(ledgerBaseUrl).catch((err): LedgerRevenueSummary | null => {
            console.error("Ledger revenue-summary fetch error:", err);
            ledgerError = err instanceof Error ? err.message : "Ledger unreachable";
            return null;
          })
        : Promise.resolve<LedgerRevenueSummary | null>(null),
    ]);

    // ----- Process Sales Pipeline -----
    const salesOpen: unknown[] = [];
    const salesWon: unknown[] = [];
    const salesLost: unknown[] = [];
    const salesFuture: unknown[] = [];
    const stageSummary: Record<string, { label: string; order: number; count: number; revenue: number }> = {};

    for (const deal of salesDeals) {
      const props = (deal as { properties: Record<string, string> }).properties;
      const stageId = props.dealstage;
      const stageInfo = SALES_STAGES[stageId] || { label: stageId, order: 99, bucket: "open" as const };
      const rev = parseFloat(props.estimated_annual_revenue) || 0;
      const prob = parseFloat(props.hs_deal_stage_probability) || 0;

      const mapped = {
        id: (deal as { id: string }).id,
        name: props.dealname,
        stage: stageInfo.label,
        stageOrder: stageInfo.order,
        revenue: rev,
        probability: prob,
        weightedRevenue: rev * prob,
        memberLives: parseInt(props.total_member_lives) || 0,
        employeesQuoted: parseInt(props.employees_quoted) || 0,
        sourceChannel: props.source_channel || "Unknown",
        closeDate: props.closedate || null,
        effectiveDate: props.renewal_date || null,
        revenueSource: "hubspot-fallback" as const,
      };

      if (stageInfo.bucket === "won") salesWon.push(mapped);
      else if (stageInfo.bucket === "lost") salesLost.push(mapped);
      else if (stageInfo.bucket === "future") salesFuture.push(mapped);
      else salesOpen.push(mapped);

      if (stageInfo.bucket === "open") {
        if (!stageSummary[stageId]) {
          stageSummary[stageId] = { label: stageInfo.label, order: stageInfo.order, count: 0, revenue: 0 };
        }
        stageSummary[stageId].count++;
        stageSummary[stageId].revenue += rev;
      }
    }

    // ----- Process Broker & Capital Pipelines -----
    interface ChannelDeal {
      id: string;
      name: string;
      createdAt: string | null;
      lastActivity: string | null;
    }

    const groupChannelDeals = (
      deals: Record<string, unknown>[],
      stageMap: Record<string, { label: string; order: number }>,
      stripSuffixes: string[],
    ) => {
      const byStage: Record<string, { label: string; order: number; count: number; deals: ChannelDeal[] }> = {};
      for (const deal of deals) {
        const props = (deal as { properties: Record<string, string> }).properties;
        const stageId = props.dealstage;
        const stageInfo = stageMap[stageId] || { label: stageId, order: 99 };
        if (!byStage[stageId]) {
          byStage[stageId] = { label: stageInfo.label, order: stageInfo.order, count: 0, deals: [] };
        }
        byStage[stageId].count++;
        const name = stripSuffixes.reduce(
          (n, suffix) => n.replace(suffix, ""),
          props.dealname || "Unknown",
        );
        byStage[stageId].deals.push({
          id: (deal as { id: string }).id,
          name,
          createdAt: props.createdate || null,
          lastActivity: props.notes_last_updated || null,
        });
      }
      return byStage;
    };

    const brokerByStage = groupChannelDeals(brokerDeals, BROKER_STAGES, [" - Broker Outreach"]);
    const capitalByStage = groupChannelDeals(capitalDeals, CAPITAL_STAGES, [
      " - PE Channel Partner",
      " - PE Partnership",
    ]);

    // ----- Merge ledger truth into won deals -----
    let wonDeals = salesWon as SalesDeal[];
    let unlinkedEmployers: ReturnType<typeof attachLedgerToWonDeals>["unlinkedEmployers"] = [];
    if (ledger) {
      const associations = await fetchDealCompanyAssociations(
        token,
        wonDeals.map((d) => d.id),
      ).catch((err): Record<string, string[]> | null => {
        console.error("HubSpot deal-company associations error:", err);
        ledgerError = "Deal-company associations unavailable; per-deal figures show HubSpot values";
        return null;
      });
      if (associations) {
        ({ deals: wonDeals, unlinkedEmployers } = attachLedgerToWonDeals(
          wonDeals,
          associations,
          ledger,
        ));
      }
    }

    // ----- Compute summary metrics -----
    // Open/weighted pipeline stay HubSpot-based: they forecast unclosed deals.
    const openArr = salesOpen as { revenue: number; weightedRevenue: number }[];
    const openPipeline = openArr.reduce((s, d) => s + d.revenue, 0);
    const weightedPipeline = openArr.reduce((s, d) => s + d.weightedRevenue, 0);

    // Contracted revenue comes from the ledger; HubSpot deal fields are the
    // degraded fallback (estimated_annual_revenue is a static calculated
    // property in HubSpot, not real revenue).
    const fallbackARR = wonDeals.reduce((s, d) => s + (d.revenueSource === "ledger" ? 0 : d.revenue), 0);
    const fallbackLives = wonDeals.reduce((s, d) => s + d.memberLives, 0);
    const ledgerPatch = ledger ? buildLedgerSummaryPatch(ledger) : null;

    const contractedSummary = ledgerPatch
      ? {
          contractedARR: ledgerPatch.contractedARR,
          totalLives: ledgerPatch.totalLives,
          liveEmployees: ledgerPatch.liveEmployees,
          avgPEPM: ledgerPatch.avgPEPM,
          revenueBreakdown: ledgerPatch.revenueBreakdown,
          commissionAccrual: ledgerPatch.commissionAccrual,
          dataQuality: {
            ...ledgerPatch.dataQuality,
            hubspotFallbackDeals: wonDeals.filter((d) => d.revenueSource !== "ledger").length,
            unmatchedLedgerEmployers: unlinkedEmployers.map((e) => e.name),
          },
        }
      : {
          contractedARR: fallbackARR,
          totalLives: fallbackLives,
          avgPEPM: fallbackLives > 0 ? Math.round((fallbackARR / fallbackLives / 12) * 100) / 100 : 0,
        };

    // Count active partners (not Closed Lost stage)
    const activeBrokers = brokerDeals.filter((d) => {
      const st = (d as { properties: Record<string, string> }).properties.dealstage;
      return st !== "1291347746";
    }).length;

    const activePE = capitalDeals.filter((d) => {
      const st = (d as { properties: Record<string, string> }).properties.dealstage;
      return st !== "1298529041" && st !== "1298529042";
    }).length;

    return NextResponse.json({
      summary: {
        ...contractedSummary,
        openPipeline,
        weightedPipeline,
        openDealCount: salesOpen.length,
        activeBrokers,
        activePE,
        ledgerError,
      },
      sales: {
        open: (salesOpen as { stageOrder: number }[]).sort((a, b) => a.stageOrder - b.stageOrder),
        won: wonDeals,
        unlinkedEmployers,
        lost: salesLost,
        future: salesFuture,
        stageChart: Object.values(stageSummary).sort((a, b) => a.order - b.order),
      },
      broker: {
        total: brokerDeals.length,
        stages: Object.values(brokerByStage).sort((a, b) => a.order - b.order),
      },
      capital: {
        total: capitalDeals.length,
        stages: Object.values(capitalByStage).sort((a, b) => a.order - b.order),
      },
      portalId,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("HubSpot pipeline fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
