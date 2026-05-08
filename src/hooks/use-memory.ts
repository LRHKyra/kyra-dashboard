import { useApi } from "./use-api";
import type { MemoryFile, MemoryChunk } from "@/lib/types";

export function useMemoryFiles() {
  return useApi<MemoryFile[]>("/api/memory/files");
}

export function useMemoryChunks(path?: string) {
  const params = path ? `?path=${encodeURIComponent(path)}` : "";
  return useApi<MemoryChunk[]>(`/api/memory/chunks${params}`);
}

export function useMemorySearch(query: string | null) {
  return useApi<Array<{ id: string; path: string; text: string; rank: number }>>(
    query ? `/api/memory/search?q=${encodeURIComponent(query)}` : null
  );
}
