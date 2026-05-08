"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  DollarSign,
  Clock,
  Wrench,
  Bot,
  Brain,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  CalendarDays,
  Users,
  Building2,
  Mail,
  Target,
  GitBranch,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CLOUD_NAV_HREFS } from "@/lib/deployment";

const isCloud = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "cloud";

const missionControlItems = [
  { href: "/cos", label: "Chief of Staff", icon: ClipboardList },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/pm", label: "Portfolio", icon: Target },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/team", label: "Team", icon: Users },
  { href: "/office", label: "Office", icon: Building2 },
];

const monitoringItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/costs", label: "Costs", icon: DollarSign },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/skills", label: "Skills", icon: Wrench },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/safety", label: "Safety", icon: Shield },
  { href: "/config", label: "Config", icon: Settings },
  { href: "/outreach", label: "Outreach", icon: Mail },
  { href: "/playbook", label: "Playbook", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleMissionControl = useMemo(
    () =>
      isCloud
        ? missionControlItems.filter((i) =>
            (CLOUD_NAV_HREFS as readonly string[]).includes(i.href),
          )
        : missionControlItems,
    [],
  );

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Brand mark */}
      <div className="flex items-center justify-between px-4 h-12">
        {!collapsed && (
          <span className="text-base font-bold tracking-tight">
            Kyra
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <NavGroup label={collapsed ? undefined : (isCloud ? "Dashboard" : "Mission Control")}>
          {visibleMissionControl.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
              collapsed={collapsed}
            />
          ))}
        </NavGroup>

        {!isCloud && (
          <NavGroup label={collapsed ? undefined : "Monitoring"}>
            {monitoringItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
                collapsed={collapsed}
              />
            ))}
          </NavGroup>
        )}
      </nav>
    </aside>
  );
}

function NavGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      {label && (
        <p className="text-[10px] font-medium text-sidebar-foreground/30 uppercase tracking-widest px-3 mb-2">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-foreground font-medium"
          : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#FFB069]")} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
