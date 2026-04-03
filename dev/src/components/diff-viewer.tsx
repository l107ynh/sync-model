"use client";

import { cn } from "@/lib/utils";

interface DiffViewerProps {
  /** 舊物件 */
  oldObj: Record<string, unknown>;
  /** 新物件 */
  newObj: Record<string, unknown>;
  /** 顯示模式：inline 或 side-by-side */
  mode?: "inline" | "side-by-side";
}

interface DiffEntry {
  key: string;
  type: "added" | "removed" | "changed";
  oldValue?: unknown;
  newValue?: unknown;
}

function computeDiffEntries(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): DiffEntry[] {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const entries: DiffEntry[] = [];

  for (const key of allKeys) {
    const hasOld = key in oldObj;
    const hasNew = key in newObj;

    if (!hasOld && hasNew) {
      entries.push({ key, type: "added", newValue: newObj[key] });
    } else if (hasOld && !hasNew) {
      entries.push({ key, type: "removed", oldValue: oldObj[key] });
    } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      entries.push({
        key,
        type: "changed",
        oldValue: oldObj[key],
        newValue: newObj[key],
      });
    }
  }

  return entries;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(無)";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const typeStyles: Record<string, string> = {
  added:
    "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
  removed: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
  changed:
    "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
};

const typeLabels: Record<string, string> = {
  added: "新增",
  removed: "刪除",
  changed: "修改",
};

const typeTextStyles: Record<string, string> = {
  added: "text-green-700 dark:text-green-300",
  removed: "text-red-700 dark:text-red-300",
  changed: "text-amber-700 dark:text-amber-300",
};

export function DiffViewer({
  oldObj,
  newObj,
  mode = "inline",
}: DiffViewerProps) {
  const entries = computeDiffEntries(oldObj, newObj);

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">無差異</p>;
  }

  if (mode === "inline") {
    return (
      <div className="space-y-2" data-testid="diff-viewer">
        {entries.map((entry) => (
          <div
            key={entry.key}
            className={cn("rounded-md border p-2", typeStyles[entry.type])}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-medium">{entry.key}</span>
              <span className={cn("text-xs", typeTextStyles[entry.type])}>
                {typeLabels[entry.type]}
              </span>
            </div>
            <div className="mt-1 text-sm">
              {entry.type === "added" && (
                <span className="text-green-700 dark:text-green-300">
                  (無) &rarr; {formatValue(entry.newValue)}
                </span>
              )}
              {entry.type === "removed" && (
                <span className="text-red-700 dark:text-red-300">
                  {formatValue(entry.oldValue)} &rarr; (已刪除)
                </span>
              )}
              {entry.type === "changed" && (
                <span className="text-amber-700 dark:text-amber-300">
                  {formatValue(entry.oldValue)} &rarr;{" "}
                  {formatValue(entry.newValue)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // side-by-side mode
  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border"
      data-testid="diff-viewer"
    >
      <div className="bg-red-50/50 p-3 dark:bg-red-900/10">
        <p className="mb-2 text-xs font-medium text-slate-500">舊值</p>
        {entries.map((entry) => (
          <div key={entry.key} className="py-1 font-mono text-sm">
            <span className="text-slate-500">{entry.key}: </span>
            <span
              className={cn(
                entry.type !== "added"
                  ? "text-red-700 dark:text-red-300"
                  : "text-slate-300"
              )}
            >
              {entry.type === "added" ? "—" : formatValue(entry.oldValue)}
            </span>
          </div>
        ))}
      </div>
      <div className="bg-green-50/50 p-3 dark:bg-green-900/10">
        <p className="mb-2 text-xs font-medium text-slate-500">新值</p>
        {entries.map((entry) => (
          <div key={entry.key} className="py-1 font-mono text-sm">
            <span className="text-slate-500">{entry.key}: </span>
            <span
              className={cn(
                entry.type !== "removed"
                  ? "text-green-700 dark:text-green-300"
                  : "text-slate-300"
              )}
            >
              {entry.type === "removed" ? "—" : formatValue(entry.newValue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
