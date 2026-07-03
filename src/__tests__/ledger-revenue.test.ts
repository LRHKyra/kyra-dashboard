import { describe, expect, it } from "vitest";
import {
  attachLedgerToWonDeals,
  buildLedgerSummaryPatch,
  type LedgerRevenueSummary,
} from "@/lib/ledger-revenue";
import type { SalesDeal } from "@/components/pipeline/types";

const ledger: LedgerRevenueSummary = {
  month: "2026-07",
  employers: [
    {
      employerId: "emp-1",
      hubspotCompanyId: "56399357762",
      displayName: "Blue Ridge Automation, Inc",
      liveEmployees: 46,
      memberLives: 76,
      monthly: {
        platformFeeCents: 161_000,
        commissionCents: 152_000,
        overrideCents: 12_160,
        premiumCents: 4_000_000,
        ccFeeEstimateCents: 40_000,
      },
      annualRunRateCents: (161_000 + 152_000 + 12_160 + 40_000) * 12,
      dataQuality: { coveragesMissingContractRule: 2, coveragesUnlinked: 0 },
    },
    {
      employerId: "emp-2",
      hubspotCompanyId: "999",
      displayName: "Orphan Employer LLC",
      liveEmployees: 5,
      memberLives: 9,
      monthly: {
        platformFeeCents: 17_500,
        commissionCents: 10_000,
        overrideCents: 0,
        premiumCents: 400_000,
        ccFeeEstimateCents: 4_000,
      },
      annualRunRateCents: 31_500 * 12,
      dataQuality: { coveragesMissingContractRule: 0, coveragesUnlinked: 1 },
    },
  ],
  totals: {
    liveEmployees: 51,
    memberLives: 85,
    monthly: {
      platformFeeCents: 178_500,
      commissionCents: 162_000,
      overrideCents: 12_160,
      premiumCents: 4_400_000,
      ccFeeEstimateCents: 44_000,
    },
    annualRunRateCents: (161_000 + 152_000 + 12_160 + 40_000) * 12 + 31_500 * 12,
    dataQuality: { coveragesMissingContractRule: 2, coveragesUnlinked: 1 },
  },
  unattributed: { coverages: 3, memberLives: 4, premiumCents: 100_000, ccFeeEstimateCents: 1_000 },
};

function wonDeal(overrides: Partial<SalesDeal>): SalesDeal {
  return {
    id: "d-1",
    name: "Blue Ridge Automation, Inc",
    stage: "Closed Won",
    stageOrder: 11,
    revenue: 51_072,
    probability: 1,
    weightedRevenue: 51_072,
    memberLives: 76,
    employeesQuoted: 37,
    sourceChannel: "Broker",
    closeDate: null,
    effectiveDate: null,
    revenueSource: "hubspot-fallback",
    ...overrides,
  };
}

describe("buildLedgerSummaryPatch", () => {
  it("converts ledger totals into dashboard summary dollars", () => {
    const patch = buildLedgerSummaryPatch(ledger);
    expect(patch.contractedARR).toBeCloseTo(ledger.totals.annualRunRateCents / 100, 2);
    expect(patch.totalLives).toBe(85);
    expect(patch.liveEmployees).toBe(51);
    // true PEPM: ARR / live employees / 12
    expect(patch.avgPEPM).toBeCloseTo(ledger.totals.annualRunRateCents / 100 / 51 / 12, 2);
    // annualized breakdown in dollars
    expect(patch.revenueBreakdown.platformFees).toBeCloseTo((178_500 * 12) / 100, 2);
    expect(patch.revenueBreakdown.commissions).toBeCloseTo(((162_000 + 12_160) * 12) / 100, 2);
    expect(patch.revenueBreakdown.ccFees).toBeCloseTo((44_000 * 12) / 100, 2);
    expect(patch.dataQuality.coveragesMissingContractRule).toBe(2);
    expect(patch.dataQuality.unattributedCoverages).toBe(3);
  });

  it("returns zero PEPM when there are no live employees", () => {
    const empty: LedgerRevenueSummary = {
      ...ledger,
      totals: { ...ledger.totals, liveEmployees: 0, annualRunRateCents: 0 },
    };
    expect(buildLedgerSummaryPatch(empty).avgPEPM).toBe(0);
  });
});

describe("attachLedgerToWonDeals", () => {
  it("overrides deal figures from the matched ledger employer", () => {
    const { deals } = attachLedgerToWonDeals(
      [wonDeal({})],
      { "d-1": ["56399357762"] },
      ledger,
    );
    expect(deals[0].revenueSource).toBe("ledger");
    expect(deals[0].revenue).toBeCloseTo((365_160 * 12) / 100, 2);
    expect(deals[0].liveEmployees).toBe(46);
    expect(deals[0].memberLives).toBe(76);
    expect(deals[0].revenueBreakdown?.platformFees).toBeCloseTo((161_000 * 12) / 100, 2);
  });

  it("keeps HubSpot values and flags fallback when no ledger employer matches", () => {
    const { deals } = attachLedgerToWonDeals([wonDeal({})], { "d-1": ["12345"] }, ledger);
    expect(deals[0].revenueSource).toBe("hubspot-fallback");
    expect(deals[0].revenue).toBe(51_072);
    expect(deals[0].memberLives).toBe(76);
    expect(deals[0].liveEmployees).toBeUndefined();
  });

  it("reports ledger employers with revenue that match no closed-won deal", () => {
    const { unmatchedLedgerEmployers } = attachLedgerToWonDeals(
      [wonDeal({})],
      { "d-1": ["56399357762"] },
      ledger,
    );
    expect(unmatchedLedgerEmployers).toEqual(["Orphan Employer LLC"]);
  });

  it("does not mutate the input deals", () => {
    const deal = wonDeal({});
    const frozen = Object.freeze({ ...deal });
    attachLedgerToWonDeals([frozen], { "d-1": ["56399357762"] }, ledger);
    expect(frozen.revenue).toBe(51_072);
  });
});
