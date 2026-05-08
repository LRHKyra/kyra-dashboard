"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const isCloud = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "cloud";

export function Header() {
  const { data } = useSWR(
    isCloud ? null : "/api/system/status",
    fetcher,
    { refreshInterval: 30000 },
  );

  return (
    <header className="h-12 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        {isCloud && (
          <Badge variant="outline" className="text-xs font-normal">
            Pipeline Dashboard
          </Badge>
        )}
        {!isCloud && data && (
          <>
            <Badge variant="outline" className="text-xs gap-1.5 font-normal">
              <Circle
                className={`h-1.5 w-1.5 fill-current ${data.gatewayRunning ? "text-emerald-500" : "text-red-500"}`}
              />
              Gateway {data.gatewayRunning ? "Running" : "Stopped"}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {data.sessionCount} sessions
            </Badge>
          </>
        )}
      </div>
    </header>
  );
}
