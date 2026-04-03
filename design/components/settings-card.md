# SettingsCard — GPU 設定卡片

## 概述
在 DataTable 展開列或獨立詳細頁面中顯示單一 Model 的 GPU 設定。包含 deploy toggle、GPU List、replica、gpu_memory_utilization 進度條。基於 shadcn/ui Card + Switch + Progress。

## Props Interface

```typescript
interface SettingsCardProps {
  /** Model 設定資料 */
  setting: ModelSetting;
  /** 是否為唯讀模式 */
  readOnly?: boolean;
  /** Deploy 狀態變更 callback（未來 Sprint 使用） */
  onDeployChange?: (settingId: string, deploy: boolean) => void;
}

interface ModelSetting {
  id: string;
  model_component: {
    id: string;
    name: string;
    type: string;
    component_version: string;
    image: string;
  };
  environment: { id: string; name: string };
  edition: { id: string; name: string };
  deploy: boolean;
  gpu_list: string[];
  replica: number;
  gpu_memory_utilization: number;
  extra_settings: Record<string, unknown>;
  updated_at: string;
}
```

## shadcn/ui 映射

| 子元件 | shadcn 元件 | 用途 |
|--------|------------|------|
| 卡片 | `<Card>` + `<CardHeader>` + `<CardContent>` | 外框 |
| Deploy 開關 | `<Switch>` | deploy toggle |
| GPU Mem 條 | `<Progress>` | 記憶體使用率 |
| Model Type | `<ModelTypeBadge>` | 類型標示 |
| GPU Tag | `<Badge variant="outline">` | GPU 型號 |

## React + Tailwind 範例

```tsx
"use client";

import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ModelTypeBadge } from "./model-type-badge";
import { Cpu, HardDrive, Layers, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsCardProps {
  setting: ModelSetting;
  readOnly?: boolean;
  onDeployChange?: (settingId: string, deploy: boolean) => void;
}

export function SettingsCard({
  setting,
  readOnly = true,
  onDeployChange,
}: SettingsCardProps) {
  const memPct = Math.round(setting.gpu_memory_utilization * 100);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">
            {setting.model_component.name}
          </CardTitle>
          <ModelTypeBadge type={setting.model_component.type} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {setting.deploy ? "已部署" : "未部署"}
          </span>
          <Switch
            checked={setting.deploy}
            disabled={readOnly}
            onCheckedChange={(checked) =>
              onDeployChange?.(setting.id, checked)
            }
            aria-label={`${setting.model_component.name} 部署狀態`}
          />
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-4">
        {/* GPU List */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" />
            GPU List
          </div>
          <div className="flex flex-wrap gap-1">
            {setting.gpu_list.length > 0 ? (
              setting.gpu_list.map((gpu) => (
                <Badge key={gpu} variant="outline" className="text-xs">
                  {gpu}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">--</span>
            )}
          </div>
        </div>

        {/* Replica */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            Replica
          </div>
          <span className="text-sm font-medium tabular-nums">
            {setting.replica}
          </span>
        </div>

        {/* GPU Memory Utilization */}
        <div className="col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HardDrive className="h-3.5 w-3.5" />
              GPU Memory Utilization
            </div>
            <span className="text-xs font-medium tabular-nums">{memPct}%</span>
          </div>
          <Progress
            value={memPct}
            className={cn(
              "h-2",
              memPct >= 90
                ? "[&>div]:bg-red-500"
                : memPct >= 70
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-green-500"
            )}
          />
        </div>

        {/* Image */}
        <div className="col-span-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HardDrive className="h-3.5 w-3.5" />
            Image
          </div>
          <code className="block truncate rounded bg-muted px-2 py-1 text-xs">
            {setting.model_component.image}
          </code>
        </div>

        {/* Last Updated */}
        <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          最後更新：{new Date(setting.updated_at).toLocaleString("zh-TW")}
        </div>
      </CardContent>
    </Card>
  );
}
```

## GPU Memory 色彩閾值

| 使用率 | 顏色 | Tailwind |
|--------|------|----------|
| < 70% | 綠色 | `bg-green-500` |
| 70-89% | 琥珀色 | `bg-amber-500` |
| >= 90% | 紅色 | `bg-red-500` |

## 互動行為

| 行為 | 說明 |
|------|------|
| Deploy Switch | Sprint 1 為唯讀 (`readOnly=true`)，未來 Sprint 可啟用編輯 |
| Hover Card | 輕微 shadow 加深 |
| Image 過長 | `truncate` 截斷，hover 顯示 tooltip (title) |

## Accessibility

- Switch 有 `aria-label` 說明對應的 model name
- Progress bar 有 `aria-valuenow` / `aria-valuemin` / `aria-valuemax`
- 色彩閾值搭配數字百分比，不僅靠顏色傳達資訊
