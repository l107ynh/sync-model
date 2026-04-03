# EnvironmentTabs 元件規格

## 概述
環境篩選元件，以 dropdown select 方式讓使用者選擇一個或多個環境（dev / prod / dogfood 等）。對應 API 的 `environment_id` 查詢參數。

## Props Interface

```typescript
interface Environment {
  id: string;
  name: string;
}

interface EnvironmentTabsProps {
  /** 可用環境清單（從 API filters.available_environments 取得） */
  environments: Environment[];
  /** 目前選中的環境 ID */
  selectedId?: string;
  /** 選擇變更回呼 */
  onSelect: (environmentId: string | undefined) => void;
  /** 是否停用 */
  disabled?: boolean;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 下拉選單 | `<Select>` | 單選環境 |
| 選項 | `<SelectItem>` | 環境名稱 |
| 全部選項 | `<SelectItem value="all">` | 不篩選環境 |

## 範例程式碼

```tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Server } from "lucide-react";

export function EnvironmentTabs({
  environments,
  selectedId,
  onSelect,
  disabled = false,
}: EnvironmentTabsProps) {
  return (
    <Select
      value={selectedId ?? "all"}
      onValueChange={(value) => onSelect(value === "all" ? undefined : value)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[160px]">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-slate-400" />
          <SelectValue placeholder="Environment" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部環境</SelectItem>
        {environments.map((env) => (
          <SelectItem key={env.id} value={env.id}>
            {env.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## 環境名稱顯示規則

| API name | 顯示文字 |
|----------|---------|
| dev | dev |
| prod | prod |
| dogfood | dogfood |
| 其他 | 原值顯示 |

## Accessibility

- `<Select>` 原生支援鍵盤操作（Enter 開啟、上下鍵選擇、Escape 關閉）
- trigger 有 focus-visible 樣式
- 選中項目有 check icon 標示
