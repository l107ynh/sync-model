# Dashboard 頁面規格（版本清單）

## 路由
`/` (root)

## 概述
首頁，以卡片網格列出所有版本（Version），使用者點擊卡片後進入該版本的設定表格頁面。

## 頁面結構

```
┌──────────────────────────────────────────────────────────────────┐
│ [SidebarNav]  │  頁面內容區                                       │
│               │                                                   │
│  ☰ Sync Model │  ┌─ 頁面標題列 ───────────────────────────────┐   │
│               │  │ 版本清單                    [重新整理按鈕]   │   │
│  ● 版本清單   │  └────────────────────────────────────────────┘   │
│               │                                                   │
│               │  ┌─ 版本卡片網格 ──────────────────────────────┐  │
│               │  │ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│               │  │ │ v3.2     │ │ v3.1     │ │ v3.0     │     │  │
│               │  │ │ 54 models│ │ 48 models│ │ 42 models│     │  │
│               │  │ │ 2 天前   │ │ 1 週前   │ │ 3 週前   │     │  │
│               │  │ └──────────┘ └──────────┘ └──────────┘     │  │
│               │  └────────────────────────────────────────────┘  │
│               │                                                   │
│  v1.0         │                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## 使用元件

| 元件 | 用途 | 來源 |
|------|------|------|
| `SidebarNav` | 左側導航 | `design/components/sidebar-nav.md` |
| `VersionSelector` | 版本卡片網格 | `design/components/version-selector.md` |

## 資料流

```
Server Component (page.tsx)
  └─ fetch GET /api/v1/versions?page=1&per_page=20
      └─ 傳遞 versions 資料給 <VersionSelector>
```

## 狀態

| 狀態 | 條件 | 呈現 |
|------|------|------|
| Loading | API 請求中 | Skeleton 卡片 x 4 |
| Empty | versions.length === 0 | 虛線框 + 「目前沒有版本資料」提示 |
| Loaded | versions.length > 0 | 卡片網格，按 created_at 倒序 |
| Error | API 回傳錯誤 | 錯誤提示 + 重試按鈕 |

## 互動行為

1. **點擊版本卡片** -> 導航至 `/versions/:versionId`
2. **點擊重新整理** -> 重新呼叫 API（使用 `router.refresh()`）

## 響應式

| 斷點 | 側邊欄 | 卡片欄數 |
|------|--------|---------|
| < 640px | 隱藏（hamburger） | 1 |
| 640-767px | 隱藏（hamburger） | 2 |
| 768-1023px | 固定 | 2 |
| 1024-1279px | 固定 | 3 |
| >= 1280px | 固定 | 4 |

## 範例程式碼

```tsx
// app/page.tsx (Server Component)
import { SidebarNav } from "@/components/sidebar-nav";
import { VersionSelector } from "@/components/version-selector";

async function getVersions() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/versions?page=1&per_page=20`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
}

export default async function DashboardPage() {
  const { data: versions } = await getVersions();

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              版本清單
            </h1>
          </div>
          <VersionSelector versions={versions} />
        </div>
      </main>
    </div>
  );
}
```

## SEO / Metadata

```tsx
export const metadata = {
  title: "版本清單 - Sync Model",
  description: "檢視所有模型版本與其設定概覽",
};
```
