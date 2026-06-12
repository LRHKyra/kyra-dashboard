"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { compareNullable, dateValue, fmtDate } from "./format";
import type { ChannelDeal } from "./types";

// ---------------------------------------------------------------------------
// Generic drill-down dialog shell for stage clicks on pipeline charts
// ---------------------------------------------------------------------------

export function StageDealsDialog({
  open,
  onOpenChange,
  title,
  count,
  maxWidthClass = "sm:max-w-2xl",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  count: number;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidthClass}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {title}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {count} {count === 1 ? "deal" : "deals"}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Deal table for broker / PE channel deals
// ---------------------------------------------------------------------------

function hubspotDealUrl(portalId: number, dealId: string) {
  return `https://app.hubspot.com/contacts/${portalId}/record/0-3/${dealId}`;
}

export function ChannelDealTable({
  deals,
  portalId,
}: {
  deals: ChannelDeal[];
  portalId: number | null;
}) {
  // Most recent activity first; deals with no activity sink to the bottom
  const sortedDeals = useMemo(
    () =>
      [...deals].sort((a, b) =>
        compareNullable(dateValue(a.lastActivity), dateValue(b.lastActivity), "desc"),
      ),
    [deals],
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Deal</TableHead>
          <TableHead className="text-xs whitespace-nowrap">Created</TableHead>
          <TableHead className="text-xs whitespace-nowrap">Last Activity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedDeals.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="text-sm font-medium">
              {portalId ? (
                <a
                  href={hubspotDealUrl(portalId, d.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  {d.name}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ) : (
                d.name
              )}
            </TableCell>
            <TableCell className="text-sm whitespace-nowrap">{fmtDate(d.createdAt)}</TableCell>
            <TableCell className="text-sm whitespace-nowrap">{fmtDate(d.lastActivity)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
