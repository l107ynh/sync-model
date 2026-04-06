# ExportPreview 元件規格

## 概述
Confluence 匯出預覽元件，顯示匯出的 HTML 表格內容即時預覽。支援 Confluence Storage Format 的表格呈現，讓使用者在匯出前確認內容。

## Props Interface

```typescript
interface ExportPreviewProps {
  /** HTML 內容（Confluence Storage Format） */
  htmlContent: string;
  /** 匯出格式 */
  format: 'html' | 'pdf' | 'confluence_api';
  /** 版本資訊 */
  version: { id: string; name: string };
  /** 產生時間 */
  generatedAt?: string;
  /** 是否載入中 */
  isLoading?: boolean;
  /** 匯出/下載回呼 */
  onExport: () => void;
  /** Confluence 更新成功後的頁面 URL */
  confluencePageUrl?: string;
  /** 匯出狀態 */
  exportStatus?: 'idle' | 'exporting' | 'success' | 'error';
  /** 錯誤訊息 */
  errorMessage?: string;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 預覽容器 | `<Card>` | 白底卡片，含 overflow scroll |
| 預覽表頭 | `<CardHeader>` | 版本名稱 + 產生時間 |
| HTML 預覽 | `<div dangerouslySetInnerHTML>` | 安全渲染 HTML 表格 |
| 格式提示 | `<Badge>` | 顯示 HTML / PDF / Confluence API |
| 匯出按鈕 | `<Button>` | 下載/更新 |
| 成功訊息 | `<Alert>` | Confluence 更新成功 + 頁面連結 |
| 骨架屏 | `<Skeleton>` | 載入中佔位 |

## 頁面結構

```
┌─ 預覽卡片 ─────────────────────────────────────────────────┐
│ ┌─ 卡片標題 ──────────────────────────────────────────────┐│
│ │ 匯出預覽 — v3.2                     [HTML] 2026-04-02  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌─ HTML 表格預覽（可捲動）────────────────────────────────┐│
│ │ Component │ ID              │ Model       │ Images │ ...││
│ │ ASR core  │ asr-general-1.2 │ asr-general │ reg... │ ...││
│ │ TTS core  │ tts-general-1.3 │ tts-general │ reg... │ ...││
│ │ LLM       │ llm-chat-2.0    │ llm-chat    │ reg... │ ...││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌─ PDF 格式提示（僅 format=pdf 時顯示）──────────────────┐│
│ │ ℹ️ PDF 將以 A4 橫向排版產生，包含所有表格欄位           ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│                              [下載 HTML] 或 [下載 PDF]     │
│                              或 [更新 Confluence 頁面]     │
└────────────────────────────────────────────────────────────┘
```

## 範例程式碼

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download, ExternalLink, FileText, Globe,
  Loader2, CheckCircle2, Info,
} from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";

const FORMAT_LABELS: Record<string, { label: string; icon: typeof FileText }> = {
  html: { label: "HTML", icon: FileText },
  pdf: { label: "PDF", icon: FileText },
  confluence_api: { label: "Confluence API", icon: Globe },
};

export function ExportPreview({
  htmlContent,
  format: exportFormat,
  version,
  generatedAt,
  isLoading = false,
  onExport,
  confluencePageUrl,
  exportStatus = "idle",
  errorMessage,
}: ExportPreviewProps) {
  const formatInfo = FORMAT_LABELS[exportFormat] ?? FORMAT_LABELS.html;
  const FormatIcon = formatInfo.icon;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // 使用 DOMPurify 清理 HTML 避免 XSS
  const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "p", "ol", "ul", "li", "colgroup", "col"],
    ALLOWED_ATTR: ["colspan", "rowspan", "class"],
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg">匯出預覽 — {version.name}</CardTitle>
          <Badge variant="outline">
            <FormatIcon className="mr-1 h-3 w-3" />
            {formatInfo.label}
          </Badge>
        </div>
        {generatedAt && (
          <span className="text-sm text-muted-foreground">
            {format(new Date(generatedAt), "yyyy-MM-dd HH:mm")}
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* HTML 表格預覽 */}
        <div
          className="max-h-[500px] overflow-auto rounded-md border p-4
                     [&_table]:w-full [&_table]:border-collapse
                     [&_th]:border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-medium
                     [&_td]:border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
                     [&_tr:hover]:bg-muted/50"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />

        {/* PDF 格式提示 */}
        {exportFormat === "pdf" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              PDF 將以 A4 橫向排版產生，包含所有 6 欄表格欄位。
            </AlertDescription>
          </Alert>
        )}

        {/* Confluence 更新成功 */}
        {exportStatus === "success" && confluencePageUrl && (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center gap-2 text-green-800">
              Confluence 頁面已更新！
              <a
                href={confluencePageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 underline"
              >
                前往頁面 <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* 錯誤訊息 */}
        {exportStatus === "error" && errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* 匯出按鈕 */}
        <div className="flex justify-end">
          <Button
            onClick={onExport}
            disabled={exportStatus === "exporting"}
          >
            {exportStatus === "exporting" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {exportFormat === "html" && (
              <>
                <Download className="mr-2 h-4 w-4" /> 下載 HTML
              </>
            )}
            {exportFormat === "pdf" && (
              <>
                <Download className="mr-2 h-4 w-4" /> 下載 PDF
              </>
            )}
            {exportFormat === "confluence_api" && (
              <>
                <Globe className="mr-2 h-4 w-4" /> 更新 Confluence 頁面
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 安全性

- HTML 內容使用 `DOMPurify` 清理，僅允許表格相關標籤
- 過濾 Confluence 自訂標籤（`<ac:structured-macro>` 等）
- 連結使用 `rel="noopener noreferrer"`

## 無障礙（A11y）

- 預覽區域使用 `role="region"` + `aria-label="匯出預覽"`
- 表格保留語義化 `<th>` / `<td>` 結構
- 匯出按鈕有明確的動作文字

## 設計 Tokens

| Token | 值 | 用途 |
|-------|------|------|
| `--export-preview-max-h` | `500px` | 預覽區最大高度 |
| `--export-table-header-bg` | `hsl(var(--muted))` | 表頭背景色 |
| `--export-table-hover` | `hsl(var(--muted) / 0.5)` | 列 hover 背景 |
