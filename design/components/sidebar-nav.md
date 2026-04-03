# SidebarNav — 側邊導航

## 概述
應用程式的主要導航，放在左側。包含 Dashboard、Settings、History 三個主要頁面入口。基於 shadcn/ui NavigationMenu 或自訂 sidebar 元件。

## Props Interface

```typescript
interface SidebarNavProps {
  /** 當前路由 pathname */
  pathname: string;
  /** 是否收合 */
  collapsed?: boolean;
  /** 收合狀態變更 callback */
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}
```

## 導航項目

| 項目 | 路由 | Icon | 說明 |
|------|------|------|------|
| Dashboard | `/` | `LayoutDashboard` | 版本總覽 + 快速連結 |
| Settings | `/settings` | `Settings` | Model 設定表格（本 Sprint 主頁面） |
| History | `/history` | `History` | 變更歷史（Sprint 2） |

## shadcn/ui 映射

| 子元件 | shadcn 元件 | 用途 |
|--------|------------|------|
| Sidebar 容器 | 自訂 `<aside>` | 固定左側 |
| Logo 區 | 自訂 | 品牌識別 |
| Nav Link | `<Button variant="ghost">` | 導航項目 |
| 收合按鈕 | `<Button variant="ghost" size="icon">` | 展開/收合 sidebar |
| Tooltip | `<Tooltip>` | 收合時顯示項目名稱 |

## React + Tailwind 範例

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard, Settings, History,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Settings",  href: "/settings", icon: Settings },
  { label: "History",   href: "/history", icon: History },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-background transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-primary">
            Sync Model
          </span>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-primary mx-auto">SM</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        <TooltipProvider delayDuration={0}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            const link = (
              <Button
                key={item.href}
                variant="ghost"
                asChild
                className={cn(
                  "w-full justify-start gap-3",
                  collapsed && "justify-center px-0",
                  isActive &&
                    "bg-primary/10 text-primary hover:bg-primary/15"
                )}
              >
                <Link href={item.href}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </Link>
              </Button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </TooltipProvider>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "展開側邊欄" : "收合側邊欄"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
```

## 佈局尺寸

| 狀態 | 寬度 | 說明 |
|------|------|------|
| 展開 | 256px (`w-64`) | 顯示 icon + label |
| 收合 | 64px (`w-16`) | 只顯示 icon，hover 顯示 tooltip |

## 互動行為

| 行為 | 說明 |
|------|------|
| 點擊導航 | 跳轉對應路由，當前頁 highlight |
| 收合/展開 | 點擊底部按鈕，sidebar 動畫過渡 |
| Active 狀態 | 背景 `primary/10`，文字 `primary` |
| 響應式 | < md 時 sidebar 隱藏，改用漢堡選單（未來 Sprint） |

## Accessibility

- `<nav>` 有 `aria-label="主導航"`
- 當前頁面的 link 有 `aria-current="page"`
- 收合按鈕有明確 `aria-label`
- 鍵盤 Tab 可依序瀏覽所有導航項目
