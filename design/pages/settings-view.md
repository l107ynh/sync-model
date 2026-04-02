# Settings View 頁面規格（設定表格）

## 路由
`/versions/:versionId`

## 概述
核心頁面，以表格方式呈現指定版本下的所有 model settings。支援 Environment、Edition、Model Type 篩選，以及搜尋、排序、分頁。

## 頁面結構

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [SidebarNav]  │  頁面內容區                                              │
│               │                                                          │
│  ☰ Sync Model │  ┌─ 麵包屑 ─────────────────────────────────────────┐    │
│               │  │ 版本清單 > v3.2                                    │    │
│  ● 版本清單   │  └──────────────────────────────────────────────────┘    │
│               │                                                          │
│               │  ┌─ 頁面標題列 ──────────────────────────────────────┐   │
│               │  │ v3.2 設定表格                 54 個模型元件        │   │
│               │  └──────────────────────────────────────────────────┘   │
│               │                                                          │
│               │  ┌─ 篩選列 ─────────────────────────────────────────┐   │
│               │  │ [Environment ▼] [Edition ▼] [Model Type ▼]       │   │
│               │  │ [🔍 搜尋 model...]  [✓ 只顯示已部署]  [清除篩選] │   │
│               │  └──────────────────────────────────────────────────┘   │
│               │                                                          │
│               │  ┌─ 資料表格 ───────────────────────────────────────┐   │
│               │  │ Model Name ↕ │ Type │ Env  │ Ed. │ Deploy │ ... │   │
│               │  │──────────────┼──────┼──────┼─────┼────────┼─────│   │
│               │  │ asr-general  │ ASR  │ prod │ pro │   ●    │ ... │   │
│               │  │ llm-medium   │ LLM  │ prod │ pro │   ●    │ ... │   │
│               │  │ ...          │ ...  │ ...  │ ... │  ...   │ ... │   │
│               │  └──────────────────────────────────────────────────┘   │
│               │                                                          │
│               │  ┌─ 分頁 ───────────────────────────────────────────┐   │
│               │  │ 第 1-50 筆，共 324 筆     每頁 [50▼]  [< 1/7 >] │   │
│               │  └──────────────────────────────────────────────────┘   │
│  v1.0         │                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 使用元件

| 元件 | 用途 | 來源 |
|------|------|------|
| `SidebarNav` | 左側導航 | `design/components/sidebar-nav.md` |
| `DataTable` | 主表格 | `design/components/data-table.md` |
| `EnvironmentTabs` | 環境篩選 | `design/components/environment-tabs.md` |
| `EditionFilter` | Edition 篩選 | `design/components/edition-filter.md` |
| `ModelTypeBadge` | 表格 Type 欄位 | `design/components/model-type-badge.md` |
| `SettingsCard` | 未來 detail popover（備用） | `design/components/settings-card.md` |

## 表格欄位定義

| 欄位 | 資料來源 | 可排序 | 元件 | 寬度 |
|------|---------|--------|------|------|
| Model Name | `model_component.name` | 是 | `<span className="font-mono">` | auto (min 160px) |
| Type | `model_component.type` | 是 | `<ModelTypeBadge>` | 120px |
| Environment | `environment.name` | 否 | 文字 | 100px |
| Edition | `edition.name` | 否 | `<Badge variant="outline">` | 100px |
| Deploy | `deploy` | 是 | 綠/灰圓點 + sr-only text | 80px |
| GPU List | `gpu_list` | 否 | `<Badge variant="secondary">` 多個 | auto |
| Replica | `replica` | 是 | `<span className="font-mono tabular-nums">` | 80px |
| GPU Mem Util | `gpu_memory_utilization` | 是 | 百分比 + 進度條 | 120px |

## Deploy 狀態顯示

```tsx
function DeployIndicator({ deploy }: { deploy: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full",
          deploy
            ? "bg-green-500 dark:bg-green-400"
            : "bg-slate-300 dark:bg-slate-600"
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{deploy ? "已部署" : "未部署"}</span>
    </div>
  );
}
```

## GPU Memory Utilization 顯示

