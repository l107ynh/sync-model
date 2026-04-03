# DataTable — Model 設定表格

## 概述
以 TanStack Table v8 + shadcn/ui Table 為基礎的資料表格，用於顯示 Model Settings 清單。支援欄位排序、篩選、分頁、展開 row 查看細節。

## Props Interface

```typescript
interface DataTableProps<TData> {
  /** 表格資料 */
  data: TData[];
  /** TanStack Table column definitions */
  columns: ColumnDef<TData>[];
  /** 是否載入中 */
  isLoading?: boolean;
  /** 分頁資訊 */
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  /** 分頁變更 callback */
  onPaginationChange: (page: number, perPage: number) => void;
  /** 排序變更 callback */
  onSortingChange: (sorting: SortingState) => void;
  /** 當前排序狀態 */
  sorting?: SortingState;
  /** 啟用 row 展開 */
  expandable?: boolean;
  /** 展開 row 的 render function */
  renderExpandedRow?: (row: TData) => React.ReactNode;
  /** 空狀態文字 */
  emptyMessage?: string;
}
```

## 欄位定義（Model Settings 專用）

| 欄位 | Key | 寬度 | 排序 | 說明 |
|------|-----|------|------|------|
| Model Name | `model_component.name` | auto (min 160px) | yes | 主要識別欄位，粗體 |
| Type | `model_component.type` | 120px | yes | 用 ModelTypeBadge 顯示 |
| Environment | `environment.name` | 100px | yes | 純文字 |
| Edition | `edition.name` | 100px | yes | 純文字 |
| Deploy | `deploy` | 80px | yes | 綠/灰圓點 + aria-label |
| GPU List | `gpu_list` | 140px | no | Badge 列表 |
| Replica | `replica` | 80px | yes | 數字，右對齊 |
| GPU Mem | `gpu_memory_utilization` | 120px | yes | Progress bar + 百分比 |

## shadcn/ui 映射

| 子元件 | shadcn 元件 | 用途 |
|--------|------------|------|
| 表格容器 | `<Table>` | 外框 + scroll |
| 表頭 | `<TableHeader>` + `<TableHead>` | 可點擊排序 |
| 資料列 | `<TableBody>` + `<TableRow>` + `<TableCell>` | 資料呈現 |
| 排序圖示 | `lucide-react: ArrowUpDown, ArrowUp, ArrowDown` | 表頭排序指示 |
| 載入 | `<Skeleton>` | 載入中骨架畫面 |
| 展開按鈕 | `<Button variant="ghost">` + `ChevronRight` icon | 展開/收合 |

## React + Tailwind 範例

```tsx
"use client";

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
} from "@tanstack/react-table";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import { ModelTypeBadge } from "./model-type-badge";
import { cn } from "@/lib/utils";

// --- Column Definitions (Model Settings) ---

export const settingsColumns: ColumnDef<ModelSetting>[] = [
  {
    id: "expand",
    header: () => null,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => row.toggleExpanded()}
        aria-label={row.getIsExpanded() ? "收合詳細" : "展開詳細"}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform",
            row.getIsExpanded() && "rotate-90"
          )}
        />
      </Button>
    ),
    size: 40,
  },
  {
    accessorFn: (row) => row.model_component.name,
    id: "name",
    header: ({ column }) => <SortableHeader column={column} label="Model Name" />,
    cell: ({ getValue }) => (
      <span className="font-medium text-foreground">{getValue<string>()}</span>
    ),
  },
  {
    accessorFn: (row) => row.model_component.type,
    id: "type",
    header: ({ column }) => <SortableHeader column={column} label="Type" />,
    cell: ({ getValue }) => <ModelTypeBadge type={getValue<string>()} />,
    size: 120,
  },
  {
    accessorFn: (row) => row.environment.name,
    id: "environment",
    header: "Environment",
    size: 100,
  },
  {
    accessorFn: (row) => row.edition.name,
    id: "edition",
    header: "Edition",
    size: 100,
  },
  {
    accessorKey: "deploy",
    header: ({ column }) => <SortableHeader column={column} label="Deploy" />,
    cell: ({ getValue }) => {
      const deployed = getValue<boolean>();
      return (
        <span
          className={cn(
            "inline-block h-2.5 w-2.5 rounded-full",
            deployed ? "bg-green-500" : "bg-slate-300"
          )}
          aria-label={deployed ? "已部署" : "未部署"}
          role="status"
        />
      );
    },
    size: 80,
  },
  {
    accessorKey: "gpu_list",
    header: "GPU List",
    cell: ({ getValue }) => (
      <div className="flex flex-wrap gap-1">
        {getValue<string[]>().map((gpu) => (
          <span
            key={gpu}
            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
          >
            {gpu}
          </span>
        ))}
      </div>
    ),
    size: 140,
    enableSorting: false,
  },
  {
    accessorKey: "replica",
    header: ({ column }) => <SortableHeader column={column} label="Replica" />,
    cell: ({ getValue }) => (
      <span className="tabular-nums text-right block">{getValue<number>()}</span>
    ),
    size: 80,
  },
  {
    accessorKey: "gpu_memory_utilization",
    header: ({ column }) => <SortableHeader column={column} label="GPU Mem" />,
    cell: ({ getValue }) => {
      const value = getValue<number>();
      const pct = Math.round(value * 100);
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-slate-100">
            <div
              className={cn(
                "h-2 rounded-full",
                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="tabular-nums text-xs text-muted-foreground">
            {pct}%
          </span>
        </div>
      );
    },
    size: 120,
  },
];

// --- Sortable Header Helper ---

function SortableHeader({ column, label }: { column: any; label: string }) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-xs font-medium uppercase tracking-wide"
      onClick={() => column.toggleSorting()}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 h-3 w-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
      )}
    </Button>
  );
}

// --- Expanded Row ---

function ExpandedRowContent({ setting }: { setting: ModelSetting }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 text-sm">
      <div>
        <p className="text-muted-foreground text-xs mb-1">Image</p>
        <code className="text-xs bg-slate-100 px-2 py-1 rounded">
          {setting.model_component.image}
        </code>
      </div>
      <div>
        <p className="text-muted-foreground text-xs mb-1">Component Version</p>
        <span>{setting.model_component.component_version}</span>
      </div>
      <div>
        <p className="text-muted-foreground text-xs mb-1">Extra Settings</p>
        <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-32">
          {JSON.stringify(setting.extra_settings, null, 2)}
        </pre>
      </div>
      <div>
        <p className="text-muted-foreground text-xs mb-1">最後更新</p>
        <span>{new Date(setting.updated_at).toLocaleString("zh-TW")}</span>
      </div>
    </div>
  );
}
```

## 互動行為

| 行為 | 說明 |
|------|------|
| 排序 | 點擊表頭切換 asc → desc → none |
| 展開 | 點擊列前的 chevron，展開該 row 顯示 Image / Extra Settings 等細節 |
| Hover | 整列 `bg-muted/50` highlight |
| 載入 | 顯示 6 列 Skeleton row |
| 空狀態 | 居中顯示「目前沒有符合條件的 Model 設定」 |
| 分頁 | 表格底部，見 Pagination 元件 |

## Accessibility

- `<table>` 加 `role="table"`，`<th>` 加 `scope="col"`
- 排序按鈕有 `aria-sort` 屬性
- Deploy 圓點有 `aria-label="已部署"` / `"未部署"`
- 展開按鈕有 `aria-expanded` 和 `aria-label`
- 鍵盤可 Tab 到排序按鈕和展開按鈕
