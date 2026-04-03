# History 頁面規格（變更歷史）

## 路由
`/history`

## 概述
全域變更歷史頁面，以時間軸列表呈現所有 model setting 的變更記錄。支援日期範圍、操作者、環境、變更類型等篩選。

## 頁面結構

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [SidebarNav]  │  頁面內容區                                              │
│               │                                                          │
│  ☰ Sync Model │  ┌─ 頁面標題 ──────────────────────────────────────┐    │
│               │  │ 變更歷史                          共 150 筆記錄  │    │
│  ● 版本清單   │  └──────────────────────────────────────────────────┘    │
│  📋 History   │                                                          │
│  🔄 Compare   │  ┌─ 篩選列 ─────────────────────────────────────────┐   │
│               │  │ [📅 日期範圍]  [👤 操作者 ▼]  [🌐 環境 ▼]        │   │
│               │  │ [🏷 CREATE ● UPDATE ● DELETE]        [清除篩選]   │   │
│               │  └──────────────────────────────────────────────────┘   │
│               │                                                          │
│               │  ┌─ 時間軸 ─────────────────────────────────────────┐   │
│               │  │                                                   │   │
│               │  │  ● ─── 2026-04-02 10:30                          │   │
│               │  │  │     lynn.yang · UPDATE                         │   │
│               │  │  │     asr-general · prod · pro                   │   │
│               │  │  │     ┌───────────────────────────────┐          │   │
│               │  │  │     │ replica: 1 → 3                │          │   │
│               │  │  │     │ deploy: false → true          │          │   │
│               │  │  │     └───────────────────────────────┘          │   │
│               │  │  │                                                │   │
│               │  │  ● ─── 2026-04-02 09:15                          │   │
│               │  │  │     john.doe · UPDATE                          │   │
│               │  │  │     llm-medium · dev · standard                │   │
│               │  │  │     [▸ 展開查看 diff]                          │   │
│               │  │  │                                                │   │
│               │  │  ● ─── 2026-04-01 14:00                          │   │
│               │  │        system · CREATE                            │   │
│               │  │        asr-general · prod · pro                   │   │
│               │  │        [▸ 展開查看 diff]                          │   │
│               │  │                                                   │   │
│               │  └──────────────────────────────────────────────────┘   │
│               │                                                          │
│               │  ┌─ 分頁 ───────────────────────────────────────────┐   │
│               │  │ 第 1-20 筆，共 150 筆    每頁 [20▼]  [< 1/8 >]  │   │
│               │  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

## 使用元件

| 元件 | 用途 | 來源 |
|------|------|------|
| `SidebarNav` | 左側導航 | `design/components/sidebar-nav.md` |
| `HistoryTimeline` | 時間軸列表 | `design/components/history-timeline.md` |
| `DiffViewer` | 展開的 diff 顯示 | `design/components/diff-viewer.md` |
| `ModelTypeBadge` | Model type 標記 | `design/components/model-type-badge.md` |

## 篩選元件

| 篩選 | 元件 | API 參數 |
|------|------|---------|
| 日期範圍 | `DateRangePicker` (shadcn Calendar + Popover) | `from_date`, `to_date` |
| 操作者 | `<Select>` | `changed_by` |
| 環境 | `<Select>` | `environment_id` |
| 變更類型 | Badge selector (toggle group) | `change_type` |

## 篩選資料流

```
URL Search Params (source of truth)
  ├─ from_date    ←→  DateRangePicker
  ├─ to_date      ←→  DateRangePicker
  ├─ changed_by   ←→  <Select>
  ├─ environment_id ←→ <Select>
  ├─ change_type  ←→  Badge toggle group
  ├─ page         ←→  Pagination
  └─ per_page     ←→  Pagination
```

## 狀態

| 狀態 | 條件 | 呈現 |
|------|------|------|
| Loading | API 請求中 | Skeleton cards (3 張) |
| Empty | data.length === 0 && 有篩選 | "篩選條件下沒有變更記錄" + 清除篩選按鈕 |
| Empty | data.length === 0 && 無篩選 | "目前沒有任何變更記錄" |
| Loaded | data.length > 0 | 正常時間軸顯示 |
| Error | API 錯誤 | 錯誤提示 + 重試按鈕 |

## 互動行為

1. **篩選變更** -> 更新 URL search params -> re-fetch，page 重置為 1
2. **展開 diff** -> Collapsible 展開/收合，無需 re-fetch（資料已含 diff）
3. **分頁** -> 更新 page param -> re-fetch -> 捲動到頂部
4. **清除篩選** -> 移除所有篩選 params，保留 page=1

## 響應式

| 斷點 | 側邊欄 | 時間軸 | 篩選列 |
|------|--------|--------|--------|
| < 768px | 隱藏 | 全寬，圓點靠左 | 堆疊兩行 |
| 768-1023px | 固定 | 正常 | 單行 |
| >= 1024px | 固定 | 正常，最大寬度 800px | 單行 |
