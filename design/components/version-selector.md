# VersionSelector — 版本下拉選擇器

## 概述
用於選擇目前檢視的版本（version），放在設定頁頂部。基於 shadcn/ui Select 元件。

## Props Interface

```typescript
interface VersionSelectorProps {
  /** 版本清單 */
  versions: Version[];
  /** 當前選中的 version ID */
  value: string;
  /** 選擇變更 callback */
  onChange: (versionId: string) => void;
  /** 是否載入中 */
  isLoading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
}

interface Version {
  id: string;
  name: string;
  description: string;
  model_components_count: number;
  created_at: string;
}
```

## shadcn/ui 映射

| 子元件 | shadcn 元件 | 用途 |
|--------|------------|------|
| 容器 | `<Select>` | 下拉選擇 |
| 觸發按鈕 | `<SelectTrigger>` | 顯示當前選中 |
| 選項列表 | `<SelectContent>` | dropdown 面板 |
| 選項 | `<SelectItem>` | 各版本項目 |
| 分隔線 | `<SelectSeparator>` | 視覺分隔 |

## React + Tailwind 範例

```tsx
"use client";

import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "lucide-react";

interface VersionSelectorProps {
  versions: Version[];
  value: string;
  onChange: (versionId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function VersionSelector({
  versions,
  value,
  onChange,
  isLoading,
  disabled,
}: VersionSelectorProps) {
  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Tag className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground">版本</span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="選擇版本..." />
        </SelectTrigger>
        <SelectContent>
          {versions.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">{v.name}</span>
                <span className="text-xs text-muted-foreground">
                  {v.model_components_count} models
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

## 互動行為

| 行為 | 說明 |
|------|------|
| 預設 | 選中最新版本（created_at 最新） |
| 選擇 | 切換版本後觸發頁面重新載入設定資料 |
| 載入中 | 顯示 Skeleton placeholder |
| 版本排序 | 按 created_at 倒序，最新在最上方 |

## Accessibility

- `<SelectTrigger>` 有 `aria-label="選擇版本"`
- 鍵盤可用上下鍵瀏覽、Enter 選擇、Escape 關閉
