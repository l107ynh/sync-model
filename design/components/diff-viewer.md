# DiffViewer 元件規格

## 概述
JSON 物件差異顯示元件，以顏色標示新增、刪除、修改的欄位。支援 inline (compact) 和 side-by-side (expanded) 兩種模式。整合 `json-diff-kit` 進行深層比較。

## Props Interface

```typescript
interface DiffViewerProps {
  /** 舊物件 */
  oldObj: Record<string, unknown>;
  /** 新物件 */
  newObj: Record<string, unknown>;
  /** 顯示模式：inline 或 side-by-side */
  mode?: "inline" | "side-by-side";
  /** 是否展開巢狀物件 */
  expandNested?: boolean;
}
```

## 顏色標示

| 變更類型 | Light Mode | Dark Mode | CSS Variable |
|---------|-----------|-----------|-------------|
| 新增 (added) | `bg-green-50 text-green-700 border-green-200` | `bg-green-900/20 text-green-300 border-green-800` | `--diff-added` |
| 刪除 (removed) | `bg-red-50 text-red-700 border-red-200` | `bg-red-900/20 text-red-300 border-red-800` | `--diff-removed` |
| 修改 (changed) | `bg-amber-50 text-amber-700 border-amber-200` | `bg-amber-900/20 text-amber-300 border-amber-800` | `--diff-modified` |
| 未變更 | `text-slate-500` | `text-slate-400` | - |

## Inline 模式 (預設)

```
┌────────────────────────────────────────────┐
│ deploy                                     │
│   ▪ false → true                    [修改] │
│                                            │
│ replica                                    │
│   ▪ 1 → 3                          [修改] │
│                                            │
│ gpu_memory_utilization                     │
│   ▪ 0.85 → 0.9                     [修改] │
│                                            │
│ extra_settings.max_tokens                  │
│   ▪ (無) → 4096                     [新增] │
└────────────────────────────────────────────┘
```

## Side-by-Side 模式

```
┌────────────────────────┬────────────────────────┐
│ Version A (舊)         │ Version B (新)         │
├────────────────────────┼────────────────────────┤
│ deploy: false          │ deploy: true           │
│ replica: 1             │ replica: 3             │
│ gpu_mem: 0.85          │ gpu_mem: 0.9           │
│                        │ max_tokens: 4096       │
└────────────────────────┴────────────────────────┘
```

## 依賴

- [`json-diff-kit`](https://github.com/nicolo-ribaudo/json-diff-kit) — 深層 JSON diff 計算
- 若不引入外部套件，可用內建簡易 diff：`Object.keys` 比對 + `JSON.stringify` 深比較

## 範例程式碼

```tsx
"use client";

import { cn } from "@/lib/utils";

interface DiffEntry {
  key: string;
  type: "added" | "removed" | "changed" | "unchanged";
  oldValue?: unknown;
  newValue?: unknown;
}

function computeDiffEntries(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): DiffEntry[] {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const entries: DiffEntry[] = [];

  for (const key of allKeys) {
    const hasOld = key in oldObj;
    const hasNew = key in newObj;

    if (!hasOld && hasNew) {
      entries.push({ key, type: "added", newValue: newObj[key] });
    } else if (hasOld && !hasNew) {
      entries.push({ key, type: "removed", oldValue: oldObj[key] });
    } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      entries.push({ key, type: "changed", oldValue: oldObj[key], newValue: newObj[key] });
    }
    // unchanged 不顯示
  }

  return entries;
}

const typeStyles: Record<string, string> = {
  added: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
  removed: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
  changed: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
};

const typeLabels: Record<string, string> = {
  added: "新增",
  removed: "刪除",
  changed: "修改",
};

const typeTextStyles: Record<string, string> = {
  added: "text-green-700 dark:text-green-300",
  removed: "text-red-700 dark:text-red-300",
  changed: "text-amber-700 dark:text-amber-300",
};

export function DiffViewer({ oldObj, newObj, mode = "inline" }: DiffViewerProps) {
  const entries = computeDiffEntries(oldObj, newObj);

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">無差異</p>;
  }

  if (mode === "inline") {
    return (
      <div className="space-y-2" data-testid="diff-viewer">
        {entries.map((entry) => (
          <div
            key={entry.key}
            className={cn("rounded-md border p-2", typeStyles[entry.type])}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-medium">{entry.key}</span>
              <span className={cn("text-xs", typeTextStyles[entry.type])}>
                {typeLabels[entry.type]}
              </span>
            </div>
            <div className="mt-1 text-sm">
              {entry.type === "added" && (
                <span className="text-green-700 dark:text-green-300">
                  (無) → {JSON.stringify(entry.newValue)}
                </span>
              )}
              {entry.type === "removed" && (
                <span className="text-red-700 dark:text-red-300">
                  {JSON.stringify(entry.oldValue)} → (已刪除)
                </span>
              )}
              {entry.type === "changed" && (
                <span className="text-amber-700 dark:text-amber-300">
                  {JSON.stringify(entry.oldValue)} → {JSON.stringify(entry.newValue)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // side-by-side mode
  return (
    <div className="grid grid-cols-2 gap-px rounded-lg border overflow-hidden" data-testid="diff-viewer">
      <div className="bg-red-50/50 p-3 dark:bg-red-900/10">
        <p className="mb-2 text-xs font-medium text-slate-500">舊值</p>
        {entries.map((entry) => (
          <div key={entry.key} className="py-1 text-sm font-mono">
            <span className="text-slate-500">{entry.key}: </span>
            <span className={cn(entry.type !== "added" ? "text-red-700 dark:text-red-300" : "text-slate-300")}>
              {entry.type === "added" ? "—" : JSON.stringify(entry.oldValue)}
            </span>
          </div>
        ))}
      </div>
      <div className="bg-green-50/50 p-3 dark:bg-green-900/10">
        <p className="mb-2 text-xs font-medium text-slate-500">新值</p>
        {entries.map((entry) => (
          <div key={entry.key} className="py-1 text-sm font-mono">
            <span className="text-slate-500">{entry.key}: </span>
            <span className={cn(entry.type !== "removed" ? "text-green-700 dark:text-green-300" : "text-slate-300")}>
              {entry.type === "removed" ? "—" : JSON.stringify(entry.newValue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Accessibility

- 差異類型以文字標示（新增/刪除/修改），不僅依賴顏色
- 使用 `font-mono` 確保數值對齊
- 空差異顯示文字提示
