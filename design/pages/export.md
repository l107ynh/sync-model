# Confluence 匯出頁面規格

## 路由
`/export/confluence`

## 概述
Confluence 匯出頁面，將指定版本的 model 設定匯出為 Confluence 格式的 HTML 表格、PDF 檔案，或直接透過 API 更新 Confluence 頁面。支援依環境和 edition 篩選匯出範圍。

## 頁面結構

```
┌──────────────────────────────────────────────────────────────────┐
│ [SidebarNav]  │  頁面內容區                                       │
│               │                                                   │
│  ☰ Sync Model │  ┌─ 頁面標題列 ───────────────────────────────┐   │
│               │  │ Confluence 匯出              [返回版本清單]  │   │
│  ● 版本清單   │  └────────────────────────────────────────────┘   │
│  ● 匯入      │                                                   │
│  ● 匯出      │  ┌─ 匯出設定區 ────────────────────────────────┐  │
│               │  │                                              │  │
│               │  │  版本 *                                      │  │
│               │  │  ┌──────────────────────────────────┐       │  │
│               │  │  │ v3.2 (54 models)            ▾    │       │  │
│               │  │  └──────────────────────────────────┘       │  │
│               │  │                                              │  │
│               │  │  匯出格式 *                                  │  │
│               │  │  ○ HTML — 下載 Confluence 格式 HTML 檔案     │  │
│               │  │  ● PDF — 下載 A4 橫向排版 PDF 檔案          │  │
│               │  │  ○ 更新 Confluence 頁面 — 直接寫入指定頁面   │  │
│               │  │                                              │  │
│               │  │  ▸ 篩選條件（展開）                          │  │
│               │  │  ┌─────────────────────────────────────────┐│  │
│               │  │  │  環境                                   ││  │
│               │  │  │  ☑ dev  ☑ prod  ☑ dogfood              ││  │
│               │  │  │                                         ││  │
│               │  │  │  Edition                                ││  │
│               │  │  │  ☑ std  ☑ pro                           ││  │
│               │  │  └─────────────────────────────────────────┘│  │
│               │  │                                              │  │
│               │  │  ┌─ Confluence Page ID（僅 API 模式）──────┐│  │
│               │  │  │ Page ID: [12345                      ]  ││  │
│               │  │  │ 連線狀態：🟢 已設定                      ││  │
│               │  │  └─────────────────────────────────────────┘│  │
│               │  │                                              │  │
│               │  │                              [產生預覽]     │  │
│               │  └────────────────────────────────────────────┘  │
│               │                                                   │
│               │  ┌─ ExportPreview ─────────────────────────────┐  │
│               │  │  預覽卡片標題 — v3.2            [PDF] 時間   │  │
│               │  │  ┌─ HTML 表格預覽 ─────────────────────────┐│  │
│               │  │  │ Component │ ID    │ Model │ Images │... ││  │
│               │  │  │ ASR core  │ asr.. │ asr.. │ reg... │... ││  │
│               │  │  └─────────────────────────────────────────┘│  │
│               │  │                                              │  │
│               │  │                    [下載 HTML / PDF]         │  │
│               │  │                    或 [更新 Confluence 頁面] │  │
│               │  └────────────────────────────────────────────┘  │
│               │                                                   │
│               │  ┌─ 更新成功（Confluence API 模式）─────────────┐ │
│               │  │  ✅ Confluence 頁面已更新！ [前往頁面 ↗]     │ │
│               │  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## 使用元件

| 元件 | 用途 | 來源 |
|------|------|------|
| `SidebarNav` | 左側導航 | `design/components/sidebar-nav.md` |
| `VersionSelector` | 版本下拉選單（select 模式）| shadcn/ui `Select` |
| `ExportPreview` | HTML 表格預覽 + 匯出按鈕 | `design/components/export-preview.md` |
| `RadioGroup` | 匯出格式選擇 | shadcn/ui `RadioGroup` |
| `Checkbox` | 環境/Edition 篩選 | shadcn/ui `Checkbox` |
| `Collapsible` | 篩選條件摺疊面板 | shadcn/ui `Collapsible` |
| `Input` | Confluence Page ID | shadcn/ui `Input` |
| `Badge` | 連線狀態指示 | shadcn/ui `Badge` |
| `Button` | 產生預覽 / 匯出按鈕 | shadcn/ui `Button` |

## 資料流

```
Client Component (page.tsx)
  │
  ├─ 載入 → GET /api/v1/versions（填充版本選單）
  ├─ 載入 → GET /api/v1/environments（填充環境 checkbox）
  ├─ 載入 → GET /api/v1/editions（填充 edition checkbox）
  │
  ├─ 點擊「產生預覽」
  │   └─ POST /api/v1/export/confluence { version_id, format: "html", ... }
  │       └─ 顯示 ExportPreview
  │
  ├─ 下載 HTML
  │   └─ 觸發瀏覽器下載（Blob URL）
  │
  ├─ 下載 PDF
  │   └─ POST /api/v1/export/confluence { format: "pdf", ... }
  │       └─ 接收 PDF binary → 觸發下載
  │
  └─ 更新 Confluence 頁面
      └─ POST /api/v1/export/confluence { format: "confluence_api", confluence_page_id, ... }
          └─ 顯示成功訊息 + 頁面連結
