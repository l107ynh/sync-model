# ModelTypeBadge 元件規格

## 概述
模型類型標籤元件，以色彩區分不同的 model type。用於表格中 Type 欄位、篩選器中的多選標籤。顏色定義參照 `design/tokens/colors.json` 的 `modelType` 區段。

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

## 色彩映射

| Model Type | Light (bg / text) | Dark (bg / text) | Tailwind Classes |
|-----------|-------------------|-------------------|------------------|
| LLM | #DBEAFE / #1D4ED8 | #1E3A5F / #93C5FD | `bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300` |
| ASR | #DCFCE7 / #15803D | #14532D / #86EFAC | `bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300` |
| TTS | #F3E8FF / #7E22CE | #3B0764 / #D8B4FE | `bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300` |
| VLM | #FFF7ED / #C2410C | #431407 / #FDBA74 | `bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300` |
| Retriever | #CFFAFE / #0E7490 | #164E63 / #67E8F9 | `bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300` |
| Reranker | #FCE7F3 / #BE185D | #500724 / #F9A8D4 | `bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300` |
| ObjectDetection | #FEF9C3 / #A16207 | #422006 / #FDE047 | `bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300` |
| ObjectRecognition | #CCFBF1 / #0F766E | #134E4A / #5EEAD4 | `bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300` |
| Face | #FFE4E6 / #BE123C | #4C0519 / #FDA4AF | `bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300` |
| Guardian | #E0E7FF / #4338CA | #1E1B4B / #A5B4FC | `bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300` |

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 標籤 | `<Badge>` | 自訂 variant |

## 範例程式碼

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MODEL_TYPE_STYLES: Record<ModelType, string> = {
  LLM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ASR: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  TTS: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  VLM: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Retriever:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Reranker:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  ObjectDetection:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  ObjectRecognition:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  Face: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  Guardian:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
};

export function ModelTypeBadge({
  type,
  size = "sm",
  className,
}: ModelTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-mono font-medium tracking-wide",
        size === "sm" && "px-1.5 py-0.5 text-[10px]",
        size === "md" && "px-2 py-0.5 text-xs",
        MODEL_TYPE_STYLES[type],
        className
      )}
    >
      {type}
    </Badge>
  );
}
```

## 使用範例

```tsx
{/* 表格 cell 中 */}
<ModelTypeBadge type="LLM" />
<ModelTypeBadge type="ASR" size="md" />

{/* 篩選器中 */}
<div className="flex flex-wrap gap-1">
  {selectedTypes.map((t) => (
    <ModelTypeBadge key={t} type={t} size="md" />
  ))}
</div>
```

## Accessibility

- 色彩對比度符合 WCAG AA（Light mode 全部 >= 4.5:1）
- `font-mono` 確保技術名稱可辨識
- 純裝飾用途，不需額外 aria 屬性
