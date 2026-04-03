"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import type { SettingRow } from "@/components/settings-table";

interface EditSettingsFormProps {
  setting: SettingRow;
  onSave: (changes: EditChanges) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export interface EditChanges {
  deploy?: boolean;
  gpu_list?: string[];
  replica?: number;
  gpu_memory_utilization?: number;
  reason?: string;
  changed_by: string;
  expected_updated_at: string;
}

export function EditSettingsForm({
  setting,
  onSave,
  onCancel,
  isSaving = false,
}: EditSettingsFormProps) {
  const [deploy, setDeploy] = useState(setting.deploy);
  const [gpuList, setGpuList] = useState<string[]>(setting.gpu_list ?? []);
  const [gpuInput, setGpuInput] = useState("");
  const [replica, setReplica] = useState(setting.replica);
  const [gpuMemUtil, setGpuMemUtil] = useState(
    setting.gpu_memory_utilization ?? 0.85
  );
  const [reason, setReason] = useState("");
  const [changedBy, setChangedBy] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addGpu = useCallback(() => {
    const trimmed = gpuInput.trim();
    if (trimmed && !gpuList.includes(trimmed)) {
      setGpuList((prev) => [...prev, trimmed]);
      setGpuInput("");
    }
  }, [gpuInput, gpuList]);

  const removeGpu = useCallback((index: number) => {
    setGpuList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleGpuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addGpu();
      }
    },
    [addGpu]
  );

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!changedBy.trim()) {
      newErrors.changed_by = "changed_by 為必填";
    }
    if (replica < 0) {
      newErrors.replica = "Replica 不能為負數";
    }
    if (gpuMemUtil < 0 || gpuMemUtil > 1) {
      newErrors.gpu_memory_utilization = "GPU Memory Utilization 必須介於 0 ~ 1";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [changedBy, replica, gpuMemUtil]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const changes: EditChanges = {
      changed_by: changedBy.trim(),
      expected_updated_at: setting.updated_at,
    };

    if (deploy !== setting.deploy) changes.deploy = deploy;

    const gpuListChanged =
      JSON.stringify(gpuList) !== JSON.stringify(setting.gpu_list ?? []);
    if (gpuListChanged) changes.gpu_list = gpuList;

    if (replica !== setting.replica) changes.replica = replica;

    const roundedUtil = Math.round(gpuMemUtil * 100) / 100;
    if (roundedUtil !== setting.gpu_memory_utilization) {
      changes.gpu_memory_utilization = roundedUtil;
    }

    if (reason.trim()) changes.reason = reason.trim();

    // Check if there are actual changes
    const hasChanges =
      changes.deploy !== undefined ||
      changes.gpu_list !== undefined ||
      changes.replica !== undefined ||
      changes.gpu_memory_utilization !== undefined;

    if (!hasChanges) {
      setErrors({ form: "沒有任何修改" });
      return;
    }

    onSave(changes);
  }, [
    validate,
    deploy,
    gpuList,
    replica,
    gpuMemUtil,
    reason,
    changedBy,
    setting,
    onSave,
  ]);

  return (
    <div className="space-y-5">
      {/* Model info header */}
      <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
        <p className="font-mono text-sm font-medium">
          {setting.model_component.name}
        </p>
        <p className="text-xs text-slate-500">
          {setting.environment.name} / {setting.edition.name}
        </p>
      </div>

      {/* Deploy toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="edit-deploy">Deploy</Label>
        <Switch
          id="edit-deploy"
          checked={deploy}
          onCheckedChange={setDeploy}
        />
      </div>

      {/* GPU List */}
      <div className="space-y-2">
        <Label>GPU List</Label>
        <div className="flex flex-wrap gap-1">
          {gpuList.map((gpu, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="gap-1 font-mono text-xs"
            >
              {gpu}
              <button
                type="button"
                onClick={() => removeGpu(i)}
                className="ml-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={gpuInput}
            onChange={(e) => setGpuInput(e.target.value)}
            onKeyDown={handleGpuKeyDown}
            placeholder="輸入 GPU 型號，按 Enter 新增"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={addGpu}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Replica */}
      <div className="space-y-2">
        <Label htmlFor="edit-replica">Replica</Label>
        <Input
          id="edit-replica"
          type="number"
          min={0}
          value={replica}
          onChange={(e) => setReplica(parseInt(e.target.value, 10) || 0)}
        />
        {errors.replica && (
          <p className="text-xs text-red-500">{errors.replica}</p>
        )}
      </div>

      {/* GPU Memory Utilization */}
      <div className="space-y-2">
        <Label>GPU Memory Utilization</Label>
        <div className="flex items-center gap-3">
          <Slider
            value={gpuMemUtil}
            onChange={setGpuMemUtil}
            min={0}
            max={1}
            step={0.01}
            className="flex-1"
          />
          <Input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={gpuMemUtil}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) setGpuMemUtil(Math.min(1, Math.max(0, val)));
            }}
            className="w-20 font-mono"
          />
        </div>
        {errors.gpu_memory_utilization && (
          <p className="text-xs text-red-500">
            {errors.gpu_memory_utilization}
          </p>
        )}
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="edit-reason">變更原因（選填）</Label>
        <Textarea
          id="edit-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="例如：增加 prod 副本數以應對流量"
          maxLength={500}
        />
      </div>

      {/* Changed By */}
      <div className="space-y-2">
        <Label htmlFor="edit-changed-by">
          操作者 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="edit-changed-by"
          value={changedBy}
          onChange={(e) => setChangedBy(e.target.value)}
          placeholder="例如：lynn.yang"
          maxLength={100}
        />
        {errors.changed_by && (
          <p className="text-xs text-red-500">{errors.changed_by}</p>
        )}
      </div>

      {/* Form-level error */}
      {errors.form && (
        <p className="text-sm text-red-500">{errors.form}</p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? "儲存中..." : "預覽變更"}
        </Button>
      </div>
    </div>
  );
}
