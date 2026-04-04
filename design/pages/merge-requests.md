# Merge Requests 清單頁面規格

## 路由
`/merge-requests`

## 概述
顯示所有透過系統建立的 GitLab Merge Request 清單。支援狀態篩選、建立者篩選，以及同步狀態和重發通知等操作。入口為左側導航新增的「Merge Requests」項目。

## 頁面結構

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [SidebarNav]  │  頁面內容區                                              │
│               │                                                          │
│  ☰ Sync Model │  ┌─ 頁面標題列 ──────────────────────────────────────┐   │
│               │  │ Merge Requests                [+ 建立 MR]         │   │
│  ● 版本清單   │  └──────────────────────────────────────────────────┘   │
│  ● 變更紀錄   │                                                          │
│  ● MR 清單  ← │  ┌─ 統計卡片列 ──────────────────────────────────────┐  │
│               │  │ 📊 全部: 12  │ 🔵 審核中: 5  │ ✅ 已合併: 6  │ ❌ 1│  │
│               │  └──────────────────────────────────────────────────┘   │
│               │                                                          │
│               │  ┌─ 篩選列 ─────────────────────────────────────────┐   │
│               │  │ [狀態 ▼ 全部]  [建立者 ▼ 全部]  [🔍 搜尋...]    │   │
│               │  └──────────────────────────────────────────────────┘   │
│               │                                                          │
│               │  ┌─ MR 清單 ────────────────────────────────────────┐   │
│               │  │ ┌──────────────────────────────────────────────┐  │   │
│               │  │ │ [審核中] chore(sync-model): update asr...   │  │   │
│               │  │ │ sync-model/2026-04-02-abc → main            │  │   │
│               │  │ │ lynn.yang · 2 小時前 · 1 file  [GitLab ↗]  │  │   │
│               │  │ └──────────────────────────────────────────────┘  │   │
│               │  │ ┌──────────────────────────────────────────────┐  │   │
│               │  │ │ [已合併] chore(sync-model): update llm...   │  │   │
│               │  │ │ sync-model/2026-04-01-def → main            │  │   │
│               │  │ │ admin · 1 天前 · 2 files       [GitLab ↗]  │  │   │
│               │  │ └──────────────────────────────────────────────┘  │   │
│               │  │                                                   │   │
│               │  │ ┌──────────────────────────────────────────────┐  │   │
│               │  │ │ [已關閉] chore(sync-model): update whisper..│  │   │
│               │  │ │ sync-model/2026-03-30-ghi → main            │  │   │
│               │  │ │ lynn.yang · 3 天前 · 1 file    [GitLab ↗]  │  │   │
│               │  │ └──────────────────────────────────────────────┘  │   │
│               │  └───────────────────────────────────────────────────┘   │
│               │                                                          │
│               │  ┌─ 分頁 ───────────────────────────────────────────┐   │
│               │  │ 第 1-20 筆，共 12 筆    每頁 [20▼]  [< 1/1 >]  │   │
│               │  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

## 統計卡片列

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ 全部        │ │ 審核中 🔵   │ │ 已合併 ✅   │ │ 已關閉 ❌   │
│    12       │ │    5        │ │    6        │ │    1        │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

- 點擊卡片等同設定篩選條件
- 當前篩選的卡片有 `ring-2 ring-primary` 邊框
- 數字使用 `tabular-nums font-semibold text-2xl`

## 使用元件

| 元件 | 用途 | 來源 |
|------|------|------|
| `SidebarNav` | 左側導航 | `design/components/sidebar-nav.md` |
| `MrStatusCard` | MR 清單項目 | `design/components/mr-status-card.md`（compact 模式） |
| `CreateMrDialog` | 建立 MR 對話框 | `design/components/create-mr-dialog.md` |
| `DataTable` | 可改用 table 顯示 | `design/components/data-table.md`（備用） |
| `Select` | 篩選下拉 | shadcn/ui |
| `Input` | 搜尋框 | shadcn/ui |
| `Button` | 建立 MR 按鈕 | shadcn/ui |

## 篩選邏輯

| 篩選 | 參數 | 值 | 預設 |
|------|------|---|------|
| 狀態 | `status` | `PENDING` / `OPEN` / `MERGED` / `CLOSED` / (空=全部) | 空 |
| 建立者 | `created_by` | 使用者名稱 / (空=全部) | 空 |
| 搜尋 | `search` | MR 標題關鍵字 | 空 |

篩選狀態存於 URL search params，支援分享和瀏覽器上下頁。

## 資料流

```
URL Search Params
  ├─ status      ←→  Status <Select> / 統計卡片
  ├─ created_by  ←→  CreatedBy <Select>
  ├─ search      ←→  <Input> (debounced 300ms)
  ├─ page        ←→  分頁
  └─ per_page    ←→  分頁

API: GET /api/v1/merge-requests?status=...&created_by=...&page=...&per_page=...
```

## 清單項目操作

每個 MR 卡片 hover 時出現操作按鈕列：

| 操作 | 條件 | API |
|------|------|-----|
| 同步狀態 | status = PENDING / OPEN | `POST /merge-requests/:id/sync-status` |
| 重發通知 | status = OPEN | `POST /notifications/send` |
| 查看詳情 | 永遠 | 展開/導航至詳情 |
| 在 GitLab 查看 | 永遠 | 開新分頁至 `gitlab_mr_url` |

## MR 詳情展開

點擊 MR 卡片展開詳情面板（使用 `MrStatusCard` 完整模式）：

```
┌──────────────────────────────────────────────────────────────────┐
│ [審核中]  chore(sync-model): update asr-general settings        │
│                                                                  │
│ Branch:  sync-model/2026-04-02-abc123 → main                    │
│ Created: 2026-04-02 10:30 by lynn.yang                          │
│ MR #123                                                         │
│                                                                  │
│ 變更檔案（1）                                                    │
│  📄 src/components/inferno/gpu/pro.ts  [modify]                 │
│                                                                  │
│ [同步狀態]  [重發通知]  [在 GitLab 查看 ↗]                       │
└──────────────────────────────────────────────────────────────────┘
```

## 狀態

| 狀態 | 條件 | 呈現 |
|------|------|------|
| Loading | API 請求中 | 統計卡片 skeleton + 3 個 MR card skeleton |
| Empty | data.length === 0 && 無篩選 | 「尚未建立任何 Merge Request」 + [建立第一個 MR] 按鈕 |
| Empty | data.length === 0 && 有篩選 | 「篩選條件下沒有符合的 MR」 + 清除篩選按鈕 |
| Loaded | data.length > 0 | 正常清單顯示 |
| Error | API 錯誤 | 錯誤提示 + 重試按鈕 |

## 即時更新

- 同步狀態後自動更新該 MR 的 badge
- 建立 MR 成功後自動重整清單（將新 MR 置頂）
- 使用 `useSWR` 或 `React Query` 的 `mutate` 做 optimistic update

## 響應式

| 斷點 | 側邊欄 | 清單行為 |
|------|--------|---------|
| < 768px | 隱藏（hamburger） | 卡片全寬，統計卡片 2x2 grid |
| 768-1023px | 固定 | 卡片全寬 |
| >= 1024px | 固定 | 卡片全寬（max-width 900px 居中） |

## Accessibility

- 清單使用 `role="list"` + `role="listitem"`
- 篩選變更後 announce「篩選結果：N 筆 Merge Request」
- 操作按鈕有 tooltip 和 `aria-label`
- 外部連結標示 `(在新視窗開啟)`
- 鍵盤可 Tab 到每個 MR 卡片，Enter 展開詳情
