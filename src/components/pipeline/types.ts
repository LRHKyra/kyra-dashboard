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

/** Mirrors CommissionAccrual in @/lib/ledger-revenue. */
export interface CommissionAccrual {
  status: "complete" | "partial" | "missing";
  month: string;
  liveEmployees: number;
  accruedCoverages: number;
}

export interface PipelineSummary {
  contractedARR: number;
  totalLives: number;
  /** Employees with billable coverage this month (from the commission ledger). */
  liveEmployees?: number;
  avgPEPM: number;
  /** Annualized ARR composition (from the commission ledger). */
  revenueBreakdown?: RevenueBreakdown;
  /**
   * Whether the ledger has accrued this month's commission entitlements.
   * When not "complete", contractedARR / avgPEPM / revenueBreakdown are
   * missing the commission component and must not be shown as final.
   */
  commissionAccrual?: CommissionAccrual;
  openPipeline: number;
  weightedPipeline: number;
  openDealCount: number;
  activeBrokers: number;
  activePE: number;
  /** Set when the commission ledger was unreachable and HubSpot fallback values are shown. */
  ledgerError?: string | null;
  dataQuality?: PipelineDataQuality;
}

export interface SalesDeal {
  id: string;
  name: string;
  stage: string;
  stageOrder: number;
  revenue: number;
  probability: number;
  weightedRevenue: number;
  memberLives: number;
  employeesQuoted: number;
  sourceChannel: string;
  closeDate: string | null;
  effectiveDate: string | null;
  /** Where the revenue figure came from. Ledger is source of truth for won deals. */
  revenueSource: "ledger" | "hubspot-fallback";
  liveEmployees?: number;
  revenueBreakdown?: RevenueBreakdown;
}

export interface StageCount {
  label: string;
  order: number;
  count: number;
  revenue: number;
}

export interface ChannelDeal {
  id: string;
  name: string;
  createdAt: string | null;
  lastActivity: string | null;
}

export interface ChannelStage {
  label: string;
  order: number;
  count: number;
  deals: ChannelDeal[];
}

export interface UnlinkedLedgerEmployer {
  name: string;
  revenue: number;
  liveEmployees: number;
  memberLives: number;
  revenueBreakdown: RevenueBreakdown;
}

export interface PipelineData {
  summary: PipelineSummary;
  sales: {
    open: SalesDeal[];
    won: SalesDeal[];
    /** Ledger employers with revenue whose company record isn't linked to any closed-won deal. */
    unlinkedEmployers?: UnlinkedLedgerEmployer[];
    lost: SalesDeal[];
    future: SalesDeal[];
    stageChart: StageCount[];
  };
  broker: {
    total: number;
    stages: ChannelStage[];
  };
  capital: {
    total: number;
    stages: ChannelStage[];
  };
  portalId: number | null;
  fetchedAt: string;
}
