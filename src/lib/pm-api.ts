/**
 * PM API client — thin typed layer over the Kyra PM HTTP API.
 *
 * All reads use SWR hooks (cached, auto-revalidate).
 * All writes are plain async functions that call mutate() after success.
 */

import useSWR, { mutate } from "swr";

const PM_BASE = "/api/pm";

// ── Types ──────────────────────────────────────────────────────────────────

export interface InitiativeSummary {
  initiative_id: string;
  title: string;
  owner: string;
  priority: string;
  status: string;
  risk_level: string;
  forecast_bucket: string;
  category: string;
  target_date: string | null;
  ceo_attention_needed: boolean;
}

export interface Blocker {
  blocker_id: string;
  description: string;
  reported_by: string;
  resolved: boolean;
}

export interface InitiativeDetail extends InitiativeSummary {
  description: string;
  confidence_level: string;
  forecast_date: string | null;
  next_step_type: string;
  next_step_text: string;
  next_step_owner: string;
  next_step_due_date: string | null;
  blocker_summary: string;
  blockers: Blocker[];
  ceo_attention_reason: string;
  stakeholders: string[];
  created_at: string | null;
  updated_at: string | null;
  last_meaningful_movement_at: string | null;
}

export interface AlertOut {
  alert_id: string;
  initiative_id: string;
  alert_type: string;
  severity: string;
  title: string;
  reason: string;
  recommended_action: string;
  rule_ids: string;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export interface DigestSummary {
  digest_id: string;
  generated_at: string;
  total_active: number;
  red_count: number;
  blocked_count: number;
  ceo_attention_count: number;
}

export interface DigestOut {
  digest_id: string;
  markdown: string;
  polished: boolean;
}

export interface NextStepCandidate {
  action: string;
  owner: string;
  rationale: string;
}

export interface NextStepSuggestion {
  source: string;
  model_used: string;
  suggestions: NextStepCandidate[];
  call_id: string;
}

export interface RiskFinding {
  factor: string;
  severity: string;
  reason: string;
}

export interface RiskAssessment {
  risk_level: string;
  findings: RiskFinding[];
}

export interface ForecastFinding {
  factor: string;
  direction: string;
  weight: number;
  reason: string;
}

export interface ForecastAssessment {
  forecast_bucket: string;
  findings: ForecastFinding[];
}

export interface DependencyOut {
  dependency_id: string;
  upstream_id: string;
  downstream_id: string;
  dependency_type: string;
  status: string;
  description: string;
  created_at: string;
  resolved_at: string | null;
}

export interface SignalOut {
  signal_id: string;
  initiative_id: string;
  signal_type: string;
  source: string;
  actor: string;
  summary: string;
  evidence: string;
  timestamp: string | null;
  granola_note_id: string | null;
}

export interface SupportingSignal {
  signal_id: string;
  signal_type: string;
  summary: string;
  timestamp: string;
  source_note: string;
}

export interface PortfolioSummaryEntry {
  initiative_id: string;
  title: string;
  owner: string;
  status: string;
  risk_level: string;
  forecast_bucket: string;
  reason: string;
  rule_ids: string[];
  supporting_signals: SupportingSignal[];
  latest_evidence_at: string | null;
  signal_context: string;
}

export interface PortfolioSummaryData {
  generated_at: string;
  initiative_count: number;
  sections: Record<string, PortfolioSummaryEntry[]>;
}

export interface SignalRollup {
  initiative_id: string;
  signal_counts: Record<string, number>;
  latest_signal_at: string | null;
  days_since_last_signal: number | null;
  pending_unmatched_count: number;
}

export interface UnmatchedSignal {
  id: number;
  source: string;
  external_id: string;
  signal_type: string;
  actor: string;
  timestamp: string;
  title: string;
  summary: string;
  evidence: string;
  imported_at: string;
  resolved: number;
  resolved_initiative_id: string | null;
  match_method: string;
  match_confidence: string;
  match_reasons: string[];
  suggested_initiative_id: string | null;
  suggested_initiative_title: string;
  resolved_initiative_title: string;
  source_note_id: string;
  source_note_title: string;
  meeting_date: string;
  attendees: string[];
  resolution_method: string | null;
  resolved_at: string | null;
}

export interface UnmatchedListResponse {
  items: UnmatchedSignal[];
  count: number;
}

export interface PortfolioRefreshOut {
  initiatives_scanned: number;
  initiatives_updated: number;
  signals_applied: number;
  risks_changed: number;
  forecasts_changed: number;
  stale_count: number;
  ceo_attention_count: number;
  errors: string[];
}

// ── Fetcher ────────────────────────────────────────────────────────────────

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json();
};

// ── Read hooks ─────────────────────────────────────────────────────────────

export function useInitiatives(params?: { active_only?: boolean }) {
  const qs = params?.active_only ? "?active_only=true" : "";
  return useSWR<InitiativeSummary[]>(`${PM_BASE}/initiatives${qs}`, fetcher, {
    revalidateOnFocus: false,
  });
}

