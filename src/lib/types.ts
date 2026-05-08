// Session index entry (from sessions.json)
export interface SessionIndexEntry {
  sessionId: string;
  updatedAt: number;
  systemSent?: boolean;
  skillsSnapshot?: {
    prompt: string;
    skills: Array<{ name: string; primaryEnv?: string }>;
    resolvedSkills: Array<{
      name: string;
      filePath?: string;
      baseDir?: string;
      source?: string;
      description?: string;
    }>;
  };
}

// JSONL record types
export interface SessionRecord {
  type: "session";
  version: string;
  sessionId: string;
  timestamp: string;
  cwd?: string;
}

export interface ModelChangeRecord {
  type: "model_change";
  provider: string;
  modelId: string;
}

export interface MessageRecord {
  type: "message";
  id: string;
  parentId?: string;
  timestamp: string;
  message: {
    role: "user" | "assistant" | "toolResult";
    content: ContentBlock[];
    model?: string;
  };
  api?: string;
  provider?: string;
  model?: string;
  usage?: UsageInfo;
  stopReason?: string;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string; thinkingSignature?: string }
  | { type: "toolCall"; name: string; input: Record<string, unknown>; id?: string }
  | { type: "toolResult"; toolCallId: string; content: string; isError?: boolean };

export interface UsageInfo {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  cost?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    total?: number;
  };
}

export type JournalRecord = SessionRecord | ModelChangeRecord | MessageRecord | { type: string; [key: string]: unknown };

// Cost aggregation
export interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  sessionCount: number;
  messageCount: number;
  avgCostPerSession: number;
}

export interface CostTimeseries {
  date: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  sessions: number;
}

export interface CostByModel {
  model: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  messageCount: number;
}

// Tool aggregation
export interface ToolStats {
  name: string;
  count: number;
  errorCount: number;
  errorRate: number;
}

// Memory
export interface MemoryFile {
  path: string;
  source: string;
  size: number;
  chunkCount?: number;
}

export interface MemoryChunk {
  id: string;
  path: string;
  source: string;
  startLine: number;
  endLine: number;
  text: string;
  updatedAt: number;
}

// Cron
export interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: {
    kind: string;
    everyMs?: number;
    anchorMs?: number;
    expr?: string;
    tz?: string;
  };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastDurationMs?: number;
  };
  payload?: {
    kind: string;
    message?: string;
  };
}

// Config
export interface OpenClawConfig {
  [key: string]: unknown;
}

// Skills
export interface Skill {
  name: string;
  description?: string;
  source?: string;
  invocationCount?: number;
}

// Session list item
export interface SessionListItem {
  id: string;
  key: string;
  updatedAt: number;
  type: string;
  channel?: string;
}

// AI Playbook
export interface PlaybookCandidate {
  id: string;
  title: string;
  summary: string;
  claim: string;
  sources: string[];
  sourceTier: number;
  scope: string;
  status: string;
  scores: Record<string, number>;
  averageScore: number | null;
  file: string;
}

export interface PlaybookRunLog {
  timestamp: string;
  run_type: string;
  searches_used: number;
  candidates_created: number;
  candidates_rejected: number;
  candidates_approved: number;
  digest_file: string;
}

export interface PlaybookSourceLog {
  timestamp: string;
  run_type: string;
  query: string;
  results_count: number;
  approved_domain_hits: number;
  candidates_drafted: number;
  rejected_suspicious: number;
}

export interface PlaybookStatus {
  queued: number;
  approved: number;
  rejected: number;
  lastRun: PlaybookRunLog | null;
  recentRuns: PlaybookRunLog[];
  recentSearches: PlaybookSourceLog[];
}

export interface PlaybookDigest {
  date: string;
  type: "nightly" | "weekly";
  content: string;
}

// System status
export interface SystemStatus {
  gatewayRunning: boolean;
  port: number;
  sessionCount: number;
  diskUsage: {
    sessions: string;
    memory: string;
    logs: string;
  } | null;
}
