# SettingsCard 元件規格

## 概述
設定詳情卡片，用於顯示單一 model setting 的完整資訊。可用於未來的 detail view 或 hover popover。Sprint 1 主要作為設計參考。

## Props Interface

```typescript
interface ModelSetting {
  id: string;
  modelComponent: {
    id: string;
    name: string;
    type: ModelType;
    componentVersion: string;
    image: string;
  };
  environment: {
    id: string;
    name: string;
  };
  edition: {
    id: string;
    name: string;
  };
  deploy: boolean;
  gpuList: string[];
  replica: number;
  gpuMemoryUtilization: number;
  extraSettings: Record<string, unknown>;
  updatedAt: string;
}

interface SettingsCardProps {
  /** Model 設定資料 */
  setting: ModelSetting;
  /** 額外 className */
  className?: string;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 卡片 | `<Card>` | 容器 |
| 標題區 | `<CardHeader>` | model name + type badge |
| 內容區 | `<CardContent>` | 設定詳情 |
| 部署狀態 | `<Badge>` | deploy indicator |
| GPU 標籤 | `<Badge variant="secondary">` | GPU list items |

## 範例程式碼

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModelTypeBadge } from "./model-type-badge";
import { cn } from "@/lib/utils";
import { Cpu, Server, Tag, Gauge } from "lucide-react";

export function SettingsCard({ setting, className }: SettingsCardProps) {
  const { modelComponent, environment, edition, deploy, gpuList, replica, gpuMemoryUtilization } =
    setting;

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-mono text-base">
              {modelComponent.name}
            </CardTitle>
            <p className="mt-1 font-mono text-xs text-slate-400">
              v{modelComponent.componentVersion}
            </p>
          </div>
          <ModelTypeBadge type={modelComponent.type} size="md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 部署狀態 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">狀態</span>
          <Badge
            variant={deploy ? "default" : "secondary"}
            className={cn(
              deploy
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}
          >
            <span
              className={cn(
                "mr-1.5 inline-block h-2 w-2 rounded-full",
                deploy ? "bg-green-500" : "bg-slate-400"
              )}
              aria-hidden="true"
            />
            {deploy ? "已部署" : "未部署"}
          </Badge>
        </div>

        {/* 環境 + Edition */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Server className="h-3.5 w-3.5" />
            <span>{environment.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Tag className="h-3.5 w-3.5" />
            <span>{edition.name}</span>
          </div>
        </div>

        {/* GPU 資訊 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Cpu className="h-3.5 w-3.5" />
            <span>GPU</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {gpuList.length > 0 ? (
              gpuList.map((gpu, i) => (
                <Badge key={i} variant="secondary" className="font-mono text-xs">
                  {gpu}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )}
          </div>
        </div>

        {/* Replica + Memory */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-slate-500">
            Replica: <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{replica}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Gauge className="h-3.5 w-3.5" />
            <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
              {(gpuMemoryUtilization * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Accessibility

- Deploy 狀態圓點為 `aria-hidden="true"`，文字標籤提供語意
- 所有 icon 搭配文字標籤，不依賴純視覺傳達
- 卡片本身為靜態展示，不需額外 interactive a11y
