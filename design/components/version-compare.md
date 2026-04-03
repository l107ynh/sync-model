# VersionCompare 元件規格

## 概述
版本比較元件，提供兩個版本選擇器（Version A / Version B）和比較按鈕，觸發後呈現差異摘要與詳細比較列表。

## Props Interface

```typescript
interface VersionCompareProps {
  /** 可選版本清單 */
  versions: VersionItem[];
  /** 預設選取的 Version A id */
  defaultVersionAId?: string;
  /** 預設選取的 Version B id */
  defaultVersionBId?: string;
}

interface VersionItem {
  id: string;
  name: string;
  created_at: string;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| Version 選擇器 | `<Select>` | 下拉選取版本 |
| 交換按鈕 | `<Button variant="ghost" size="icon">` | ArrowLeftRight icon |
| 比較按鈕 | `<Button>` | "比較" |
| 環境篩選 | `<Select>` | 選填 |
| Edition 篩選 | `<Select>` | 選填 |
| 摘要卡片 | `<Card>` | 4 張：Added / Removed / Modified / Unchanged |
| 差異列表 | `<Card>` + `<Collapsible>` | 按 change_type 分組 |

## 頁面結構

```
┌──────────────────────────────────────────────────────────────┐
│  版本比較                                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Version A      [↔]      Version B     [比較]         │    │
│  │ [v3.1 ▼]                [v3.2 ▼]                     │    │
│  │                                                      │    │
│  │ 篩選: [Environment ▼]  [Edition ▼]                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ 摘要 ──────────────────────────────────────────────┐    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐     │    │
│  │  │ +5     │ │ -2     │ │ ~10    │ │ =37      │     │    │
│  │  │ Added  │ │Removed │ │Modified│ │Unchanged │     │    │
│  │  │ (綠)   │ │ (紅)   │ │ (黃)   │ │ (灰)     │     │    │
│  │  └────────┘ └────────┘ └────────┘ └──────────┘     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ Modified (10) ─────────────────────────────────────┐    │
│  │  ┌ asr-general ─ ASR ─ prod ─ pro ───────────────┐ │    │
│  │  │  replica: 2 → 3                                │ │    │
│  │  │  gpu_mem: 0.85 → 0.9                           │ │    │
│  │  └────────────────────────────────────────────────┘ │    │
│  │  ┌ llm-medium ─ LLM ─ prod ─ pro ────────────────┐ │    │
│  │  │  [▸ 展開]                                      │ │    │
│  │  └────────────────────────────────────────────────┘ │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ Added (5) ─────────────────────────────────────────┐    │
│  │  ...                                                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ Removed (2) ───────────────────────────────────────┐    │
│  │  ...                                                 │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## 摘要卡片顏色

| 類型 | 背景 | 文字 | Icon |
|------|------|------|------|
| Added | `bg-green-50 dark:bg-green-900/20` | `text-green-700` | Plus |
| Removed | `bg-red-50 dark:bg-red-900/20` | `text-red-700` | Minus |
| Modified | `bg-amber-50 dark:bg-amber-900/20` | `text-amber-700` | ArrowLeftRight |
| Unchanged | `bg-slate-50 dark:bg-slate-800` | `text-slate-500` | Equal |

## 範例程式碼

```tsx
"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeftRight,
  Plus,
  Minus,
  Equal,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DiffViewer } from "@/components/diff-viewer";

export function VersionCompare({ versions, defaultVersionAId, defaultVersionBId }: VersionCompareProps) {
  const [versionAId, setVersionAId] = useState(defaultVersionAId ?? "");
  const [versionBId, setVersionBId] = useState(defaultVersionBId ?? "");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function swapVersions() {
    setVersionAId(versionBId);
    setVersionBId(versionAId);
  }

  async function handleCompare() {
    if (!versionAId || !versionBId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/compare?version_a_id=${versionAId}&version_b_id=${versionBId}`
      );
      setResult(await res.json());
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 選擇器列 */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Version A（基準）
          </label>
          <Select value={versionAId} onValueChange={setVersionAId}>
            <SelectTrigger><SelectValue placeholder="選擇版本" /></SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>v{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="ghost" size="icon" onClick={swapVersions}>
          <ArrowLeftRight className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Version B（比較）
          </label>
          <Select value={versionBId} onValueChange={setVersionBId}>
            <SelectTrigger><SelectValue placeholder="選擇版本" /></SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>v{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCompare} disabled={!versionAId || !versionBId || isLoading}>
          {isLoading ? "比較中..." : "比較"}
        </Button>
      </div>

      {/* 摘要卡片 */}
      {result && (
        <div className="grid grid-cols-4 gap-4">
          <SummaryCard icon={Plus} label="Added" count={result.summary.added} color="green" />
          <SummaryCard icon={Minus} label="Removed" count={result.summary.removed} color="red" />
          <SummaryCard icon={ArrowLeftRight} label="Modified" count={result.summary.modified} color="amber" />
          <SummaryCard icon={Equal} label="Unchanged" count={result.summary.unchanged} color="slate" />
        </div>
      )}

      {/* 差異列表 */}
      {result?.changes && (
        <ChangesList changes={result.changes} />
      )}
    </div>
  );
}
```

## Accessibility

- 版本選擇器具有 label 關聯
- 交換按鈕具有 `aria-label="交換版本"`
- 摘要卡片使用 `role="status"` 通知比較結果
- 差異列表使用 heading 分組（Added / Removed / Modified）
