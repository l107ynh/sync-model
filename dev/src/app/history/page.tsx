"use client";

import { useState, useCallback } from "react";
import { useHistory } from "@/hooks/use-history";
import { HistoryTimeline } from "@/components/history-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CHANGE_TYPES = ["CREATE", "UPDATE", "DELETE"] as const;

const changeTypeBadgeStyles: Record<string, string> = {
  CREATE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  UPDATE:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  DELETE:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const changeTypeLabels: Record<string, string> = {
  CREATE: "新增",
  UPDATE: "修改",
  DELETE: "刪除",
};

export default function HistoryPage() {
  const [changeType, setChangeType] = useState<string | undefined>();
  const [changedBy, setChangedBy] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, pagination, isLoading, error, refetch } = useHistory({
    changeType: changeType || undefined,
    changedBy: changedBy || undefined,
    fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
    toDate: toDate ? new Date(toDate + "T23:59:59").toISOString() : undefined,
    page,
    perPage,
  });

  const hasFilters = changeType || changedBy || fromDate || toDate;

  const clearFilters = useCallback(() => {
    setChangeType(undefined);
    setChangedBy("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }, []);

  const handleChangeType = (type: string) => {
    setChangeType((prev) => (prev === type ? undefined : type));
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            變更歷史
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            追蹤所有 model 設定的變更記錄
          </p>
        </div>
        {pagination && (
          <span className="text-sm text-slate-500">
            共 {pagination.total} 筆記錄
          </span>
        )}
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        {/* 日期範圍 */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="h-8 w-36 text-sm"
            placeholder="起始日期"
          />
          <span className="text-sm text-slate-400">~</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="h-8 w-36 text-sm"
            placeholder="結束日期"
          />
        </div>

        {/* 操作者 */}
        <Input
          type="text"
          value={changedBy}
          onChange={(e) => {
            setChangedBy(e.target.value);
            setPage(1);
          }}
          className="h-8 w-40 text-sm"
          placeholder="操作者"
        />

        {/* 變更類型 toggle */}
        <div className="flex items-center gap-1.5">
          {CHANGE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleChangeType(type)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                changeType === type
                  ? changeTypeBadgeStyles[type]
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              )}
            >
              {changeTypeLabels[type]}
            </button>
          ))}
        </div>

        {/* 清除篩選 */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-slate-500"
          >
            <X className="mr-1 h-3 w-3" />
            清除篩選
          </Button>
        )}
      </div>

      {/* 錯誤狀態 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="mt-2"
          >
            重試
          </Button>
        </div>
      )}

      {/* 時間軸 */}
      <HistoryTimeline items={data} isLoading={isLoading} />

      {/* 空狀態 */}
      {!isLoading && !error && data.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500">
            {hasFilters
              ? "篩選條件下沒有變更記錄"
              : "目前沒有任何變更記錄"}
          </p>
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-3"
            >
              清除篩選
            </Button>
          )}
        </div>
      )}

      {/* 分頁 */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="text-sm text-slate-500">
            第 {(page - 1) * perPage + 1}-
            {Math.min(page * perPage, pagination.total)} 筆，共{" "}
            {pagination.total} 筆
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {page} / {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((p) => Math.min(pagination.total_pages, p + 1))
              }
              disabled={page >= pagination.total_pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
