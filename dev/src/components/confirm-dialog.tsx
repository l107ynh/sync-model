"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SettingRow } from "@/components/settings-table";
import type { EditChanges } from "@/components/edit-settings-form";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setting: SettingRow;
  changes: EditChanges | null;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

interface DiffItem {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "(empty)";
  if (typeof value === "number") return String(value);
  return String(value);
}

export function ConfirmDialog({
  open,
  onOpenChange,
  setting,
  changes,
  onConfirm,
  isSubmitting = false,
}: ConfirmDialogProps) {
  if (!changes) return null;

  const diffItems: DiffItem[] = [];

  if (changes.deploy !== undefined) {
    diffItems.push({
      field: "deploy",
      label: "Deploy",
      oldValue: setting.deploy,
      newValue: changes.deploy,
    });
  }
  if (changes.gpu_list !== undefined) {
    diffItems.push({
      field: "gpu_list",
      label: "GPU List",
      oldValue: setting.gpu_list,
      newValue: changes.gpu_list,
    });
  }
  if (changes.replica !== undefined) {
    diffItems.push({
      field: "replica",
      label: "Replica",
      oldValue: setting.replica,
      newValue: changes.replica,
    });
  }
  if (changes.gpu_memory_utilization !== undefined) {
    diffItems.push({
      field: "gpu_memory_utilization",
      label: "GPU Memory Utilization",
      oldValue: setting.gpu_memory_utilization,
      newValue: changes.gpu_memory_utilization,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>確認變更</DialogTitle>
          <DialogDescription>
            即將修改{" "}
            <span className="font-mono font-medium">
              {setting.model_component.name}
            </span>{" "}
            的設定
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Diff table */}
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-900">
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                    欄位
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                    目前值
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                    新值
                  </th>
                </tr>
              </thead>
              <tbody>
                {diffItems.map((item) => (
                  <tr key={item.field} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{item.label}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {formatValue(item.oldValue)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {formatValue(item.newValue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reason */}
          {changes.reason && (
            <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500">變更原因</p>
              <p className="mt-1 text-sm">{changes.reason}</p>
            </div>
          )}

          {/* Changed by */}
          <p className="text-xs text-slate-500">
            操作者: <span className="font-medium">{changes.changed_by}</span>
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "儲存中..." : "確認儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
