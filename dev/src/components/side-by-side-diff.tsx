"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Minus, Pencil } from "lucide-react";

interface ChangeDiff {
  [field: string]: { version_a: unknown; version_b: unknown };
}

interface ChangeEntry {
  model_component_name: string;
  model_type: string;
  environment: string;
  edition: string;
  change_type: "added" | "removed" | "modified";
  diff: ChangeDiff;
}

interface CompareSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

interface CompareResult {
  version_a: { id: string; name: string };
  version_b: { id: string; name: string };
  summary: CompareSummary;
  changes: ChangeEntry[];
}

interface SideBySideDiffProps {
  result: CompareResult;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "(empty)";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const changeTypeConfig = {
  added: {
    label: "新增",
    icon: Plus,
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    borderClass: "border-l-green-500",
  },
  removed: {
    label: "移除",
    icon: Minus,
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    borderClass: "border-l-red-500",
  },
  modified: {
    label: "修改",
    icon: Pencil,
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    borderClass: "border-l-yellow-500",
  },
};

function ChangeCard({ change, versionA, versionB }: {
  change: ChangeEntry;
  versionA: string;
  versionB: string;
}) {
  const [expanded, setExpanded] = useState(change.change_type === "modified");
  const config = changeTypeConfig[change.change_type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-md border border-l-4",
        config.borderClass
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              config.badgeClass
            )}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
          <span className="font-mono text-sm font-medium">
            {change.model_component_name}
          </span>
          <Badge variant="outline" className="text-xs">
            {change.model_type}
          </Badge>
          <span className="text-xs text-slate-500">
            {change.environment} / {change.edition}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="pb-2 text-left font-medium">欄位</th>
                <th className="pb-2 text-left font-medium">{versionA}</th>
                <th className="pb-2 text-left font-medium">{versionB}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(change.diff).map(([field, values]) => (
                <tr key={field} className="border-t">
                  <td className="py-2 font-medium">{field}</td>
                  <td className="py-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-xs",
                        change.change_type === "added"
                          ? "text-slate-400"
                          : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {formatValue(values.version_a)}
                    </span>
                  </td>
                  <td className="py-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-xs",
                        change.change_type === "removed"
                          ? "text-slate-400"
                          : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      )}
                    >
                      {formatValue(values.version_b)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SideBySideDiff({ result }: SideBySideDiffProps) {
  const { summary, changes, version_a, version_b } = result;

  // Group by change type
  const added = changes.filter((c) => c.change_type === "added");
  const removed = changes.filter((c) => c.change_type === "removed");
  const modified = changes.filter((c) => c.change_type === "modified");

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">新增</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {summary.added}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">移除</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {summary.removed}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">修改</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">
            {summary.modified}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">未變更</p>
          <p className="mt-1 text-2xl font-bold text-slate-400">
            {summary.unchanged}
          </p>
        </Card>
      </div>

      {/* Changes list */}
      {changes.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-slate-500">
          兩個版本的設定完全相同
        </div>
      ) : (
        <div className="space-y-6">
          {/* Modified */}
          {modified.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                <Pencil className="h-4 w-4" />
                修改（{modified.length}）
              </h3>
              <div className="space-y-2">
                {modified.map((c, i) => (
                  <ChangeCard
                    key={`mod-${i}`}
                    change={c}
                    versionA={version_a.name}
                    versionB={version_b.name}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Added */}
          {added.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
                <Plus className="h-4 w-4" />
                新增（{added.length}）
              </h3>
              <div className="space-y-2">
                {added.map((c, i) => (
                  <ChangeCard
                    key={`add-${i}`}
                    change={c}
                    versionA={version_a.name}
                    versionB={version_b.name}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Removed */}
          {removed.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                <Minus className="h-4 w-4" />
                移除（{removed.length}）
              </h3>
              <div className="space-y-2">
                {removed.map((c, i) => (
                  <ChangeCard
                    key={`rem-${i}`}
                    change={c}
                    versionA={version_a.name}
                    versionB={version_b.name}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
