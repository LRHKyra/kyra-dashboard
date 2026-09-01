/**
 * The commission-accrual guard on the Contracted Revenue panel.
 *
 * Regression cover for 2026-09-01: the ledger's nightly HubSpot sync had not
 * run since Aug 25, so no entitlement lines existed for September, commissions
 * read $0, and the panel rendered Avg PEPM as a confident $44.24 — a ~40% drop
 * that looked like a real business event rather than an un-run job.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ContractedRevenue } from "@/components/pipeline/contracted-revenue";
import type { PipelineSummary } from "@/components/pipeline/types";

const baseSummary: PipelineSummary = {
  contractedARR: 102_386.64,
  totalLives: 190,
  liveEmployees: 111,
  avgPEPM: 76.87,
  revenueBreakdown: { platformFees: 46_620, commissions: 43_504.8, ccFees: 12_261.84 },
  openPipeline: 0,
  weightedPipeline: 0,
  openDealCount: 0,
  activeBrokers: 0,
  activePE: 0,
  ledgerError: null,
  dataQuality: {
    coveragesMissingContractRule: 17,
    coveragesUnlinked: 5,
    unattributedCoverages: 5,
    unattributedMemberLives: 5,
    hubspotFallbackDeals: 0,
    unmatchedLedgerEmployers: [],
  },
  commissionAccrual: {
    status: "complete",
    month: "2026-09",
    liveEmployees: 111,
    accruedCoverages: 94,
  },
};

/** The panel exactly as it looked during the 2026-09-01 incident. */
const notAccruedSummary: PipelineSummary = {
  ...baseSummary,
  contractedARR: 58_397.16,
  totalLives: 189,
  liveEmployees: 110,
  avgPEPM: 44.24,
  revenueBreakdown: { platformFees: 46_200, commissions: 0, ccFees: 12_197.16 },
  dataQuality: { ...baseSummary.dataQuality!, coveragesMissingContractRule: 110 },
  commissionAccrual: {
    status: "missing",
    month: "2026-09",
    liveEmployees: 110,
    accruedCoverages: 0,
  },
};

describe("ContractedRevenue commission-accrual guard", () => {
  it("renders figures without caveat when the month is accrued", () => {
    render(<ContractedRevenue won={[]} summary={baseSummary} />);
    expect(screen.getByText("$76.87")).toBeInTheDocument();
    expect(screen.queryByText(/have not been accrued yet/)).not.toBeInTheDocument();
    expect(screen.getByText("Contracted ARR")).toBeInTheDocument();
  });

  it("warns that ARR and PEPM exclude commissions when the month is not accrued", () => {
    render(<ContractedRevenue won={[]} summary={notAccruedSummary} />);
    expect(
      screen.getByText(/Commissions for 2026-09 have not been accrued yet\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/understated/)).toBeInTheDocument();
  });

  it("marks the understated PEPM rather than presenting it as the rate", () => {
    render(<ContractedRevenue won={[]} summary={notAccruedSummary} />);
    expect(screen.getByText("$44.24*")).toBeInTheDocument();
    expect(screen.getByText("Platform + card fees only")).toBeInTheDocument();
  });

  it("labels the ARR card as excluding commissions", () => {
    render(<ContractedRevenue won={[]} summary={notAccruedSummary} />);
    expect(screen.getByText("Contracted ARR (excl. commissions)")).toBeInTheDocument();
  });

  it("drops the misleading missing-contract-rule line while accrual is the cause", () => {
    render(<ContractedRevenue won={[]} summary={notAccruedSummary} />);
    // 110 of 110 coverages are not short a contract rule — the job never ran.
    expect(
      screen.queryByText(/110 enrolled coverages missing commission contract rules/),
    ).not.toBeInTheDocument();
  });

  it("still reports the genuine missing-rule baseline when accrual is complete", () => {
    render(<ContractedRevenue won={[]} summary={baseSummary} />);
    expect(
      screen.getByText(/17 enrolled coverages missing commission contract rules/),
    ).toBeInTheDocument();
  });
});
