"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings2, Table2, GitCompareArrows, History, GitPullRequest, Upload, Download } from "lucide-react";

const navItems = [
  {
    name: "版本清單",
    href: "/",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Table2,
    exact: false,
  },
  {
    name: "版本比較",
    href: "/compare",
    icon: GitCompareArrows,
    exact: false,
  },
  {
    name: "變更歷史",
    href: "/history",
    icon: History,
    exact: false,
  },
  {
    name: "Merge Requests",
    href: "/merge-requests",
    icon: GitPullRequest,
    exact: false,
  },
  {
    name: "Import",
    href: "/import",
    icon: Upload,
    exact: false,
  },
  {
    name: "Export",
    href: "/export",
    icon: Download,
    exact: false,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
        <Settings2 className="h-5 w-5 text-blue-500" />
        <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Sync Model
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-50"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <p className="text-[10px] text-slate-400">Sync Model v1.0</p>
      </div>
    </aside>
  );
}