export function useInitiative(id: string | null) {
  return useSWR<InitiativeDetail>(
    id ? `${PM_BASE}/initiatives/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useAlerts(openOnly = true) {
  return useSWR<AlertOut[]>(
    `${PM_BASE}/alerts?open_only=${openOnly}`,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useLatestDigest() {
  return useSWR<DigestOut>(`${PM_BASE}/digests/latest`, fetcher, {
    revalidateOnFocus: false,
  });
}

export function useDigests(limit = 10) {
  return useSWR<DigestSummary[]>(
    `${PM_BASE}/digests?limit=${limit}`,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function usePortfolioSummary() {
  return useSWR<PortfolioSummaryData>(
    `${PM_BASE}/portfolio/summary`,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useSignalRollup(initiativeId: string | null) {
  return useSWR<SignalRollup>(
    initiativeId ? `${PM_BASE}/initiatives/${initiativeId}/signal-rollup` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useSignals(initiativeId: string | null, limit = 20) {
  return useSWR<SignalOut[]>(
    initiativeId
      ? `${PM_BASE}/initiatives/${initiativeId}/signals?limit=${limit}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export interface UnmatchedCountResponse {
  total: number;
  [signalType: string]: number;
}

export function useUnmatchedCount() {
  return useSWR<UnmatchedCountResponse>(
    `${PM_BASE}/unmatched-signals/count`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 30000 }
  );
}

export function useUnmatchedSignals(resolved = false) {
  return useSWR<UnmatchedListResponse>(
    `${PM_BASE}/unmatched-signals?resolved=${resolved}`,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useDependencies(initiativeId?: string) {
  const qs = initiativeId ? `?initiative_id=${initiativeId}` : "";
  return useSWR<DependencyOut[]>(`${PM_BASE}/dependencies${qs}`, fetcher, {
    revalidateOnFocus: false,
  });
}

// ── Write actions ──────────────────────────────────────────────────────────

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${PM_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export async function refreshPortfolio(): Promise<PortfolioRefreshOut> {
  const result = await post<PortfolioRefreshOut>("/portfolio/refresh");
  mutate((key: string) => typeof key === "string" && key.startsWith(`${PM_BASE}/`));
  return result;
}

export async function generateDigest(
  polish = false
): Promise<DigestOut> {
  const result = await post<DigestOut>("/digests/generate", { polish });
  mutate((key: string) => typeof key === "string" && key.includes("/digests"));
  return result;
}

export async function suggestNextStep(
  initiativeId: string
): Promise<NextStepSuggestion> {
  return post<NextStepSuggestion>(
    `/initiatives/${initiativeId}/suggest-next-step`
  );
}

export async function applyNextStep(
  initiativeId: string,
  index: number
): Promise<{ applied_action: string; applied_owner: string }> {
  const result = await post<{ applied_action: string; applied_owner: string }>(
    `/initiatives/${initiativeId}/apply-next-step`,
    { suggestion_index: index }
  );
  mutate((key: string) => typeof key === "string" && key.includes(initiativeId));
  return result;
}

export async function assessRisk(
  initiativeId: string
): Promise<RiskAssessment> {
  return post<RiskAssessment>(`/initiatives/${initiativeId}/assess-risk`);
}

export async function assessForecast(
  initiativeId: string
): Promise<ForecastAssessment> {
  return post<ForecastAssessment>(
    `/initiatives/${initiativeId}/assess-forecast`
  );
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await post(`/alerts/${alertId}/acknowledge`);
  mutate((key: string) => typeof key === "string" && key.includes("/alerts"));
}

export async function resolveAlert(alertId: string): Promise<void> {
  await post(`/alerts/${alertId}/resolve`);
  mutate((key: string) => typeof key === "string" && key.includes("/alerts"));
}

export async function dismissAlert(alertId: string): Promise<void> {
  await post(`/alerts/${alertId}/dismiss`);
  mutate((key: string) => typeof key === "string" && key.includes("/alerts"));
}

export async function resolveUnmatched(
  unmatchedId: number,
  initiativeId: string
): Promise<{ resolved: boolean; signal_id: string }> {
  const result = await post<{ resolved: boolean; signal_id: string }>(
    `/unmatched-signals/${unmatchedId}/resolve`,
    { initiative_id: initiativeId }
  );
  mutate((key: string) =>
    typeof key === "string" && key.includes("/unmatched-signals")
  );
  return result;
}

export async function rejectUnmatched(
  unmatchedId: number,
  reason = ""
): Promise<{ rejected: boolean }> {
  const result = await post<{ rejected: boolean }>(
    `/unmatched-signals/${unmatchedId}/reject`,
    { reason }
  );
  mutate((key: string) =>
    typeof key === "string" && key.includes("/unmatched-signals")
  );
  return result;
}
