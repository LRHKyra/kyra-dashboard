/**
 * Tests for the stage drill-down dialog and channel deal table.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  StageDealsDialog,
  ChannelDealTable,
} from "@/components/pipeline/stage-deals-dialog";
import type { ChannelDeal } from "@/components/pipeline/types";

const DEALS: ChannelDeal[] = [
  { id: "101", name: "Stale Broker", createdAt: "2025-01-01", lastActivity: null },
  { id: "102", name: "Fresh Broker", createdAt: "2025-06-01", lastActivity: "2026-06-01" },
  { id: "103", name: "Older Broker", createdAt: "2025-03-01", lastActivity: "2026-01-15" },
];

function renderDialog(portalId: number | null) {
  return render(
    <StageDealsDialog open onOpenChange={() => {}} title="Broker Channel — Contacted" count={DEALS.length}>
      <ChannelDealTable deals={DEALS} portalId={portalId} />
    </StageDealsDialog>,
  );
}

describe("StageDealsDialog", () => {
  it("shows the title and deal count", () => {
    renderDialog(48642925);
    expect(screen.getByText("Broker Channel — Contacted")).toBeInTheDocument();
    expect(screen.getByText("3 deals")).toBeInTheDocument();
  });
});

describe("ChannelDealTable", () => {
  it("renders every deal", () => {
    renderDialog(48642925);
    for (const deal of DEALS) {
      expect(screen.getByText(deal.name)).toBeInTheDocument();
    }
  });

  it("links each deal to its HubSpot record when portalId is set", () => {
    renderDialog(48642925);
    const link = screen.getByText("Fresh Broker").closest("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute(
      "href",
      "https://app.hubspot.com/contacts/48642925/record/0-3/102",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders plain text without links when portalId is null", () => {
    renderDialog(null);
    expect(screen.getByText("Fresh Broker").closest("a")).toBeNull();
  });

  it("sorts by last activity descending with nulls last", () => {
    renderDialog(48642925);
    const rows = screen.getAllByRole("row").slice(1); // skip header row
    const names = rows.map((r) => r.querySelector("td")?.textContent);
    expect(names).toEqual(["Fresh Broker", "Older Broker", "Stale Broker"]);
  });
});
