import type { SalesDeal } from "@/components/pipeline/types";

/**
 * Integration with kyra-commission-ledger's revenue-summary report.
 * The ledger is the source of truth for contracted revenue: platform fees,
 * expected carrier commissions/overrides (contract-rule based), and the
 * credit-card fee estimate. HubSpot deal amounts remain only as a fallback
 * when a closed-won deal has no ledger employer linked.
 */

// ---------------------------------------------------------------------------
// Ledger response types (money in integer cents, mirroring the ledger API)
// ---------------------------------------------------------------------------

export interface LedgerMonthly {
  platformFeeCents: number;
  commissionCents: number;
  overrideCents: number;
  premiumCents: number;
  ccFeeEstimateCents: number;
}

export interface LedgerDataQuality {
  coveragesMissingContractRule: number;
  coveragesUnlinked: number;
}

export interface LedgerEmployer {
  employerId: string;
  hubspotCompanyId: string | null;
  displayName: string;
  liveEmployees: number;
  memberLives: number;
  monthly: LedgerMonthly;
  annualRunRateCents: number;
  dataQuality: LedgerDataQuality;
}

export interface LedgerRevenueSummary {
  month: string;
  employers: LedgerEmployer[];
  totals: {
    liveEmployees: number;
    memberLives: number;
    monthly: LedgerMonthly;
    annualRunRateCents: number;
    dataQuality: LedgerDataQuality;
  };
  unattributed: {
    coverages: number;
    memberLives: number;
    premiumCents: number;
    ccFeeEstimateCents: number;
  };
}

// ---------------------------------------------------------------------------
// Dashboard-facing shapes (dollars)
// ---------------------------------------------------------------------------

export interface RevenueBreakdown {
  platformFees: number;
  commissions: number;
  ccFees: number;
}

export interface PipelineDataQuality {
  coveragesMissingContractRule: number;
  coveragesUnlinked: number;
  unattributedCoverages: number;
  unattributedMemberLives: number;
  hubspotFallbackDeals: number;
  unmatchedLedgerEmployers: string[];
}

