# SidebarNav 元件規格

## 概述
側邊導覽列元件，固定於頁面左側，提供主要導航項目。Sprint 1 僅含「版本清單（Dashboard）」一個主要入口。未來 Sprint 擴展匯入、比較等功能。

## Props Interface

```typescript
interface NavItem {
  /** 導航標題 */
  title: string;
  /** 路由路徑 */
  href: string;
  /** lucide-react icon 元件 */
  icon: React.ComponentType<{ className?: string }>;
  /** 是否為目前頁面 */
  isActive?: boolean;
  /** 是否停用（未來功能） */
  disabled?: boolean;
  /** Badge 計數（如版本數量） */
  badge?: number;
}

interface SidebarNavProps {
  /** 導航項目清單 */
  items: NavItem[];
  /** 品牌/產品名稱 */
  title?: string;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 側邊欄容器 | `<aside>` + Tailwind | 固定寬度 240px |
| 導航項目 | `<Button variant="ghost">` | 左對齊 + icon |
| Active 項目 | `<Button variant="secondary">` | 高亮目前頁面 |
| Badge | `<Badge>` | 計數標記 |

## 範例程式碼

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings2 } from "lucide-react";

const defaultItems: NavItem[] = [
  {
    title: "版本清單",
    href: "/",
    icon: LayoutDashboard,
  },
];

export function SidebarNav({
  items = defaultItems,
  title = "Sync Model",
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[240px] flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {/* 品牌 */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
        <Settings2 className="h-5 w-5 text-blue-500" />
        <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </span>
      </div>

      {/* 導航 */}
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const isActive =
            item.isActive ??
            (item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive &&
                    "bg-slate-100 font-medium dark:bg-slate-800",
                  item.disabled && "pointer-events-none opacity-50"
                )}
                disabled={item.disabled}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.title}</span>
                {item.badge !== undefined && (
                  <Badge
                    variant="secondary"
                    className="ml-auto h-5 min-w-[20px] justify-center px-1.5 text-[10px]"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* 底部資訊 */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <p className="text-[10px] text-slate-400">Sync Model v1.0</p>
      </div>
    </aside>
  );
}
```

## 響應式行為

| 斷點 | 行為 |
|------|------|
| < 768px (mobile) | 隱藏側邊欄，改用 hamburger menu + sheet overlay |
| >= 768px | 固定顯示側邊欄 |

## Accessibility

- `<nav>` 語意化導航區塊
- Active 項目使用 `aria-current="page"`
- Disabled 項目使用 `aria-disabled="true"`
- 鍵盤可用 Tab 逐項導航
