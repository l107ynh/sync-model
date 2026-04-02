# VersionSelector 元件規格

## 概述
版本選擇器，用於版本清單頁面的卡片式列表。每張卡片顯示版本名稱、model 元件數量、建立時間，點擊後導航至該版本的設定表格頁面。

## Props Interface

```typescript
interface Version {
  id: string;
  name: string;
  description: string;
  modelComponentsCount: number;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

interface VersionSelectorProps {
  /** 版本清單 */
  versions: Version[];
  /** 是否載入中 */
  isLoading?: boolean;
}

interface VersionCardProps {
  /** 單一版本資料 */
  version: Version;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 卡片容器 | `<Card>` | 含 hover 效果 |
| 標題 | `<CardHeader>` + `<CardTitle>` | 版本名稱 |
| 內容 | `<CardContent>` | model 數量 + 時間 |
| 骨架屏 | `<Skeleton>` | 載入中佔位 |

## 範例程式碼

```tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Layers, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

function VersionCard({ version }: VersionCardProps) {
  return (
    <Link href={`/versions/${version.id}`}>
      <Card className="cursor-pointer transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="text-xl font-bold">v{version.name}</span>
            <Badge variant="secondary" className="font-mono text-xs">
              <Layers className="mr-1 h-3 w-3" />
              {version.modelComponentsCount} models
            </Badge>
          </CardTitle>
          {version.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {version.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(version.createdAt), {
                addSuffix: true,
                locale: zhTW,
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function VersionSelector({
  versions,
  isLoading = false,
}: VersionSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-sm text-slate-500">目前沒有版本資料</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {versions.map((version) => (
        <VersionCard key={version.id} version={version} />
      ))}
    </div>
  );
}
```

## 響應式行為

| 斷點 | 欄位數 | 說明 |
|------|--------|------|
| < 640px (mobile) | 1 | 單欄全寬 |
| 640px - 1023px (tablet) | 2 | 雙欄 |
| 1024px - 1279px (desktop) | 3 | 三欄 |
| >= 1280px (wide) | 4 | 四欄 |

## Accessibility

- 卡片使用 `<Link>` 元素，原生支援鍵盤導航
- hover 效果搭配 focus-visible 效果
- model 數量使用語意化文字，螢幕閱讀器可理解
