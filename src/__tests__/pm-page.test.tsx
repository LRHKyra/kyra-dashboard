/**
 * Tests for PM page and component rendering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/pm",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) =>
    React.createElement("div", { "data-testid": "markdown" }, children),
}));

// ── Mock SWR for component tests ────────────────────────────────────────

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
  mutate: vi.fn(),
}));

// Mock pm-api hooks to use our mocked SWR
vi.mock("@/lib/pm-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pm-api")>("@/lib/pm-api");
  return {
    ...actual,
    useInitiatives: () => mockUseSWR("initiatives"),
    useInitiative: (id: string | null) =>
      id ? mockUseSWR(`initiative-${id}`) : { data: undefined, isLoading: false, error: undefined },
    useAlerts: () => mockUseSWR("alerts"),
    useLatestDigest: () => mockUseSWR("digest-latest"),
    useDigests: () => mockUseSWR("digests"),
    useDependencies: () => mockUseSWR("dependencies"),
    refreshPortfolio: vi.fn(),
    generateDigest: vi.fn(),
    suggestNextStep: vi.fn(),
    applyNextStep: vi.fn(),
    acknowledgeAlert: vi.fn(),
    resolveAlert: vi.fn(),
    dismissAlert: vi.fn(),
  };
});

// Import components after mocks are set up
import PMPage from "@/app/pm/page";
import { AlertsPanel } from "@/components/pm/alerts-panel";
import { DigestPanel } from "@/components/pm/digest-panel";

describe("PM Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page with tabs", () => {
    mockUseSWR.mockReturnValue({ data: [], isLoading: false, error: undefined });
    render(<PMPage />);

    // Page title + tab trigger both say "Portfolio" — just check the tab-level ones
    expect(screen.getAllByText("Portfolio").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText("Digest")).toBeInTheDocument();
  });

  it("shows loading skeletons when data is loading", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: undefined });
    const { container } = render(<PMPage />);

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no initiatives", () => {
    mockUseSWR.mockReturnValue({ data: [], isLoading: false, error: undefined });
    render(<PMPage />);

    expect(screen.getByText(/no initiatives match/i)).toBeInTheDocument();
  });

  it("renders initiative rows when data is present", () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === "initiatives") {
        return {
          data: [
            {
              initiative_id: "init-001",
              title: "Test Partnership",
              owner: "Lucas",
              priority: "high",
              status: "in_progress",
              risk_level: "yellow",
              forecast_bucket: "at_risk",
              category: "partnership",
              target_date: "2026-06-30",
              ceo_attention_needed: false,
            },
          ],
          isLoading: false,
          error: undefined,
        };
      }
      return { data: undefined, isLoading: false, error: undefined };
    });

    render(<PMPage />);

    expect(screen.getByText("Test Partnership")).toBeInTheDocument();
    expect(screen.getByText("Lucas")).toBeInTheDocument();
  });

  it("shows error state when API fails", () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Connection refused"),
    });

    render(<PMPage />);

    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});

describe("Alerts Panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'No open alerts' when empty", () => {
    mockUseSWR.mockReturnValue({ data: [], isLoading: false, error: undefined });
    render(<AlertsPanel />);

    expect(screen.getByText("No open alerts")).toBeInTheDocument();
  });

  it("renders alert rows when data present", () => {
    mockUseSWR.mockReturnValue({
      data: [
        {
          alert_id: "a-001",
          initiative_id: "init-001",
          alert_type: "risk_escalation",
          severity: "high",
          title: "Risk escalated to red",
          reason: "No progress in 14 days",
          recommended_action: "Review with team",
          rule_ids: "",
          status: "open",
          created_at: "2026-03-07T10:00:00",
          acknowledged_at: null,
          resolved_at: null,
        },
      ],
      isLoading: false,
      error: undefined,
    });

    render(<AlertsPanel />);

    expect(screen.getByText("Risk escalated to red")).toBeInTheDocument();
    expect(screen.getByText("init-001")).toBeInTheDocument();
  });
});

describe("Digest Panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no digest", () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("No digests"),
    });

    render(<DigestPanel />);

    expect(screen.getByText(/no digest generated/i)).toBeInTheDocument();
  });

  it("renders digest markdown when available", () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === "digest-latest") {
        return {
          data: {
            digest_id: "d-001",
            markdown: "# Weekly Digest\nAll good.",
            polished: false,
          },
          isLoading: false,
          error: undefined,
        };
      }
      return { data: [], isLoading: false, error: undefined };
    });

    render(<DigestPanel />);

    expect(screen.getByText("d-001")).toBeInTheDocument();
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
  });
});
