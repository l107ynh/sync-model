# ModelTypeBadge — 模型類型 Badge

## 概述
以顏色區分的 Badge 顯示 Model Type（LLM / ASR / TTS / VLM 等）。基於 shadcn/ui Badge 的自訂 variant。

## Props Interface

```typescript
type ModelType =
  | "LLM"
  | "ASR"
  | "TTS"
  | "VLM"
  | "Retriever"
  | "Reranker"
  | "ObjectDetection"
  | "ObjectRecognition"
  | "Face"
  | "Guardian";

interface ModelTypeBadgeProps {
  /** 模型類型 */
  type: ModelType;
  /** 尺寸 */
  size?: "sm" | "md";
  /** 額外 className */
  className?: string;
}
```

## 色彩對應表

| Type | Background | Text | Solid | Tailwind (light) |
|------|-----------|------|-------|-------------------|
| LLM | `#DBEAFE` | `#1D4ED8` | `#3B82F6` | `bg-blue-100 text-blue-700` |
| ASR | `#DCFCE7` | `#15803D` | `#22C55E` | `bg-green-100 text-green-700` |
| TTS | `#F3E8FF` | `#7E22CE` | `#A855F7` | `bg-purple-100 text-purple-700` |
| VLM | `#FFF7ED` | `#C2410C` | `#F97316` | `bg-orange-100 text-orange-700` |
| Retriever | `#ECFEFF` | `#0E7490` | `#06B6D4` | `bg-cyan-100 text-cyan-700` |
| Reranker | `#FDF2F8` | `#BE185D` | `#EC4899` | `bg-pink-100 text-pink-700` |
| ObjectDetection | `#FEF9C3` | `#A16207` | `#EAB308` | `bg-yellow-100 text-yellow-700` |
| ObjectRecognition | `#CCFBF1` | `#0F766E` | `#14B8A6` | `bg-teal-100 text-teal-700` |
| Face | `#FFE4E6` | `#BE123C` | `#F43F5E` | `bg-rose-100 text-rose-700` |
| Guardian | `#EEF2FF` | `#4338CA` | `#6366F1` | `bg-indigo-100 text-indigo-700` |

## shadcn/ui 映射

| 子元件 | shadcn 元件 | 用途 |
|--------|------------|------|
| Badge | `<Badge>` custom variant | 類型標籤 |

## React + Tailwind 範例

```tsx
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  LLM:               "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  ASR:               "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  TTS:               "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  VLM:               "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  Retriever:         "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  Reranker:          "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  ObjectDetection:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  ObjectRecognition: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  Face:              "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  Guardian:          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
};

interface ModelTypeBadgeProps {
  type: string;
  size?: "sm" | "md";
  className?: string;
}

export function ModelTypeBadge({
  type,
  size = "sm",
  className,
}: ModelTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        TYPE_STYLES[type] ?? "bg-slate-100 text-slate-700",
        className
      )}
    >
      {type}
    </span>
  );
}
```

## 互動行為

| 行為 | 說明 |
|------|------|
| 靜態 | 純顯示，無互動 |
| Dark mode | 背景改深色（如 blue-900），文字改淺色（如 blue-300） |
| 未知類型 | fallback 為 `bg-slate-100 text-slate-700` |

## Accessibility

- 純文字即可傳達資訊（不僅依賴色彩）
- 色彩對比度皆符合 WCAG AA（4.5:1 以上）