export interface LedgerSummaryPatch {
  contractedARR: number;
  totalLives: number;
  liveEmployees: number;
  avgPEPM: number;
  revenueBreakdown: RevenueBreakdown;
  dataQuality: Omit<PipelineDataQuality, "hubspotFallbackDeals" | "unmatchedLedgerEmployers">;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const centsToDollars = (cents: number) => round2(cents / 100);
const annualDollars = (monthlyCents: number) => centsToDollars(monthlyCents * 12);

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function fetchLedgerRevenueSummary(baseUrl: string): Promise<LedgerRevenueSummary> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/reports/revenue-summary`, {
    // Revenue changes at enrollment cadence; avoid hammering the ledger.
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`Ledger revenue-summary HTTP ${res.status}: ${body}`);
  }
  const body = (await res.json()) as { success: boolean; data?: LedgerRevenueSummary; error?: string };
  if (!body.success || !body.data) {
    throw new Error(`Ledger revenue-summary error: ${body.error ?? "missing data"}`);
  }
  if (!Array.isArray(body.data.employers) || !body.data.totals?.monthly) {
    throw new Error("Ledger revenue-summary error: unexpected response shape");
  }
  return body.data;
}

// ---------------------------------------------------------------------------
// Pure merge logic
// ---------------------------------------------------------------------------

export function buildLedgerSummaryPatch(ledger: LedgerRevenueSummary): LedgerSummaryPatch {
  const { totals, unattributed } = ledger;
  const contractedARR = centsToDollars(totals.annualRunRateCents);
  return {
    contractedARR,
    totalLives: totals.memberLives,
    liveEmployees: totals.liveEmployees,
    avgPEPM: totals.liveEmployees > 0 ? round2(contractedARR / totals.liveEmployees / 12) : 0,
    revenueBreakdown: {
      platformFees: annualDollars(totals.monthly.platformFeeCents),
      commissions: annualDollars(totals.monthly.commissionCents + totals.monthly.overrideCents),
      ccFees: annualDollars(totals.monthly.ccFeeEstimateCents),
    },
    dataQuality: {
      coveragesMissingContractRule: totals.dataQuality.coveragesMissingContractRule,
      coveragesUnlinked: totals.dataQuality.coveragesUnlinked,
      unattributedCoverages: unattributed.coverages,
      unattributedMemberLives: unattributed.memberLives,
    },
  };
}

export interface UnlinkedLedgerEmployer {
  name: string;
  revenue: number;
  liveEmployees: number;
  memberLives: number;
  revenueBreakdown: RevenueBreakdown;
}

export function attachLedgerToWonDeals(
  wonDeals: readonly SalesDeal[],
  dealCompanyIds: Record<string, string[]>,
  ledger: LedgerRevenueSummary,
): { deals: SalesDeal[]; unlinkedEmployers: UnlinkedLedgerEmployer[] } {
  const employersByCompanyId = new Map(
    ledger.employers
      .filter((e) => e.hubspotCompanyId)
      .map((e) => [e.hubspotCompanyId as string, e]),
  );

  const matchedEmployerIds = new Set<string>();

  const deals = wonDeals.map((deal) => {
    const companyIds = dealCompanyIds[deal.id] ?? [];
    // A deal can be associated with duplicate company records (one empty, one
    // carrying the ledger employer) — pick the matching employer with the
    // highest run-rate rather than the first association returned.
    const match = companyIds
      .map((id) => employersByCompanyId.get(id))
      .filter((e) => e !== undefined)
      .sort((a, b) => b.annualRunRateCents - a.annualRunRateCents)[0];

    if (!match) {
      return { ...deal, revenueSource: "hubspot-fallback" as const };
    }

    matchedEmployerIds.add(match.employerId);
    return {
      ...deal,
      revenueSource: "ledger" as const,
      revenue: centsToDollars(match.annualRunRateCents),
      liveEmployees: match.liveEmployees,
      memberLives: match.memberLives,
      revenueBreakdown: {
        platformFees: annualDollars(match.monthly.platformFeeCents),
        commissions: annualDollars(match.monthly.commissionCents + match.monthly.overrideCents),
        ccFees: annualDollars(match.monthly.ccFeeEstimateCents),
      },
    };
  });

  // Ledger employers generating revenue that no closed-won deal claims —
  // usually the deal is associated with a duplicate HubSpot company record
  // while the employees (and thus the ledger employer) live on another.
  // Returned with full figures so the table can reconcile to ledger totals.
  const unlinkedEmployers = ledger.employers
    .filter(
      (e) =>
        !matchedEmployerIds.has(e.employerId) &&
        (e.annualRunRateCents > 0 || e.liveEmployees > 0),
    )
    .map((e) => ({
      name: e.displayName,
      revenue: centsToDollars(e.annualRunRateCents),
      liveEmployees: e.liveEmployees,
      memberLives: e.memberLives,
      revenueBreakdown: {
        platformFees: annualDollars(e.monthly.platformFeeCents),
        commissions: annualDollars(e.monthly.commissionCents + e.monthly.overrideCents),
        ccFees: annualDollars(e.monthly.ccFeeEstimateCents),
      },
    }));

  return { deals, unlinkedEmployers };
}

// ---------------------------------------------------------------------------
// HubSpot deal → company associations (v4 batch read)
// ---------------------------------------------------------------------------

export async function fetchDealCompanyAssociations(
  token: string,
  dealIds: readonly string[],
): Promise<Record<string, string[]>> {
  if (dealIds.length === 0) return {};

  const res = await fetch("https://api.hubapi.com/crm/v4/associations/deals/companies/batch/read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ inputs: dealIds.map((id) => ({ id })) }),
  });
  if (!res.ok) {
    throw new Error(`HubSpot associations ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    results?: { from: { id: string }; to: { toObjectId: number | string }[] }[];
  };

  return (data.results ?? []).reduce<Record<string, string[]>>(
    (acc, result) => ({
      ...acc,
      [result.from.id]: result.to.map((t) => String(t.toObjectId)),
    }),
    {},
  );
}
