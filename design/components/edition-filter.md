# EditionFilter 元件規格

## 概述
Edition 篩選下拉選單，讓使用者選擇特定 edition（std / pro / 2026-pro 等）。對應 API 的 `edition_id` 查詢參數。

## Props Interface

```typescript
interface Edition {
  id: string;
  name: string;
}

interface EditionFilterProps {
  /** 可用 edition 清單（從 API filters.available_editions 取得） */
  editions: Edition[];
  /** 目前選中的 edition ID */
  selectedId?: string;
  /** 選擇變更回呼 */
  onSelect: (editionId: string | undefined) => void;
  /** 是否停用 */
  disabled?: boolean;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 下拉選單 | `<Select>` | 單選 edition |
| 選項 | `<SelectItem>` | edition 名稱 |
| 全部選項 | `<SelectItem value="all">` | 不篩選 edition |

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
import { Tag } from "lucide-react";

export function EditionFilter({
  editions,
  selectedId,
  onSelect,
  disabled = false,
}: EditionFilterProps) {
  return (
    <Select
      value={selectedId ?? "all"}
      onValueChange={(value) => onSelect(value === "all" ? undefined : value)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[140px]">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-400" />
          <SelectValue placeholder="Edition" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部 Edition</SelectItem>
        {editions.map((edition) => (
          <SelectItem key={edition.id} value={edition.id}>
            {edition.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## Accessibility

- `<Select>` 原生支援鍵盤操作
- trigger 有 focus-visible 樣式
- 選中項目有 check icon 標示
