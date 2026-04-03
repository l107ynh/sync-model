# HistoryTimeline 元件規格

## 概述
變更歷史時間軸元件，以垂直時間軸呈現 model 設定的變更記錄。每筆記錄可展開查看完整 diff。

## Props Interface

```typescript
interface HistoryTimelineProps {
  /** 歷史記錄列表 */
  items: HistoryItem[];
  /** 是否載入中 */
  isLoading?: boolean;
  /** 載入更多回呼（infinite scroll 或分頁） */
  onLoadMore?: () => void;
  /** 是否還有更多資料 */
  hasMore?: boolean;
}

interface HistoryItem {
  id: string;
  model_setting?: {
    id: string;
    model_component: { name: string; type: string };
    environment: { name: string };
    edition: { name: string };
  };
  changed_by: string;
  change_type: "CREATE" | "UPDATE" | "DELETE";
  diff: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  created_at: string;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 卡片 | `<Card>` + `<CardContent>` | 每筆歷史記錄 |
| 類型標籤 | `<Badge>` | CREATE=綠, UPDATE=藍, DELETE=紅 |
| 環境標籤 | `<Badge variant="outline">` | 顯示 env + edition |
| 展開/收合 | `<Collapsible>` + `<CollapsibleTrigger>` + `<CollapsibleContent>` | 展開顯示 diff |
| Diff 內容 | `<DiffViewer>` | 見 diff-viewer.md |

## 時間軸結構

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ● ─── 2026-04-02 10:30                                │
│  │     lynn.yang · UPDATE                               │
│  │     asr-general · prod · pro                         │
│  │     ┌─────────────────────────────────────────┐      │
│  │     │ replica: 1 → 3                          │      │
│  │     │ deploy: false → true                    │      │
│  │     │ 原因: 增加 prod 副本數                   │      │
│  │     └─────────────────────────────────────────┘      │
│  │                                                      │
│  ● ─── 2026-04-02 09:15                                │
│  │     john.doe · UPDATE                                │
│  │     llm-medium · dev · standard                      │
│  │     [▸ 展開查看 diff]                                │
│  │                                                      │
│  ● ─── 2026-04-01 14:00                                │
│        system · CREATE                                  │
│        asr-general · prod · pro                         │
│        [▸ 展開查看 diff]                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Badge 顏色

| change_type | Badge variant | 顏色 |
|-------------|--------------|------|
| CREATE | `default` (green bg) | `bg-green-100 text-green-700` |
| UPDATE | `default` (blue bg) | `bg-blue-100 text-blue-700` |
| DELETE | `destructive` | `bg-red-100 text-red-700` |

## 範例程式碼

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiffViewer } from "./diff-viewer";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

const changeTypeBadge: Record<string, { className: string; label: string }> = {
  CREATE: { className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", label: "新增" },
  UPDATE: { className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", label: "修改" },
  DELETE: { className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", label: "刪除" },
};

export function HistoryTimeline({ items, isLoading, onLoadMore, hasMore }: HistoryTimelineProps) {
  return (
    <div className="relative space-y-0">
      {/* 時間軸線 */}
      <div className="absolute left-4 top-0 h-full w-px bg-slate-200 dark:bg-slate-700" />

      {items.map((item) => {
        const badge = changeTypeBadge[item.change_type];
        return (
          <div key={item.id} className="relative pl-10 pb-6">
            {/* 時間軸圓點 */}
            <div className="absolute left-[13px] top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 dark:border-slate-900 dark:bg-slate-500" />

            <Collapsible>
              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  {/* 標題列 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.changed_by}</span>
                      <Badge className={cn("text-xs", badge?.className)}>
                        {badge?.label}
                      </Badge>
                    </div>
                    <time className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                        locale: zhTW,
                      })}
                    </time>
                  </div>

                  {/* Model 資訊 */}
                  {item.model_setting && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {item.model_setting.model_component.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {item.model_setting.environment.name}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.model_setting.edition.name}
                      </Badge>
                    </div>
                  )}

                  {/* 展開 diff */}
                  <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                    <ChevronRight className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-90" />
                    展開查看 diff
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-3">
                    <DiffViewer oldObj={getDiffOld(item.diff)} newObj={getDiffNew(item.diff)} />
                    {item.reason && (
                      <p className="mt-2 text-xs text-slate-500">
                        原因：{item.reason}
                      </p>
                    )}
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          </div>
        );
      })}

      {isLoading && (
        <div className="pl-10 text-sm text-slate-500">載入中...</div>
      )}
    </div>
  );
}
```

## Accessibility

- 時間軸使用語義化 `<time>` 標籤
- Collapsible 展開/收合以 `aria-expanded` 標示
- Badge 類型標示具有描述性文字（非僅顏色）
- 載入更多區域使用 `role="status"` 通知螢幕閱讀器
