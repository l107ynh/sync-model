# Settings View — 完整設定頁面

## 路由
`/versions/:versionId`（或 `/settings`，由 VersionSelector 控制）

## 概述
本 Sprint 的核心頁面。使用者選擇版本後，以環境 Tab + Edition 篩選 + 資料表格的方式檢視所有 Model 設定。對應 F-003 的「頁面 2: 設定表格」。

## Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌──────┐                                                                    │
│ │ SM   │  Sync Model                                      [使用者頭像]      │
│ └──────┘                                                                    │
├──────────┬───────────────────────────────────────────────────────────────────┤
│          │                                                                   │
│ 📊       │  ┌─ Version Selector ──────────────────────────────────────────┐  │
│ Dashboard│  │ 🏷️ 版本  [ 3.2 ▼ ]          FEDGPT 3.2 release · 54 models │  │
│          │  └────────────────────────────────────────────────────────────┘  │
│ ⚙️       │                                                                   │
│ Settings │  ┌─ Environment Tabs ──────────────────────────────────────────┐  │
│  (active)│  │ [全部 324] [dev 108] [stage 54] [prod 108] [on-prem 0]     │  │
│          │  │ [dogfood 54]                                                │  │
│ 📜       │  └────────────────────────────────────────────────────────────┘  │
│ History  │                                                                   │
│          │  ┌─ Filter Bar ────────────────────────────────────────────────┐  │
│          │  │ Edition: [全部] [std] [pro] [2026-pro]                      │  │
│          │  │                                                              │  │
│          │  │ [Model Type ▼] [🔍 搜尋 model...]    ☐ 只顯示已部署         │  │
│          │  │                                              [清除篩選]      │  │
│          │  └────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          │  ┌─ Data Table ────────────────────────────────────────────────┐  │
│          │  │ ▸ Model Name ↕  Type    Env    Edition  Deploy  GPU   Rep  │  │
│          │  │────────────────────────────────────────────────────────────│  │
│          │  │ ▸ asr-general   [ASR]   prod   pro      🟢     A100   2   │  │
│          │  │ ▸ llm-medium    [LLM]   prod   pro      🟢     H100   4   │  │
│          │  │ ▾ tts-cosy      [TTS]   dev    std      ⚫     --     0   │  │
│          │  │   ┌─ Expanded Detail ──────────────────────────────────┐   │  │
│          │  │   │ Image: registry.corp.ailabs.tw/fedgpt/tts:0.1.0   │   │  │
│          │  │   │ Version: 0.1.0                                    │   │  │
│          │  │   │ Extra Settings: { ... }                           │   │  │
│          │  │   │ 最後更新: 2026/03/15 14:30                         │   │  │
│          │  │   └────────────────────────────────────────────────────┘   │  │
│          │  │ ▸ vlm-general   [VLM]   prod   pro      🟢     A100   2   │  │
│          │  │ ▸ retriever-m   [Ret]   prod   std      🟢     T4     1   │  │
│          │  │ ...                                                        │  │
│          │  │────────────────────────────────────────────────────────────│  │
│          │  │              第 1-50 筆，共 324 筆                          │  │
│          │  │      [< 上一頁] [1] [2] [3] ... [7] [下一頁 >]            │  │
│          │  │                           每頁 [20] [50 ▼] [100]           │  │
│          │  └────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│ [◀ 收合] │                                                                   │
└──────────┴───────────────────────────────────────────────────────────────────┘
```

## 頁面結構（由上至下）

### 1. Version Selector 區域
- 左側：`VersionSelector` 元件（下拉選擇版本）
- 右側：當前版本描述 + model 總數

### 2. Environment Tabs 區域
- `EnvironmentTabs` 元件
- 各 Tab 右上角顯示該環境下的 model 數量
- 選擇「全部」則不篩選 environment

### 3. Filter Bar 區域
上下兩行：

**第一行（Edition Chips）**：
- `EditionFilter` 元件 — pill 形式多選

**第二行（其他篩選）**：
- Model Type 多選下拉（shadcn `Popover` + `Command` + `Checkbox`）
- 搜尋框（shadcn `Input` + Search icon）
- 「只顯示已部署」Toggle（shadcn `Switch`）
- 「清除篩選」按鈕（ghostvariant，有篩選時才出現）

### 4. Data Table 區域
- `DataTable` 元件
- 欄位定義如 `data-table.md`
- 支援 row 展開（chevron 圖示）
- 展開後顯示 Image、Component Version、Extra Settings、更新時間

### 5. Pagination 區域
- 包含在 DataTable 底部
- 顯示：目前範圍 / 總數
- 頁碼導航（上一頁 / 數字 / 下一頁）
- 每頁筆數選擇（20 / 50 / 100）

## 資料流

```
Version 選擇
  └→ GET /api/v1/versions/:versionId/environments → EnvironmentTabs
  └→ GET /api/v1/versions/:versionId/editions → EditionFilter
  └→ GET /api/v1/settings?version_id=...&environment_id=...&edition_id=...
       &model_type=...&search=...&deploy_only=...&sort_by=...&sort_order=...
       &page=...&per_page=...
       → DataTable
