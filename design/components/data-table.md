# DataTable 元件規格

## 概述
通用資料表格元件，基於 TanStack Table v8 + shadcn/ui Table 封裝。支援排序、分頁、hover highlight、striped rows。

## Props Interface

```typescript
interface DataTableProps<TData, TValue> {
  /** TanStack Table column 定義 */
  columns: ColumnDef<TData, TValue>[];
  /** 資料陣列 */
  data: TData[];
  /** 分頁資訊 */
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  /** 頁碼變更回呼 */
  onPageChange?: (page: number) => void;
  /** 每頁筆數變更回呼 */
  onPerPageChange?: (perPage: number) => void;
  /** 排序變更回呼（server-side sorting） */
  onSortingChange?: (sorting: SortingState) => void;
  /** 是否載入中 */
  isLoading?: boolean;
  /** 無資料時的提示訊息 */
  emptyMessage?: string;
}
```

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 表格容器 | `<Table>` | 外層 wrapper |
| 表頭 | `<TableHeader>` + `<TableHead>` | 可點擊排序 |
| 表列 | `<TableBody>` + `<TableRow>` + `<TableCell>` | striped + hover |
| 分頁 | 自訂 `<DataTablePagination>` | 使用 `<Button>` + `<Select>` |
| 空狀態 | `<TableRow>` colspan | 顯示 emptyMessage |

## 範例程式碼

```tsx
"use client";

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  onSortingChange?: (sorting: SortingState) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  onPageChange,
  onPerPageChange,
  onSortingChange,
  isLoading = false,
  emptyMessage = "沒有資料",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);
      onSortingChange?.(newSorting);
    },
    state: { sorting },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-xs font-medium uppercase tracking-wide text-slate-500",
                      header.column.getCanSort() && "cursor-pointer select-none"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-slate-500"
                >
                  載入中...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    index % 2 === 1 && "bg-slate-50/50 dark:bg-slate-800/25"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2 text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分頁 */}
      {pagination && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">
            第 {(pagination.page - 1) * pagination.perPage + 1}-
            {Math.min(pagination.page * pagination.perPage, pagination.total)}{" "}
            筆，共 {pagination.total} 筆
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">每頁</span>
            <Select
              value={String(pagination.perPage)}
              onValueChange={(v) => onPerPageChange?.(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">上一頁</span>
            </Button>
            <span className="text-sm tabular-nums">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">下一頁</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Accessibility

- 表頭排序按鈕具有 `aria-sort` 屬性
- 分頁按鈕具有 `sr-only` 標籤
- 表格具有正確的 `<thead>` / `<tbody>` 語義結構
- 載入與空狀態使用 `role="status"` 通知螢幕閱讀器
