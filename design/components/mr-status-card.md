# MrStatusCard 元件規格

## 概述
Merge Request 狀態卡片，在清單頁面和詳情中顯示單一 MR 的狀態摘要。包含狀態 badge、GitLab 連結、變更檔案數量等資訊。

## Props Interface

```typescript
interface MrStatusCardProps {
  /** MR 資料 */
  mr: MergeRequest;
  /** 是否為 compact 模式（清單用） */
  compact?: boolean;
  /** 同步狀態按鈕回呼 */
  onSyncStatus?: (mrId: string) => void;
  /** 重發通知按鈕回呼 */
  onResendNotification?: (mrId: string) => void;
}

interface MergeRequest {
  id: string;
  gitlab_mr_id: number;
  gitlab_mr_url: string;
  source_branch: string;
  target_branch: string;
  status: "PENDING" | "OPEN" | "MERGED" | "CLOSED";
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  files_changed?: Array<{ path: string; action: string }>;
  change_history_ids?: string[];
}
```

## Status Badge 設計

| 狀態 | 顏色 | 圖標 | Label |
|------|------|------|-------|
| `PENDING` | `bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400` | `Clock` | 等待中 |
| `OPEN` | `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300` | `GitPullRequest` | 審核中 |
| `MERGED` | `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300` | `GitMerge` | 已合併 |
| `CLOSED` | `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300` | `XCircle` | 已關閉 |

```tsx
const statusConfig: Record<string, { color: string; icon: React.ComponentType; label: string }> = {
  PENDING: {
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: Clock,
    label: "等待中",
  },
  OPEN: {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: GitPullRequest,
    label: "審核中",
  },
  MERGED: {
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    icon: GitMerge,
    label: "已合併",
  },
  CLOSED: {
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: XCircle,
    label: "已關閉",
  },
};
```

## Compact 模式（清單列表用）

```
┌────────────────────────────────────────────────────────────────┐
│  [審核中]  chore(sync-model): update asr-general    [GitLab ↗]│
│           sync-model/2026-04-02-abc123 → main                  │
│           by lynn.yang · 2 小時前 · 1 file changed             │
└────────────────────────────────────────────────────────────────┘
```

- 單行標題 + badge，hover 顯示完整標題
- 第二行：branch info
- 第三行：metadata（操作者、時間、檔案數）
- 右側：GitLab 外部連結按鈕

## 完整模式（詳情頁用）

```
┌────────────────────────────────────────────────────────────────┐
│  chore(sync-model): update asr-general settings                │
│                                                                │
│  ┌──────────┐  ┌──────────────────────────────────────────┐   │
│  │  [審核中] │  │ Branch: sync-model/2026-04-02-abc123     │   │
│  │  MR #123 │  │ Target: main                              │   │
│  └──────────┘  │ Created: 2026-04-02 10:30                 │   │
│                │ By: lynn.yang                              │   │
│                └──────────────────────────────────────────┘   │
│                                                                │
│  ┌─ 變更檔案 ──────────────────────────────────────────────┐  │
│  │ 📄 src/components/inferno/gpu/pro.ts          [modify]   │  │
│  │ 📄 src/components/inferno/gpu/std.ts          [modify]   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  [同步狀態]  [重發通知]  [在 GitLab 查看 ↗]                    │
└────────────────────────────────────────────────────────────────┘
```

## 變更檔案清單

```tsx
function FilesChangedList({ files }: { files: Array<{ path: string; action: string }> }) {
  const actionIcons: Record<string, string> = {
    create: "text-green-500",
    modify: "text-blue-500",
    delete: "text-red-500",
  };

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
        變更檔案（{files.length}）
      </h4>
      {files.map((file) => (
        <div
          key={file.path}
          className="flex items-center gap-2 rounded px-2 py-1 text-sm font-mono hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <FileIcon className={cn("h-4 w-4", actionIcons[file.action])} />
          <span className="truncate">{file.path}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {file.action}
          </Badge>
        </div>
      ))}
    </div>
  );
}
```

## GitLab 外部連結按鈕

```tsx
function GitLabLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <ExternalLinkIcon className="h-4 w-4" />
      在 GitLab 查看
    </a>
  );
}
```

## 操作按鈕

| 按鈕 | 條件 | 樣式 | 行為 |
|------|------|------|------|
| 同步狀態 | status !== MERGED && status !== CLOSED | `variant="outline"` | 呼叫 `POST /merge-requests/:id/sync-status` |
| 重發通知 | status === OPEN | `variant="outline"` | 呼叫 `POST /notifications/send` |
| 在 GitLab 查看 | 永遠顯示 | `variant="outline"` + ExternalLink icon | 開新分頁 |

## 依賴

| 元件 | 來源 | 用途 |
|------|------|------|
| `Badge` | shadcn/ui | 狀態 badge + 動作標籤 |
| `Button` | shadcn/ui | 操作按鈕 |
| `Card` | shadcn/ui | 外層容器 |
| `lucide-react` | npm | 圖標（Clock, GitPullRequest, GitMerge, XCircle, ExternalLink, File） |

## Accessibility

- Status badge 包含 `aria-label` 說明完整狀態（如「Merge Request 狀態：審核中」）
- GitLab 外部連結包含 `rel="noopener noreferrer"` 和 `aria-label="在 GitLab 開啟 MR #123"`
- 操作按鈕 disabled 時顯示 tooltip 說明原因
- Card hover 時 border 色加深提供視覺回饋
