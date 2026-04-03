# EditionFilter — Edition 多選 Chip Filter

## 概述
以 Chip / Toggle 形式進行 Edition 多選篩選（std / pro / pro2026 / ...）。基於 shadcn/ui Badge + Toggle 元件組合。

## Props Interface

```typescript
interface EditionFilterProps {
  /** 可用的 edition 清單 */
  editions: Edition[];
  /** 當前選中的 edition ID 集合 */
  selected: Set<string>;
  /** 選擇變更 callback */
  onChange: (selected: Set<string>) => void;
}

interface Edition {
  id: string;
  name: string;
}
```

## shadcn/ui 映射

| 子元件 | shadcn 元件 | 用途 |
|--------|------------|------|
| Chip 容器 | `<Toggle>` | 可切換狀態的按鈕 |
| 視覺樣式 | `<Badge>` 風格 | 圓角 pill 外觀 |

## React + Tailwind 範例

```tsx
"use client";

import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

interface EditionFilterProps {
  editions: Edition[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function EditionFilter({
  editions,
  selected,
  onChange,
}: EditionFilterProps) {
  const handleToggle = (editionId: string) => {
    const next = new Set(selected);
    if (next.has(editionId)) {
      next.delete(editionId);
    } else {
      next.add(editionId);
    }
    onChange(next);
  };

  const allSelected = selected.size === 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground mr-1">
        Edition
      </span>

      <Toggle
        pressed={allSelected}
        onPressedChange={() => onChange(new Set())}
        size="sm"
        className={cn(
          "h-7 rounded-full px-3 text-xs",
          allSelected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        全部
      </Toggle>

      {editions.map((edition) => {
        const isActive = selected.has(edition.id);
        return (
          <Toggle
            key={edition.id}
            pressed={isActive}
            onPressedChange={() => handleToggle(edition.id)}
            size="sm"
            className={cn(
              "h-7 rounded-full px-3 text-xs transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {edition.name}
          </Toggle>
        );
      })}
    </div>
  );
}
```

## 互動行為

| 行為 | 說明 |
|------|------|
| 預設 | 「全部」選中（selected 為空集合，代表不篩選） |
| 單擊 Chip | Toggle 該 edition 的選中狀態 |
| 點「全部」 | 清除所有選中，回到不篩選狀態 |
| 多選 | 可同時選中多個 edition（AND 關係） |

## Accessibility

- 每個 Toggle 有 `aria-pressed` 狀態
- 鍵盤 Space / Enter 可切換
