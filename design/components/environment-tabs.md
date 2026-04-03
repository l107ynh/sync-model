# EnvironmentTabs — 環境 Tab 切換

## 概述
以 Tab 形式切換不同部署環境（dev / stage / prod / on-prem / dogfood），基於 shadcn/ui Tabs 元件。選擇環境後篩選表格資料。

## Props Interface

```typescript
interface EnvironmentTabsProps {
  /** 可用的環境清單 */
  environments: Environment[];
  /** 當前選中的環境 ID，null 表示「全部」 */
  value: string | null;
  /** 切換環境 callback */
  onChange: (environmentId: string | null) => void;
  /** 各環境的 model 數量 (optional) */
  counts?: Record<string, number>;
}

interface Environment {
  id: string;
  name: string;
}
```

## shadcn/ui 映射

| 子元件 | shadcn 元件 | 用途 |
|--------|------------|------|
| 容器 | `<Tabs>` | Tab 群組 |
| Tab 列 | `<TabsList>` | 水平排列 |
| Tab 項目 | `<TabsTrigger>` | 各環境 |

## 環境色彩對應

| 環境 | Tailwind class (active) | 色碼 |
|------|------------------------|------|
| dev | `border-blue-500 text-blue-600` | #3B82F6 |
| stage | `border-amber-500 text-amber-600` | #F59E0B |
| prod | `border-red-500 text-red-600` | #EF4444 |
| on-prem | `border-violet-500 text-violet-600` | #8B5CF6 |
| dogfood | `border-cyan-500 text-cyan-600` | #06B6D4 |

## React + Tailwind 範例

```tsx
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ENV_COLORS: Record<string, string> = {
  dev:      "data-[state=active]:border-blue-500 data-[state=active]:text-blue-600",
  stage:    "data-[state=active]:border-amber-500 data-[state=active]:text-amber-600",
  prod:     "data-[state=active]:border-red-500 data-[state=active]:text-red-600",
  "on-prem":"data-[state=active]:border-violet-500 data-[state=active]:text-violet-600",
  dogfood:  "data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-600",
};

interface EnvironmentTabsProps {
  environments: Environment[];
  value: string | null;
  onChange: (environmentId: string | null) => void;
  counts?: Record<string, number>;
}

export function EnvironmentTabs({
  environments,
  value,
  onChange,
  counts,
}: EnvironmentTabsProps) {
  return (
    <Tabs
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? null : v)}
    >
      <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
        <TabsTrigger
          value="all"
          className="rounded-md border border-transparent px-3 py-1.5 text-sm data-[state=active]:border-slate-900 data-[state=active]:text-slate-900"
        >
          全部
          {counts && (
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {Object.values(counts).reduce((a, b) => a + b, 0)}
            </Badge>
          )}
        </TabsTrigger>

        {environments.map((env) => (
          <TabsTrigger
            key={env.id}
            value={env.id}
            className={cn(
              "rounded-md border border-transparent px-3 py-1.5 text-sm capitalize",
              ENV_COLORS[env.name] ?? ""
            )}
          >
            {env.name}
            {counts?.[env.id] != null && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {counts[env.id]}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
```

## 互動行為

| 行為 | 說明 |
|------|------|
| 預設 | 「全部」Tab 被選中 |
| 切換 | 切換環境後觸發表格篩選 |
| 計數 | 各 Tab 右上角顯示該環境的 model 數量 |
| 響應式 | 小螢幕時 Tab 自動換行 |

## Accessibility

- `TabsTrigger` 自動帶 `role="tab"` 和 `aria-selected`
- 鍵盤左右鍵切換 Tab
