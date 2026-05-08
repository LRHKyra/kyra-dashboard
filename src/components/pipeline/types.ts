export interface PipelineSummary {
  contractedARR: number;
  totalLives: number;
  avgPEPM: number;
  openPipeline: number;
  weightedPipeline: number;
  openDealCount: number;
  activeBrokers: number;
  activePE: number;
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
}

export interface StageCount {
  label: string;
  order: number;
  count: number;
  revenue: number;
}

export interface ChannelStage {
  label: string;
  order: number;
  count: number;
  deals: string[];
}

export interface PipelineData {
  summary: PipelineSummary;
  sales: {
    open: SalesDeal[];
    won: SalesDeal[];
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
  fetchedAt: string;
}
