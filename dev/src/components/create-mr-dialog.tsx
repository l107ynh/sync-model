"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CodegenPreview } from "./codegen-preview";
import { Loader2 } from "lucide-react";

interface CreateMrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codegenId: string | null;
  previewData: {
    files: { path: string; action: string; diff: string }[];
    summary?: { filesChanged: number; insertions: number; deletions: number };
    warnings?: string[];
  } | null;
  onSubmit: (params: {
    codegenId: string;
    title?: string;
    description?: string;
    createdBy: string;
  }) => Promise<void>;
}

export function CreateMrDialog({
  open,
  onOpenChange,
  codegenId,
  previewData,
  onSubmit,
}: CreateMrDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!codegenId || !createdBy.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        codegenId,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        createdBy: createdBy.trim(),
      });
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立 MR 失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCreatedBy("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>建立 Merge Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Codegen Preview */}
          {previewData && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">
                變更預覽
              </h3>
              <CodegenPreview
                files={previewData.files}
                summary={previewData.summary}
                warnings={previewData.warnings}
              />
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="createdBy">操作者 *</Label>
              <Input
                id="createdBy"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="e.g. lynn.yang"
              />
            </div>

            <div>
              <Label htmlFor="title">MR 標題（選填，預設自動產生）</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="chore(sync-model): update gpu settings"
              />
            </div>

            <div>
              <Label htmlFor="description">MR 描述（選填）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="變更原因..."
                rows={3}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !codegenId || !createdBy.trim()}
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              建立 MR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
