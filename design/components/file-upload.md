# FileUpload 元件規格

## 概述
檔案上傳元件，支援 Drag & Drop 拖放和點擊選擇檔案。用於 Confluence 匯入頁面上傳 PDF/HTML 檔案。

## Props Interface

```typescript
interface FileUploadProps {
  /** 接受的檔案類型 MIME */
  accept?: string; // default: "application/pdf,text/html"
  /** 檔案大小上限（bytes） */
  maxSize?: number; // default: 50 * 1024 * 1024 (50MB)
  /** 檔案選取回呼 */
  onFileSelect: (file: File) => void;
  /** 上傳進度（0-100），由父層控制 */
  progress?: number;
  /** 上傳狀態 */
  status?: 'idle' | 'uploading' | 'success' | 'error';
  /** 錯誤訊息 */
  errorMessage?: string;
  /** 是否禁用 */
  disabled?: boolean;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 拖放區域 | 自訂 `<div>` + `<Input type="file">` | 虛線邊框容器 |
| 進度條 | `<Progress>` | 上傳進度指示 |
| 提示文字 | `<p>` + Lucide icon | 拖放引導文案 |
| 錯誤訊息 | `<Alert variant="destructive">` | 檔案驗證錯誤 |
| 檔案資訊 | `<Badge>` | 已選檔案名稱 + 大小 |

## 狀態呈現

| 狀態 | 外觀 |
|------|------|
| idle | 藍色虛線邊框、Upload Cloud icon、「拖放檔案至此或點擊選擇」 |
| dragover | 邊框變實線 + 背景色加深（blue-50）|
| uploading | 顯示 Progress bar + 百分比 |
| success | 綠色邊框 + CheckCircle icon + 檔案名稱 |
| error | 紅色邊框 + Alert 錯誤訊息 |

## 檔案驗證規則

| 規則 | 條件 | 錯誤訊息 |
|------|------|---------|
| 檔案類型 | 非 PDF 或 HTML | 僅支援 PDF 與 HTML 檔案 |
| 檔案大小 | > 50MB | 檔案大小不得超過 50MB |
| 檔案數量 | > 1 個 | 一次只能上傳一個檔案 |

## 範例程式碼

```tsx
"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function FileUpload({
  accept = "application/pdf,text/html",
  maxSize = 50 * 1024 * 1024,
  onFileSelect,
  progress,
  status = "idle",
  errorMessage,
  disabled = false,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      // 類型檢查
      const validTypes = accept.split(",").map((t) => t.trim());
      if (!validTypes.some((t) => file.type === t || file.name.endsWith(t.replace("application/", ".")))) {
        return; // 由父層處理錯誤
      }
      // 大小檢查
      if (file.size > maxSize) {
        return;
      }
      setSelectedFile(file);
      onFileSelect(file);
    },
    [accept, maxSize, onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [disabled, validateAndSelect],
  );

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
        isDragOver && "border-blue-500 bg-blue-50",
        status === "success" && "border-green-500 bg-green-50",
        status === "error" && "border-red-500 bg-red-50",
        status === "idle" && "border-blue-300 hover:border-blue-400",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) validateAndSelect(file);
        }}
      />

      {status === "idle" && (
        <>
          <Upload className="h-10 w-10 text-blue-400" />
          <p className="text-sm text-muted-foreground">
            拖放檔案至此，或<span className="text-blue-600 underline">點擊選擇</span>
          </p>
          <p className="text-xs text-muted-foreground">支援 PDF、HTML（最大 50MB）</p>
        </>
      )}

      {status === "uploading" && (
        <>
          <FileText className="h-8 w-8 text-blue-500" />
          <p className="text-sm">{selectedFile?.name}</p>
          <Progress value={progress} className="w-2/3" />
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <Badge variant="secondary">{selectedFile?.name}</Badge>
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="h-8 w-8 text-red-500" />
          <Alert variant="destructive" className="w-full">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
```

## 無障礙（A11y）

- `<input type="file">` 隱藏但保留 focus，按 Enter/Space 可觸發
- Drag & Drop 區域有 `role="button"` 和 `tabIndex={0}`
- 錯誤訊息使用 `role="alert"`
- 上傳進度使用 `aria-valuenow`

## 設計 Tokens

| Token | 值 | 用途 |
|-------|------|------|
| `--upload-border-idle` | `hsl(var(--blue-300))` | 預設邊框 |
| `--upload-border-active` | `hsl(var(--blue-500))` | 拖放中邊框 |
| `--upload-bg-active` | `hsl(var(--blue-50))` | 拖放中背景 |
| `--upload-border-success` | `hsl(var(--green-500))` | 上傳成功邊框 |
| `--upload-border-error` | `hsl(var(--destructive))` | 錯誤邊框 |