```tsx
function GpuMemBar({ value }: { value: number }) {
  const percent = (value * 100).toFixed(0);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 0.9
              ? "bg-red-500"
              : value >= 0.7
                ? "bg-yellow-500"
                : "bg-green-500"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums">{percent}%</span>
    </div>
  );
}
```

## 篩選列資料流

```
URL Search Params (source of truth)
  ├─ environment_id  ←→  <EnvironmentTabs>
  ├─ edition_id      ←→  <EditionFilter>
  ├─ model_type      ←→  Model Type <Select>
  ├─ search          ←→  <Input> (debounced 300ms)
  ├─ deploy_only     ←→  <Switch>
  ├─ sort_by         ←→  Table header click
  ├─ sort_order      ←→  Table header click
  ├─ page            ←→  <DataTablePagination>
  └─ per_page        ←→  <DataTablePagination>
```

所有篩選狀態存於 URL search params，確保可分享、可書籤、可瀏覽器返回。

## 狀態

| 狀態 | 條件 | 呈現 |
|------|------|------|
| Loading | API 請求中 | 表格 skeleton（8 行） |
| Empty | data.length === 0 && 有篩選 | 「篩選條件下沒有符合的資料」 + 清除篩選按鈕 |
| Empty | data.length === 0 && 無篩選 | 「此版本尚未匯入任何設定」 |
| Loaded | data.length > 0 | 正常表格顯示 |
| Error | API 回傳 404 | 「找不到此版本」 + 返回版本清單連結 |
| Error | API 回傳其他錯誤 | 錯誤提示 + 重試按鈕 |

## 互動行為

1. **篩選變更** -> 更新 URL search params -> 觸發 Server Component re-fetch
2. **搜尋** -> debounce 300ms -> 更新 `search` param -> re-fetch
3. **排序** -> 點擊表頭 -> 更新 `sort_by` + `sort_order` params -> re-fetch
4. **分頁** -> 點擊頁碼或切換 per_page -> 更新 `page` / `per_page` params -> re-fetch
5. **清除篩選** -> 移除所有篩選相關 params，保留 `page=1` + `per_page`

## 範例程式碼

```tsx
// app/versions/[versionId]/page.tsx (Server Component)
import { SidebarNav } from "@/components/sidebar-nav";
import { SettingsTable } from "./settings-table"; // Client Component

async function getVersion(versionId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/versions/${versionId}`
  );
  if (!res.ok) throw new Error("Version not found");
  return res.json();
}

async function getSettings(versionId: string, searchParams: URLSearchParams) {
  searchParams.set("version_id", versionId);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings?${searchParams.toString()}`
  );
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export default async function SettingsViewPage({
  params,
  searchParams,
}: {
  params: { versionId: string };
  searchParams: Record<string, string>;
}) {
  const sp = new URLSearchParams(searchParams);
  const [version, settingsResponse] = await Promise.all([
    getVersion(params.versionId),
    getSettings(params.versionId, sp),
  ]);

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          {/* 麵包屑 */}
          <nav className="text-sm text-slate-500">
            <a href="/" className="hover:text-slate-700 dark:hover:text-slate-300">
              版本清單
            </a>
            <span className="mx-2">/</span>
            <span className="text-slate-900 dark:text-slate-100">
              v{version.name}
            </span>
          </nav>

          {/* 標題 */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              v{version.name} 設定表格
            </h1>
            <span className="text-sm text-slate-500">
              {version.model_components_count} 個模型元件
            </span>
          </div>

          {/* 篩選 + 表格（Client Component） */}
          <SettingsTable
            data={settingsResponse.data}
            pagination={settingsResponse.pagination}
            filters={settingsResponse.filters}
          />
        </div>
      </main>
    </div>
  );
}
```

## SEO / Metadata

```tsx
export async function generateMetadata({ params }) {
  return {
    title: `v${params.versionId} 設定表格 - Sync Model`,
    description: "檢視模型版本的環境部署設定",
  };
}
```

## 響應式

| 斷點 | 側邊欄 | 表格行為 |
|------|--------|---------|
| < 768px | 隱藏 | 水平捲動，固定 Model Name 欄 |
| 768-1023px | 固定 | 水平捲動（如欄位過多） |
| >= 1024px | 固定 | 完整顯示所有欄位 |

篩選列在 mobile 時堆疊為兩行，desktop 時單行水平排列。
