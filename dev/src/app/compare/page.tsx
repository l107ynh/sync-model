"use client";

import { useState, useCallback } from "react";
import { VersionCompare } from "@/components/version-compare";
import { SideBySideDiff } from "@/components/side-by-side-diff";

interface CompareResult {
  version_a: { id: string; name: string };
  version_b: { id: string; name: string };
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  changes: Array<{
    model_component_name: string;
    model_type: string;
    environment: string;
    edition: string;
    change_type: "added" | "removed" | "modified";
    diff: Record<string, { version_a: unknown; version_b: unknown }>;
  }>;
}

export default function ComparePage() {
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = useCallback(
    async (params: {
      versionAId: string;
      versionBId: string;
      environmentId?: string;
      editionId?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const searchParams = new URLSearchParams();
        searchParams.set("version_a_id", params.versionAId);
        searchParams.set("version_b_id", params.versionBId);
        if (params.environmentId)
          searchParams.set("environment_id", params.environmentId);
        if (params.editionId)
          searchParams.set("edition_id", params.editionId);

        const res = await fetch(
          `/api/v1/compare?${searchParams.toString()}`
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `HTTP ${res.status}`);
        }

        const data: CompareResult = await res.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "比較失敗");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          版本比較
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          選擇兩個版本，比較 model 設定的差異
        </p>
      </div>

      {/* Version selector */}
      <VersionCompare onCompare={handleCompare} isLoading={isLoading} />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex h-32 items-center justify-center text-sm text-slate-500">
          載入比較結果中...
        </div>
      )}

      {/* Results */}
      {result && !isLoading && <SideBySideDiff result={result} />}
    </div>
  );
}
