# CodegenPreview 元件規格

## 概述
程式碼變更預覽元件，顯示 codegen 產生的 cdk8s TypeScript 檔案差異。支援多檔案清單、syntax highlighted diff、以及變更摘要。用於建立 MR 前讓使用者確認產生的程式碼正確。

## Props Interface

```typescript
interface CodegenPreviewProps {
  /** codegen preview 回傳的檔案清單 */
  files: CodegenFile[];
  /** 變更摘要 */
  summary: CodegenSummary;
  /** 警告訊息（如 model 不存在等） */
  warnings?: string[];
  /** 是否顯示載入狀態 */
  loading?: boolean;
  /** 確認按鈕回呼 */
  onConfirm?: () => void;
  /** 取消按鈕回呼 */
  onCancel?: () => void;
}

interface CodegenFile {
  path: string;
  action: "create" | "modify" | "delete";
  diff: string;
  full_content?: string;
}

interface CodegenSummary {
  files_changed: number;
  insertions: number;
  deletions: number;
}
```

## 元件結構

```
┌─────────────────────────────────────────────────────────────────┐
│ Codegen Preview                                                 │
│                                                                 │
│ ┌─ 變更摘要 ───────────────────────────────────────────────┐   │
│ │  📄 1 file changed   +3 insertions   -2 deletions        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ 警告（如有）────────────────────────────────────────────┐   │
│ │ ⚠ "new-model" 在 pro.ts 中不存在，將新增該 model         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ 檔案清單 ───────────────────────────────────────────────┐   │
│ │ ▼ src/components/inferno/gpu/pro.ts          [modify]     │   │
│ │ ┌─ Diff ──────────────────────────────────────────────┐   │   │
│ │ │  @@ -10,7 +10,7 @@                                  │   │   │
│ │ │    'asr-general': {                                  │   │   │
│ │ │      deploy: true,                                   │   │   │
│ │ │      gpuList: ['A100'],                              │   │   │
│ │ │ -    replica: 2,                                     │   │   │
│ │ │ +    replica: 3,                                     │   │   │
│ │ │      gpu_memory_utilization: 0.85,                   │   │   │
│ │ │    },                                                │   │   │
│ │ └──────────────────────────────────────────────────────┘   │   │
│ │                                                            │   │
│ │ ▶ src/components/inferno/gpu/std.ts          [modify]     │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│                              [取消]  [確認建立 MR]              │
└─────────────────────────────────────────────────────────────────┘
```

## 檔案動作標籤

| 動作 | Badge 樣式 | 文字 |
|------|-----------|------|
| `create` | `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300` | 新增 |
| `modify` | `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300` | 修改 |
| `delete` | `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300` | 刪除 |

## Diff 顯示

### Syntax Highlighting
- 使用 `shiki` 或 `prism-react-renderer` 對 TypeScript 做 syntax highlighting
- Diff 行上疊加背景色：
  - 新增行：`bg-green-50/80 dark:bg-green-900/20`
  - 刪除行：`bg-red-50/80 dark:bg-red-900/20`
  - Hunk header（`@@`）：`bg-blue-50/50 dark:bg-blue-900/10 text-blue-500`

### 行號
- 左側顯示舊檔行號，右側顯示新檔行號
- 使用 `font-mono tabular-nums text-xs text-slate-400` 樣式

## 摘要列

```tsx
function CodegenSummaryBar({ summary }: { summary: CodegenSummary }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-slate-50 px-4 py-3 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
        <FileIcon className="h-4 w-4" />
        <span>{summary.files_changed} file{summary.files_changed > 1 ? 's' : ''} changed</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
        <PlusIcon className="h-4 w-4" />
        <span>{summary.insertions}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
        <MinusIcon className="h-4 w-4" />
        <span>{summary.deletions}</span>
      </div>
    </div>
  );
}
```

## 檔案摺疊行為

- 第一個檔案預設展開，其餘摺疊
- 點擊檔案標題列切換展開/摺疊
- 使用 `Collapsible` (shadcn/ui) 實作

## 狀態

| 狀態 | 條件 | 呈現 |
|------|------|------|
| Loading | `loading === true` | Skeleton（摘要列 + 3 個檔案 placeholder） |
| Empty | `files.length === 0` | 「沒有程式碼變更」提示文字 |
| With Warnings | `warnings?.length > 0` | 黃色 alert banner 顯示警告 |
| Loaded | `files.length > 0` | 正常顯示 |

## 依賴

| 元件 | 來源 | 用途 |
|------|------|------|
| `Collapsible` | shadcn/ui | 檔案展開/摺疊 |
| `Badge` | shadcn/ui | 動作標籤 |
| `Button` | shadcn/ui | 確認/取消按鈕 |
| `Alert` | shadcn/ui | 警告訊息 |
| `shiki` / `prism-react-renderer` | npm | TypeScript syntax highlighting |

## Accessibility

- 摺疊區塊使用 `aria-expanded` 標記
- Diff 區塊使用 `role="code"` 和 `aria-label` 說明檔案路徑
- 新增/刪除行使用 `aria-label` 標記（「新增行」/「刪除行」），不僅依賴顏色
- 確認/取消按鈕有 focus ring
