import { useApi } from "./use-api";
import type { SessionListItem, JournalRecord } from "@/lib/types";

export function useSessions() {
  return useApi<SessionListItem[]>("/api/sessions");
}

export function useSessionDetail(sessionId: string | null, offset: number = 0, limit: number = 50) {
  return useApi<{ records: JournalRecord[]; total: number; offset: number; limit: number }>(
    sessionId ? `/api/sessions/${sessionId}?offset=${offset}&limit=${limit}` : null
  );
}
