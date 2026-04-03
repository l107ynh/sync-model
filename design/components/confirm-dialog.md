# ConfirmDialog 元件規格

## 概述
設定修改確認對話框，在使用者儲存編輯前顯示 diff 預覽（舊值 vs 新值），要求使用者二次確認。

## Props Interface

```typescript
interface ConfirmDialogProps {
  /** diff 資料：key 為欄位名，value 包含 old/new */
  diff: Record<string, { old: unknown; new: unknown }>;
  /** 確認回呼 */
  onConfirm: () => void | Promise<void>;
  /** 取消回呼 */
  onCancel: () => void;
  /** 是否正在送出 */
  isSubmitting?: boolean;
  /** 變更原因（選填，顯示於 diff 下方） */
  reason?: string;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 外層 | `<AlertDialog>` + `<AlertDialogContent>` | 警告級別對話框 |
| 標題 | `<AlertDialogHeader>` + `<AlertDialogTitle>` | "確認修改" |
| 描述 | `<AlertDialogDescription>` | "以下欄位將被修改，請確認無誤。" |
| Diff 預覽 | 自訂 `<DiffPreview>` | 見下方 |
| 取消 | `<AlertDialogCancel>` | "取消" |
| 確認 | `<AlertDialogAction>` | "確認修改" |

## Diff 預覽格式

```
┌──────────────────────────────────────────┐
│  確認修改                                │
│  以下欄位將被修改，請確認無誤。           │
│                                          │
│  ┌─ Diff ──────────────────────────────┐ │
│  │ deploy                              │ │
│  │   ▪ false → true                    │ │
│  │                                     │ │
│  │ replica                             │ │
│  │   ▪ 1 → 3                          │ │
│  │                                     │ │
│  │ reason: 增加 prod 副本數            │ │
│  └─────────────────────────────────────┘ │
│                                          │
│              [取消]  [確認修改]           │
└──────────────────────────────────────────┘
```

## 顏色標示

| 項目 | 顏色 | Token |
|------|------|-------|
| 舊值 (old) | 紅色背景 `bg-red-50 text-red-700` | `--diff-removed` |
| 新值 (new) | 綠色背景 `bg-green-50 text-green-700` | `--diff-added` |

## 範例程式碼

```tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmDialog({
  diff,
  onConfirm,
  onCancel,
  isSubmitting = false,
  reason,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open onOpenChange={() => onCancel()}>
      <AlertDialogContent data-testid="confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>確認修改</AlertDialogTitle>
          <AlertDialogDescription>
            以下欄位將被修改，請確認無誤。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div data-testid="diff-preview" className="space-y-3 rounded-lg border p-4">
          {Object.entries(diff).map(([key, { old: oldVal, new: newVal }]) => (
            <div key={key} className="space-y-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {key}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {JSON.stringify(oldVal)}
                </span>
                <span className="text-slate-400">→</span>
                <span className="rounded bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {JSON.stringify(newVal)}
                </span>
              </div>
            </div>
          ))}

          {reason && (
            <div className="border-t pt-3">
              <p className="text-xs text-slate-500">原因：{reason}</p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>取消</AlertDialogCancel>
          <AlertDialogAction
            data-testid="btn-confirm"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "送出中..." : "確認修改"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## Accessibility

- AlertDialog 自動 trap focus
- Esc 鍵觸發 onCancel
- 確認按鈕在送出中時 `aria-disabled="true"`
- diff 區域具有 `role="region"` + `aria-label="變更預覽"`
