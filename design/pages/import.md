# Confluence 匯入頁面規格

## 路由
`/import/confluence`

## 概述
Confluence 匯入頁面，支援兩種匯入方式：上傳 PDF/HTML 檔案或透過 Confluence API 讀取頁面。上傳後自動觸發 dry_run 預覽，使用者確認後正式匯入。

## 頁面結構

```
┌──────────────────────────────────────────────────────────────────┐
│ [SidebarNav]  │  頁面內容區                                       │
│               │                                                   │
│  ☰ Sync Model │  ┌─ 頁面標題列 ───────────────────────────────┐   │
│               │  │ Confluence 匯入              [返回版本清單]  │   │
│  ● 版本清單   │  └────────────────────────────────────────────┘   │
│  ● 匯入      │                                                   │
│  ● 匯出      │  ┌─ 匯入方式 Tab ──────────────────────────────┐  │
│               │  │ [上傳檔案]  [Confluence 頁面]                │  │
│               │  └────────────────────────────────────────────┘  │
│               │                                                   │
│               │  ┌─ Tab: 上傳檔案 ─────────────────────────────┐  │
│               │  │                                              │  │
│               │  │  ┌─ FileUpload 拖放區域 ──────────────────┐ │  │
│               │  │  │     ☁️ 拖放檔案至此或點擊選擇           │ │  │
│               │  │  │     支援 PDF、HTML（最大 50MB）         │ │  │
│               │  │  └────────────────────────────────────────┘ │  │
│               │  │                                              │  │
│               │  │  版本名稱 *                                  │  │
│               │  │  ┌──────────────────────────────────┐       │  │
│               │  │  │ 3.2                              │       │  │
│               │  │  └──────────────────────────────────┘       │  │
│               │  │  最多 50 字元                                │  │
│               │  │                                              │  │
│               │  │                        [預覽（Dry Run）]     │  │
│               │  └────────────────────────────────────────────┘  │
│               │                                                   │
│               │  ┌─ Tab: Confluence 頁面 ──────────────────────┐  │
│               │  │                                              │  │
│               │  │  Confluence Page ID *                        │  │
│               │  │  ┌──────────────────────────────────┐       │  │
│               │  │  │ 12345                            │       │  │
│               │  │  └──────────────────────────────────┘       │  │
│               │  │  連線狀態：🟢 已設定 / 🔴 未設定環境變數     │  │
│               │  │                                              │  │
│               │  │  版本名稱 *                                  │  │
│               │  │  ┌──────────────────────────────────┐       │  │
│               │  │  │ 3.2                              │       │  │
│               │  │  └──────────────────────────────────┘       │  │
│               │  │                                              │  │
│               │  │                        [預覽（Dry Run）]     │  │
│               │  └────────────────────────────────────────────┘  │
│               │                                                   │
│               │  ┌─ ImportPreview（dry_run 後顯示）─────────────┐ │
│               │  │  Summary 卡片 | Warnings | 預覽表格          │ │
│               │  │                        [取消] [確認匯入]     │ │
│               │  └────────────────────────────────────────────┘  │
│               │                                                   │
│               │  ┌─ 匯入結果（成功後顯示）─────────────────────┐ │
│               │  │  ✅ 版本「3.2」已建立，共 30 筆 model 設定  │ │
│               │  │  [前往版本設定頁面]                           │ │
│               │  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## 使用元件

| 元件 | 用途 | 來源 |
|------|------|------|
| `SidebarNav` | 左側導航 | `design/components/sidebar-nav.md` |
| `FileUpload` | 檔案拖放上傳 | `design/components/file-upload.md` |
| `ImportPreview` | 匯入預覽表格 + Summary | `design/components/import-preview.md` |
| `Tabs` | 匯入方式切換 | shadcn/ui `Tabs` |
| `Input` | 版本名稱 / Page ID 輸入 | shadcn/ui `Input` |
| `Label` | 表單標籤 | shadcn/ui `Label` |
| `Badge` | 連線狀態指示 | shadcn/ui `Badge` |
| `Button` | 動作按鈕 | shadcn/ui `Button` |

## 資料流

```
Client Component (page.tsx)
  │
  ├─ Tab: 上傳檔案
  │   └─ 選擇檔案 → POST /api/v1/import/confluence (multipart, dry_run=true)
  │       └─ 顯示 ImportPreview
  │           └─ 確認 → POST /api/v1/import/confluence (multipart, dry_run=false)
  │
  └─ Tab: Confluence 頁面
      └─ 輸入 Page ID → POST /api/v1/import/confluence (JSON, dry_run=true)
          └─ 顯示 ImportPreview
              └─ 確認 → POST /api/v1/import/confluence (JSON, dry_run=false)
```

## 狀態

| 狀態 | 條件 | 呈現 |
|------|------|------|
| Initial | 頁面載入 | 顯示 Tab + 空表單 |
| File Selected | 選擇檔案 | FileUpload 顯示檔案名稱，啟用預覽按鈕 |
| Previewing | dry_run API 呼叫中 | Loading spinner |
| Preview Ready | dry_run 回傳成功 | 顯示 ImportPreview（summary + 表格 + warnings） |
| Importing | 確認匯入中 | 按鈕 loading 狀態 |
| Success | 匯入成功 | 成功訊息 + 連結到版本頁面 |
| Error | API 回傳錯誤 | 紅色 Alert 錯誤訊息 + 重試按鈕 |

## 互動行為

1. **Tab 切換** — 切換「上傳檔案」和「Confluence 頁面」模式，清空已輸入資料
2. **檔案拖放/選擇** — 觸發 FileUpload 元件，自動啟用「預覽」按鈕
3. **點擊「預覽」** — 呼叫 API with `dry_run=true`，顯示 ImportPreview
4. **確認匯入** — 呼叫 API with `dry_run=false`，匯入完成後顯示結果
5. **Confluence 連線狀態** — 載入頁面時檢查 `/api/v1/health` 回傳的 confluence 設定狀態

## 表單驗證

| 欄位 | 規則 | 錯誤訊息 |
|------|------|---------|
| version_name | 必填 | 請輸入版本名稱 |
| version_name | max 50 chars | 版本名稱不得超過 50 字元 |
| file | 必填（上傳模式）| 請選擇檔案 |
| file | PDF/HTML only | 僅支援 PDF 與 HTML 檔案 |
| confluence_page_id | 必填（API 模式）| 請輸入 Confluence Page ID |

## 錯誤處理

| 錯誤碼 | 使用者提示 |
|--------|-----------|
| INVALID_INPUT | 請檢查輸入欄位是否正確填寫 |
| INVALID_FILE | 檔案格式不支援，請使用 PDF 或 HTML 檔案 |
| DUPLICATE | 版本「{name}」已存在，請使用不同的版本名稱 |
| PARSE_ERROR | 無法從檔案中解析出表格結構，請確認檔案格式是否正確 |
| CONFLUENCE_ERROR | 無法連線到 Confluence，請確認環境變數設定是否正確 |

## 響應式

| 斷點 | 配置 |
|------|------|
| `sm` (< 768px) | Tab 全寬、Summary 卡片單欄堆疊、表格水平捲動 |
| `md` (768-1024px) | Summary 卡片 2 欄、表格可見 4 欄 |
| `lg` (> 1024px) | 完整 layout、Summary 卡片 3 欄、表格 6 欄全顯示 |
