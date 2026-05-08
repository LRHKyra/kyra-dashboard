import { useApi } from "./use-api";
import type { CostSummary, CostTimeseries, CostByModel } from "@/lib/types";

export function useCostSummary(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return useApi<CostSummary>(`/api/costs/summary${qs ? `?${qs}` : ""}`);
}

export function useCostTimeseries(granularity: string = "day", from?: string, to?: string) {
  const params = new URLSearchParams({ granularity });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return useApi<CostTimeseries[]>(`/api/costs/timeseries?${params.toString()}`);
}

export function useCostByModel() {
  return useApi<CostByModel[]>("/api/costs/by-model");
}
