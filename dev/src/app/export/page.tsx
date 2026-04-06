"use client";

import { useState, useEffect, useCallback } from "react";
import { ExportPreview } from "@/components/export-preview";
import { cn } from "@/lib/utils";
import { Download, Globe, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Version {
  id: string;
  name: string;
}

type ExportFormat = "html" | "confluence_api";

export default function ExportPage() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [format, setFormat] = useState<ExportFormat>("html");
  const [confluencePageId, setConfluencePageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [versionName, setVersionName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 載入版本清單
  useEffect(() => {
    fetch("/api/v1/versions")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data ?? [];
        setVersions(list);
      })
      .catch(() => {});
  }, []);

  const handlePreview = useCallback(async () => {
    if (!selectedVersionId) return;
    setLoading(true);
    setError(null);
    setPreviewHtml(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/v1/export/confluence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_id: selectedVersionId,
          format: "html",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "預覽失敗");
        return;
      }

      setPreviewHtml(data.content);
      setVersionName(data.version?.name ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "預覽失敗");
    } finally {
      setLoading(false);
    }
  }, [selectedVersionId]);

  const handleExport = useCallback(async () => {
    if (!selectedVersionId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (format === "html") {
        // 下載 HTML
        const response = await fetch("/api/v1/export/confluence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version_id: selectedVersionId,
            format: "html",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "匯出失敗");
          return;
        }

        // 觸發下載
        const blob = new Blob([data.content], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sync-model-${data.version?.name ?? "export"}.html`;
        a.click();
        URL.revokeObjectURL(url);

        setSuccess("HTML 檔案已下載");
      } else if (format === "confluence_api") {
        if (!confluencePageId) {
          setError("請提供 Confluence Page ID");
          return;
        }

        const response = await fetch("/api/v1/export/confluence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version_id: selectedVersionId,
            format: "confluence_api",
            confluence_page_id: confluencePageId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "匯出失敗");
          return;
        }

        setSuccess(`Confluence 頁面已更新: ${data.confluence_page_url}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯出失敗");
    } finally {
      setLoading(false);
    }
  }, [selectedVersionId, format, confluencePageId]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Confluence 匯出</h1>
        <p className="mt-1 text-sm text-slate-500">
          將系統中的 model 設定匯出為 Confluence 格式
        </p>
      </div>

      {/* Version Select */}
      <div>
        <label className="block text-sm font-medium text-slate-700">
          選擇版本 <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedVersionId}
          onChange={(e) => setSelectedVersionId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">-- 請選擇 --</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Format Select */}
      <div>
        <label className="block text-sm font-medium text-slate-700">匯出格式</label>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="format"
              value="html"
              checked={format === "html"}
              onChange={() => setFormat("html")}
              className="text-blue-600"
            />
            <span className="text-sm text-slate-700">
              <Download className="inline h-4 w-4" /> 下載 HTML
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="format"
              value="confluence_api"
              checked={format === "confluence_api"}
              onChange={() => setFormat("confluence_api")}
              className="text-blue-600"
            />
            <span className="text-sm text-slate-700">
              <Globe className="inline h-4 w-4" /> 更新 Confluence 頁面
            </span>
          </label>
        </div>
      </div>

      {/* Confluence Page ID (for API mode) */}
      {format === "confluence_api" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Confluence Page ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={confluencePageId}
            onChange={(e) => setConfluencePageId(e.target.value)}
            placeholder="e.g. 12345"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePreview}
          disabled={loading || !selectedVersionId}
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              載入中...
            </span>
          ) : (
            "預覽"
          )}
        </button>

        <button
          onClick={handleExport}
          disabled={loading || !selectedVersionId}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          確認匯出
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Preview */}
      {previewHtml && (
        <ExportPreview htmlContent={previewHtml} versionName={versionName} />
      )}
    </div>
  );
}