```

## 狀態

| 狀態 | 條件 | 呈現 |
|------|------|------|
| Initial | 頁面載入 | 版本選單 + 格式選擇 + 空預覽區 |
| Loading Versions | 載入版本清單 | Select 顯示 skeleton |
| Ready | 選擇版本 + 格式 | 啟用「產生預覽」按鈕 |
| Generating | 呼叫匯出 API 中 | Loading spinner |
| Preview | 預覽產生完成 | 顯示 ExportPreview |
| Exporting | 下載/更新中 | 按鈕 loading 狀態 |
| Success | 匯出完成 | 下載觸發 / Confluence 更新成功訊息 |
| Error | API 錯誤 | 紅色 Alert + 重試按鈕 |

## 互動行為

1. **版本選擇** — 選擇版本後清空預覽區，啟用「產生預覽」按鈕
2. **格式切換** — 即時更新下方 UI：
   - `html` → 預覽按鈕文字「產生預覽」，匯出按鈕「下載 HTML」
   - `pdf` → 預覽按鈕文字「產生預覽」，匯出按鈕「下載 PDF」，顯示橫向排版提示
   - `confluence_api` → 顯示 Page ID 輸入框 + 連線狀態，匯出按鈕「更新 Confluence 頁面」
3. **篩選條件** — 展開/收合面板，勾選後重新觸發預覽
4. **產生預覽** — 呼叫 API 產生 HTML 內容，顯示在 ExportPreview
5. **匯出** — 依格式觸發下載或 Confluence API 更新

## 表單驗證

| 欄位 | 規則 | 錯誤訊息 |
|------|------|---------|
| version_id | 必選 | 請選擇版本 |
| format | 必選 | 請選擇匯出格式 |
| confluence_page_id | 必填（API 模式）| 請輸入 Confluence Page ID |

## 錯誤處理

| 錯誤碼 | 使用者提示 |
|--------|-----------|
| NOT_FOUND | 版本不存在或已被刪除 |
| INVALID_INPUT | 請確認必填欄位是否正確填寫 |
| CONFLUENCE_ERROR | 無法連線到 Confluence，請確認設定及 Page ID 是否正確 |

## 響應式

| 斷點 | 配置 |
|------|------|
| `sm` (< 768px) | 設定區全寬堆疊、RadioGroup 垂直排列、預覽表格水平捲動 |
| `md` (768-1024px) | 設定區與預覽上下排列、篩選條件 2 欄 checkbox |
| `lg` (> 1024px) | 完整 layout、篩選條件橫向排列 |
