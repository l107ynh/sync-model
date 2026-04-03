"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SettingsTable } from "@/components/settings-table";
import { EnvironmentTabs } from "@/components/environment-tabs";
import { EditionFilter } from "@/components/edition-filter";
import { ModelTypeBadge } from "@/components/model-type-badge";
import { useSettings } from "@/hooks/use-settings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditSettingsForm, type EditChanges } from "@/components/edit-settings-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SettingRow } from "@/components/settings-table";

const ALL_MODEL_TYPES = [
  "LLM",
  "VLM",
  "ASR",
  "TTS",
  "Retriever",
  "Reranker",
  "ObjectDetection",
  "ObjectRecognition",
  "Face",
  "Guardian",
] as const;

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read URL state
  const versionId = searchParams.get("version_id") ?? "";
  const environmentId = searchParams.get("environment_id") ?? undefined;
  const editionId = searchParams.get("edition_id") ?? undefined;
  const modelType = searchParams.get("model_type") ?? undefined;
  const deployOnly = searchParams.get("deploy_only") === "true";
  const search = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sort_by") ?? "name";
  const sortOrder = (searchParams.get("sort_order") ?? "asc") as "asc" | "desc";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("per_page") ?? "50", 10);

  // Edit state
  const [editingSetting, setEditingSetting] = useState<SettingRow | null>(null);
  const [pendingChanges, setPendingChanges] = useState<EditChanges | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local search input state (for debounce)
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync search input when URL changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Fetch data
  const { data, pagination, filters, isLoading, error } = useSettings({
    versionId,
    environmentId,
    editionId,
    modelType,
    deployOnly,
    search: search || undefined,
    sortBy,
    sortOrder,
    page,
    perPage,
  });

  // URL update helper
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset page to 1 on filter changes (unless explicitly changing page)
      if (!("page" in updates)) {
        params.set("page", "1");
      }
      router.push(`/settings?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined });
      }, 300);
    },
    [updateParams]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set("version_id", versionId);
    params.set("page", "1");
    params.set("per_page", String(perPage));
    router.push(`/settings?${params.toString()}`, { scroll: false });
    setSearchInput("");
  }, [versionId, perPage, router]);

  const hasFilters =
    !!environmentId ||
    !!editionId ||
    !!modelType ||
    deployOnly ||
    !!search;

  // Edit handlers
  const handleEditSetting = useCallback((setting: SettingRow) => {
    setEditingSetting(setting);
    setPendingChanges(null);
    setShowConfirm(false);
  }, []);

  const handleEditSave = useCallback((changes: EditChanges) => {
    setPendingChanges(changes);
    setShowConfirm(true);
  }, []);

  const handleConfirmSave = useCallback(async () => {
    if (!editingSetting || !pendingChanges) return;
    setIsSaving(true);

    try {
      const { changed_by, reason, expected_updated_at, ...settingChanges } = pendingChanges;
      const res = await fetch(`/api/v1/settings/${editingSetting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settingChanges,
          changed_by,
          reason,
          expected_updated_at,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }

      // Success - close dialogs and refresh
      setShowConfirm(false);
      setEditingSetting(null);
      setPendingChanges(null);
      // Trigger refetch
      if (data) {
        // Refresh by re-navigating to current URL
        router.push(`/settings?${searchParams.toString()}`, { scroll: false });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setIsSaving(false);
    }
  }, [editingSetting, pendingChanges, data, router, searchParams]);

  // No version selected state
  if (!versionId) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <div className="text-center">
            <p className="text-sm text-slate-500">
              請先從版本清單選擇一個版本
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                回到版本清單
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        <nav className="text-sm text-slate-500">
          <Link
            href="/"
            className="hover:text-slate-700 dark:hover:text-slate-300"
          >
            版本清單
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-slate-100">設定表格</span>
        </nav>
        <div className="flex h-40 items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <div className="text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                返回版本清單
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link
          href="/"
          className="hover:text-slate-700 dark:hover:text-slate-300"
        >
          版本清單
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900 dark:text-slate-100">設定表格</span>
      </nav>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          設定表格
        </h1>
        {pagination && (
          <span className="text-sm text-slate-500">
            {pagination.total} 筆設定
          </span>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Environment */}
        <EnvironmentTabs
          environments={filters?.available_environments ?? []}
          selectedId={environmentId}
          onSelect={(id) => updateParams({ environment_id: id })}
        />

        {/* Edition */}
        <EditionFilter
          editions={filters?.available_editions ?? []}
          selectedId={editionId}
          onSelect={(id) => updateParams({ edition_id: id })}
        />

        {/* Model Type */}
        <Select
          value={modelType ?? "all"}
          onValueChange={(v) =>
            updateParams({ model_type: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Model Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類型</SelectItem>
            {(filters?.available_types ?? ALL_MODEL_TYPES).map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="搜尋 model..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-[200px] pl-9"
          />
        </div>

        {/* Deploy only toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="deploy-only"
            checked={deployOnly}
            onCheckedChange={(checked) =>
              updateParams({ deploy_only: checked ? "true" : undefined })
            }
          />
          <label htmlFor="deploy-only" className="text-sm text-slate-600 dark:text-slate-400">
            只顯示已部署
          </label>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            清除篩選
          </Button>
        )}
      </div>

      {/* Table */}
      <SettingsTable
        data={data}
        pagination={
          pagination ?? {
            page: 1,
            per_page: perPage,
            total: 0,
            total_pages: 1,
          }
        }
        isLoading={isLoading}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPerPageChange={(pp) =>
          updateParams({ per_page: String(pp), page: "1" })
        }
        onSortingChange={(sb, so) =>
          updateParams({ sort_by: sb, sort_order: so })
        }
        sortBy={sortBy}
        sortOrder={sortOrder}
        onEditSetting={handleEditSetting}
      />

      {/* Edit Setting Dialog */}
      <Dialog
        open={!!editingSetting && !showConfirm}
        onOpenChange={(open) => {
          if (!open) setEditingSetting(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>編輯設定</DialogTitle>
          </DialogHeader>
          {editingSetting && (
            <EditSettingsForm
              setting={editingSetting}
              onSave={handleEditSave}
              onCancel={() => setEditingSetting(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      {editingSetting && (
        <ConfirmDialog
          open={showConfirm}
          onOpenChange={(open) => {
            setShowConfirm(open);
            if (!open) setPendingChanges(null);
          }}
          setting={editingSetting}
          changes={pendingChanges}
          onConfirm={handleConfirmSave}
          isSubmitting={isSaving}
        />
      )}
    </div>
  );
}
