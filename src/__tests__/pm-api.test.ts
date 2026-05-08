/**
 * Tests for the PM API client layer.
 *
 * These test the fetch logic, URL construction, and error handling
 * without needing the actual PM backend.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock SWR to avoid hook issues in non-component tests
vi.mock("swr", () => {
  const mutate = vi.fn();
  return {
    default: vi.fn(),
    mutate,
  };
});

describe("PM API write actions", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("refreshPortfolio calls POST /api/pm/portfolio/refresh", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          initiatives_scanned: 5,
          initiatives_updated: 3,
          signals_applied: 2,
          risks_changed: 1,
          forecasts_changed: 0,
          stale_count: 0,
          ceo_attention_count: 1,
          errors: [],
        }),
    });

    const { refreshPortfolio } = await import("@/lib/pm-api");
    const result = await refreshPortfolio();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/pm/portfolio/refresh",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.initiatives_scanned).toBe(5);
  });

  it("generateDigest calls POST /api/pm/digests/generate", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          digest_id: "d-123",
          markdown: "# Digest",
          polished: false,
        }),
    });

    const { generateDigest } = await import("@/lib/pm-api");
    const result = await generateDigest(false);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/pm/digests/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ polish: false }),
      })
    );
    expect(result.digest_id).toBe("d-123");
  });

  it("suggestNextStep calls correct URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          source: "deterministic",
          model_used: "",
          suggestions: [
            { action: "Follow up", owner: "Lucas", rationale: "Overdue" },
          ],
          call_id: "",
        }),
    });

    const { suggestNextStep } = await import("@/lib/pm-api");
    const result = await suggestNextStep("init-abc");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/pm/initiatives/init-abc/suggest-next-step",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.suggestions).toHaveLength(1);
  });

  it("acknowledgeAlert calls correct URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ acknowledged: true }),
    });

    const { acknowledgeAlert } = await import("@/lib/pm-api");
    await acknowledgeAlert("alert-001");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/pm/alerts/alert-001/acknowledge",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("resolveAlert calls correct URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ resolved: true }),
    });

    const { resolveAlert } = await import("@/lib/pm-api");
    await resolveAlert("alert-002");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/pm/alerts/alert-002/resolve",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("dismissAlert calls correct URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ dismissed: true }),
    });

    const { dismissAlert } = await import("@/lib/pm-api");
    await dismissAlert("alert-003");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/pm/alerts/alert-003/dismiss",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("applyNextStep sends suggestion_index", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          applied_action: "Send email",
          applied_owner: "Lucas",
        }),
    });

    const { applyNextStep } = await import("@/lib/pm-api");
    const result = await applyNextStep("init-xyz", 2);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/pm/initiatives/init-xyz/apply-next-step",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ suggestion_index: 2 }),
      })
    );
    expect(result.applied_action).toBe("Send email");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "Not found" }),
    });

    const { suggestNextStep } = await import("@/lib/pm-api");
    await expect(suggestNextStep("init-bad")).rejects.toThrow("Not found");
  });

  it("handles network error in fetch", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { refreshPortfolio } = await import("@/lib/pm-api");
    await expect(refreshPortfolio()).rejects.toThrow("Network error");
  });
});
