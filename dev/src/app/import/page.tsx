"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "@/components/file-upload";
import { ImportPreview } from "@/components/import-preview";
import { cn } from "@/lib/utils";
import { Upload, Globe, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Tab = "upload" | "api";

interface ImportResult {
  status: string;
  version?: { id: string; name: string };
  summary: {
    model_components_count: number;
    parsed_tables: number;
    skipped_rows: number;
    warnings: string[];
  };
  parsed_data: Array<{
    component: string;
    id: string;
    model: string;
    model_type: string | null;
    component_version: string | null;
    image: string;
    settings: Record<string, unknown>;
    resource: { gpuType?: string; gpuCount?: number; raw: string };
    status: "matched" | "unmatched";
  }>;
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [versionName, setVersionName] = useState("");
  const [pageId, setPageId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const handleDryRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("version_name", versionName);
      formData.append("dry_run", "true");

      if (activeTab === "upload" && selectedFile) {
        formData.append("file", selectedFile);
      } else if (activeTab === "api" && pageId) {
        formData.append("confluence_page_id", pageId);
      } else {
        setError("請提供檔案或 Confluence Page ID");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/v1/import/confluence", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "預覽失敗");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "預覽失敗");
    } finally {
      setLoading(false);
    }
  }, [activeTab, versionName, selectedFile, pageId]);

  const handleConfirmImport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("version_name", versionName);

      if (activeTab === "upload" && selectedFile) {
        formData.append("file", selectedFile);
      } else if (activeTab === "api" && pageId) {
        formData.append("confluence_page_id", pageId);
      }

      const response = await fetch("/api/v1/import/confluence", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "匯入失敗");
        return;
      }

      setResult(data);
      setImported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
    } finally {
      setLoading(false);
    }
  }, [activeTab, versionName, selectedFile, pageId]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Confluence 匯入</h1>
        <p className="mt-1 text-sm text-slate-500">
          從 Confluence 頁面或 PDF/HTML 檔案匯入 model 設定
        </p>
      </div>

      {/* Version Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700">
          版本名稱 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={versionName}
          onChange={(e) => setVersionName(e.target.value)}
          placeholder="e.g. 3.0"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          maxLength={50}
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("upload")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            activeTab === "upload"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Upload className="h-4 w-4" />
          Upload File
        </button>
        <button
          onClick={() => setActiveTab("api")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            activeTab === "api"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Globe className="h-4 w-4" />
          From Confluence API
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "upload" && (
        <FileUpload
          onFileSelect={setSelectedFile}
          onFileRemove={() => setSelectedFile(null)}
        />
      )}

      {activeTab === "api" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Confluence Page ID 或 URL
          </label>
          <input
            type="text"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="e.g. 12345 或 https://confluence.example.com/pages/viewpage.action?pageId=12345"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            需要設定 CONFLUENCE_BASE_URL, CONFLUENCE_USERNAME, CONFLUENCE_TOKEN 環境變數
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDryRun}
          disabled={loading || !versionName || imported}
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              解析中...
            </span>
          ) : (
            "預覽 (Dry Run)"
          )}
        </button>

        {result && result.status === "dry_run" && (
          <button
            onClick={handleConfirmImport}
            disabled={loading || imported}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            確認匯入
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success */}
      {imported && result && result.status === "success" && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
          <div>
            <p className="text-sm font-medium text-green-700">匯入成功</p>
            <p className="text-sm text-green-600">
              版本 &quot;{result.version?.name}&quot; 已建立，共 {result.summary.model_components_count} 個 model components
            </p>
          </div>
        </div>
      )}

      {/* Preview */}
      {result && (
        <ImportPreview
          summary={result.summary}
          parsedData={result.parsed_data}
        />
      )}
    </div>
  );
}
