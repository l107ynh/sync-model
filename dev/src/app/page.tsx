"use client";

import { VersionSelector } from "@/components/version-selector";
import { useVersions } from "@/hooks/use-versions";

export default function DashboardPage() {
  const { versions, isLoading, error } = useVersions();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          版本清單
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          選擇版本以檢視 Model 設定
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <VersionSelector versions={versions} isLoading={isLoading} />
    </div>
  );
}