```

## 篩選邏輯

所有篩選為 AND 關係，URL query params 同步：

| 篩選項 | URL Param | 元件 |
|--------|-----------|------|
| 版本 | `version_id` | VersionSelector |
| 環境 | `environment_id` | EnvironmentTabs |
| Edition | `edition_id` (可多值) | EditionFilter |
| Model Type | `model_type` | Dropdown multi-select |
| 搜尋 | `search` | Input |
| 只顯示已部署 | `deploy_only` | Switch |
| 排序 | `sort_by`, `sort_order` | Table header |
| 分頁 | `page`, `per_page` | Pagination |

切換篩選後 `page` 重設為 1。

## 狀態管理

使用 `nuqs` 或 Next.js `useSearchParams` 將篩選狀態同步到 URL：
- 重新整理頁面可恢復篩選狀態
- 可分享帶篩選的 URL

## 載入狀態

```
┌────────────────────────────────────────────┐
│ ▓▓▓▓▓▓ 版本  [ ████████ ]                 │  ← Skeleton
│                                            │
│ [████] [████] [████] [████]                │  ← Tab Skeleton
│                                            │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │  ← 表格 Skeleton (6 rows)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
└────────────────────────────────────────────┘
```

## 空狀態（篩選無結果）

```
┌────────────────────────────────────────────┐
│                                            │
│           🔍                               │
│   沒有符合條件的 Model 設定                 │
│   試著調整篩選條件                          │
│   [清除所有篩選]                            │
│                                            │
└────────────────────────────────────────────┘
```

## 元件組成

| 區域 | 使用的設計元件 |
|------|---------------|
| Sidebar | `SidebarNav` |
| 版本選擇 | `VersionSelector` |
| 環境切換 | `EnvironmentTabs` |
| Edition 篩選 | `EditionFilter` |
| Model Type 篩選 | shadcn `Popover` + `Command` |
| 搜尋 | shadcn `Input` |
| 部署篩選 | shadcn `Switch` |
| 表格 | `DataTable` |
| Type Badge | `ModelTypeBadge` |
| 展開詳細 | `SettingsCard` 簡化版 |
| 分頁 | shadcn Pagination |

## 響應式行為

| 斷點 | 行為 |
|------|------|
| >= xl (1280px) | Sidebar 展開 + 全部欄位顯示 |
| >= lg (1024px) | Sidebar 展開 + 隱藏 Edition/Environment 欄（已用 Tab/Chip 篩選） |
| >= md (768px) | Sidebar 收合 + 篩選列換行 |
| < md | Sidebar 隱藏 + 篩選列堆疊 + 表格水平滾動 |
