"use client";

import React from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  ExpandedState,
  getExpandedRowModel,
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
import { Badge } from "@/components/ui/badge";
import { ModelTypeBadge } from "@/components/model-type-badge";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
export interface SettingRow {
  id: string;
  model_component: {
    id: string;
    name: string;
    type: string;
    component_version: string | null;
    image: string | null;
  };
  environment: { id: string; name: string };
  edition: { id: string; name: string };
  deploy: boolean;
  gpu_list: string[];
  replica: number;
  gpu_memory_utilization: number | null;
  extra_settings: Record<string, unknown>;
  updated_at: string;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface SettingsTableProps {
  data: SettingRow[];
  pagination: Pagination;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onSortingChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onEditSetting?: (setting: SettingRow) => void;
}

// Sub-components
function DeployIndicator({ deploy }: { deploy: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full",
          deploy
            ? "bg-green-500 dark:bg-green-400"
            : "bg-slate-300 dark:bg-slate-600"
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{deploy ? "已部署" : "未部署"}</span>
    </div>
  );
}

function GpuMemBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400">-</span>;
  const percent = (value * 100).toFixed(0);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 0.9
              ? "bg-red-500"
              : value >= 0.7
                ? "bg-yellow-500"
                : "bg-green-500"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums">{percent}%</span>
    </div>
  );
}

function GpuListTags({ gpuList }: { gpuList: string[] }) {
  if (!gpuList || gpuList.length === 0) {
    return <span className="text-xs text-slate-400">-</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {gpuList.map((gpu, i) => (
        <Badge key={i} variant="secondary" className="font-mono text-xs">
          {gpu}
        </Badge>
      ))}
    </div>
  );
}

// Settings detail (expanded row)
function SettingsDetail({ setting }: { setting: SettingRow }) {
  const { model_component, extra_settings } = setting;
  return (
    <div className="grid grid-cols-2 gap-4 p-4 text-sm lg:grid-cols-4">
      {model_component.image && (
        <div>
          <span className="text-xs font-medium text-slate-500">Image</span>
          <p className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
            {model_component.image}
          </p>
        </div>
      )}
      {model_component.component_version && (
        <div>
          <span className="text-xs font-medium text-slate-500">
            Component Version
          </span>
          <p className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">
            {model_component.component_version}
          </p>
        </div>
      )}
      {extra_settings && Object.keys(extra_settings).length > 0 && (
        <div className="col-span-2">
          <span className="text-xs font-medium text-slate-500">
            Extra Settings
          </span>
          <pre className="mt-1 overflow-auto rounded bg-slate-50 p-2 font-mono text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {JSON.stringify(extra_settings, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Column definitions
function createColumns(onEdit?: (setting: SettingRow) => void): ColumnDef<SettingRow>[] {
  return [
    {
      id: "expander",
      header: () => null,
      cell: ({ row }) => (
        <button
          onClick={() => row.toggleExpanded()}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label={row.getIsExpanded() ? "收合詳細資訊" : "展開詳細資訊"}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorFn: (row) => row.model_component.name,
      id: "name",
      header: "Model Name",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.original.model_component.name}
        </span>
      ),
    },
    {
      accessorFn: (row) => row.model_component.type,
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <ModelTypeBadge type={row.original.model_component.type} />
      ),
    },
    {
      accessorFn: (row) => row.environment.name,
      id: "environment",
      header: "Environment",
      enableSorting: false,
    },
    {
      accessorFn: (row) => row.edition.name,
      id: "edition",
      header: "Edition",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.edition.name}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "deploy",
      header: "Deploy",
      cell: ({ row }) => <DeployIndicator deploy={row.original.deploy} />,
    },
    {
      accessorKey: "gpu_list",
      header: "GPU List",
      cell: ({ row }) => <GpuListTags gpuList={row.original.gpu_list} />,
      enableSorting: false,
    },
    {
      accessorKey: "replica",
      header: "Replica",
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{row.original.replica}</span>
      ),
    },
    {
      accessorKey: "gpu_memory_utilization",
      header: "GPU Mem Util",
      cell: ({ row }) => (
        <GpuMemBar value={row.original.gpu_memory_utilization} />
      ),
    },
    ...(onEdit
      ? [
          {
            id: "actions",
            header: () => null,
            cell: ({ row }: { row: { original: SettingRow } }) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                aria-label="編輯設定"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ),
            enableSorting: false,
            size: 48,
          } as ColumnDef<SettingRow>,
        ]
      : []),
  ];
}

export function SettingsTable({
  data,
  pagination,
  isLoading = false,
  onPageChange,
  onPerPageChange,
  onSortingChange,
  sortBy = "name",
  sortOrder = "asc",
  onEditSetting,
}: SettingsTableProps) {
  const columns = React.useMemo(() => createColumns(onEditSetting), [onEditSetting]);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  // Convert external sort state to TanStack sorting state
  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === "desc" }]
    : [];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualSorting: true,
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      if (newSorting.length > 0) {
        onSortingChange(newSorting[0].id, newSorting[0].desc ? "desc" : "asc");
      } else {
        onSortingChange("name", "asc");
      }
    },
    onExpandedChange: setExpanded,
    state: { sorting, expanded },
    getRowCanExpand: () => true,
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
                      header.column.getCanSort() &&
                        "cursor-pointer select-none"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      width:
                        header.column.columnDef.size !== 150
                          ? header.column.columnDef.size
                          : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
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
              // Skeleton loading rows
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((_, j) => (
                    <TableCell key={j} className="py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    className={cn(
                      "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      index % 2 === 1 &&
                        "bg-slate-50/50 dark:bg-slate-800/25"
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
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={columns.length}>
                        <div className="rounded-md bg-slate-50 dark:bg-slate-900/50">
                          <SettingsDetail setting={row.original} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-slate-500"
                >
                  沒有符合條件的資料
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">
            第{" "}
            {pagination.total > 0
              ? (pagination.page - 1) * pagination.per_page + 1
              : 0}
            -{Math.min(pagination.page * pagination.per_page, pagination.total)}{" "}
            筆，共 {pagination.total} 筆
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">每頁</span>
            <Select
              value={String(pagination.per_page)}
              onValueChange={(v) => onPerPageChange(Number(v))}
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
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">上一頁</span>
            </Button>
            <span className="text-sm tabular-nums">
              {pagination.page} / {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange(pagination.page + 1)}
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
