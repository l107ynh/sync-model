# ImportPreview 元件規格

## 概述
Confluence 匯入預覽元件，顯示 PDF/Confluence 頁面解析後的 model 設定表格、summary 統計卡片、warnings 清單。用於 dry_run 預覽及匯入結果確認。

## Props Interface

```typescript
interface ParsedComponent {
  component: string;
  id: string;
  model: string;
  model_type: string;
  component_version: string;
  image: string;
  settings: Record<string, unknown>;
  resource: Record<string, unknown>;
  status: 'matched' | 'unmatched' | 'warning';
}

interface ImportSummary {
  model_components_count: number;
  parsed_tables: number;
  skipped_rows: number;
  warnings: string[];
}

interface ImportPreviewProps {
  /** 預覽狀態 */
  status: 'dry_run' | 'success';
  /** 統計摘要 */
  summary: ImportSummary;
  /** 解析出的 model 資料 */
  parsedData: ParsedComponent[];
  /** 版本資訊（匯入成功後） */
  version?: { id: string; name: string };
  /** 確認匯入回呼（dry_run 時顯示） */
  onConfirmImport?: () => void;
  /** 取消回呼 */
  onCancel?: () => void;
  /** 正在匯入中 */
  isImporting?: boolean;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| Summary 卡片群組 | `<Card>` x 3 | 元件數 / 表格數 / 略過列數 |
| Warnings 清單 | `<Alert variant="warning">` | 黃色警告列表 |
| 預覽表格 | `<Table>` | 6 欄 Confluence 格式表格 |
| 狀態 Badge | `<Badge>` | matched / unmatched / warning |
| 確認按鈕 | `<Button>` | 確認匯入 |
| 取消按鈕 | `<Button variant="outline">` | 取消 |

## 頁面結構

```
┌─ Summary 統計卡片 ─────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ 📦 30        │ │ 📊 3         │ │ ⚠️ 2          │          │
│ │ Model 元件數 │ │ 解析表格數   │ │ 略過列數      │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
└────────────────────────────────────────────────────────────┘

┌─ Warnings（如有）──────────────────────────────────────────┐
│ ⚠ Row 5: Component 'unknown-model' 無法匹配到已知 model    │
│ ⚠ Row 12: "同3.0" 引用值無法自動解析                        │
└────────────────────────────────────────────────────────────┘

┌─ 預覽表格 ─────────────────────────────────────────────────┐
│ Component │ ID              │ Model       │ Status          │
│ ASR core  │ asr-general-1.2 │ asr-general │ ✅ matched      │
│ TTS core  │ tts-general-1.3 │ tts-general │ ✅ matched      │
│ Unknown   │ unknown-1.0     │ ???         │ ⚠️ unmatched    │
└────────────────────────────────────────────────────────────┘

┌─ 動作列 ──────────────────────────────────────────────────┐
│                              [取消]  [確認匯入]            │
└────────────────────────────────────────────────────────────┘
```

## 範例程式碼

```tsx
"use client";

import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, BarChart3, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export function ImportPreview({
  status,
  summary,
  parsedData,
  version,
  onConfirmImport,
  onCancel,
  isImporting = false,
}: ImportPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Summary 卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Package className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{summary.model_components_count}</p>
              <p className="text-sm text-muted-foreground">Model 元件數</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{summary.parsed_tables}</p>
              <p className="text-sm text-muted-foreground">解析表格數</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{summary.skipped_rows}</p>
              <p className="text-sm text-muted-foreground">略過列數</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <div className="space-y-2">
          {summary.warnings.map((w, i) => (
            <Alert key={i} className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">{w}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 預覽表格 */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Model Type</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parsedData.map((row, i) => (
            <TableRow key={i}>
              <TableCell>{row.component}</TableCell>
              <TableCell className="font-mono text-xs">{row.id}</TableCell>
              <TableCell>{row.model}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.model_type}</Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate font-mono text-xs">
                {row.image}
              </TableCell>
              <TableCell>
                {row.status === 'matched' && (
                  <Badge className="bg-green-100 text-green-800">matched</Badge>
                )}
                {row.status === 'unmatched' && (
                  <Badge className="bg-amber-100 text-amber-800">unmatched</Badge>
                )}
                {row.status === 'warning' && (
                  <Badge className="bg-red-100 text-red-800">warning</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
          {parsedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                未解析到任何 model 設定資料
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* 動作列 */}
      {status === 'dry_run' && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isImporting}>
            取消
          </Button>
          <Button onClick={onConfirmImport} disabled={isImporting}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認匯入
          </Button>
        </div>
      )}

      {/* 匯入成功提示 */}
      {status === 'success' && version && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            匯入成功！版本「{version.name}」已建立，共 {summary.model_components_count} 筆 model 設定。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

## 無障礙（A11y）

- Summary 卡片使用 `aria-label` 描述統計數據
- 表格使用語義化 `<th>` 表頭
- Warnings 使用 `role="alert"` 確保螢幕閱讀器朗讀
- 確認/取消按鈕有明確文字標籤

## 設計 Tokens

| Token | 值 | 用途 |
|-------|------|------|
| `--preview-warning-bg` | `hsl(var(--amber-50))` | Warning 背景 |
| `--preview-warning-border` | `hsl(var(--amber-300))` | Warning 邊框 |
| `--preview-success-bg` | `hsl(var(--green-50))` | 成功背景 |
| `--preview-matched` | `hsl(var(--green-100))` | Matched badge 背景 |
| `--preview-unmatched` | `hsl(var(--amber-100))` | Unmatched badge 背景 |
