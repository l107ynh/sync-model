"use client";

import { cn } from "@/lib/utils";

interface ExportPreviewProps {
  htmlContent: string;
  versionName: string;
  className?: string;
}

export function ExportPreview({ htmlContent, versionName, className }: ExportPreviewProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          預覽: {versionName}
        </h3>
        <span className="text-xs text-slate-400">Confluence Storage Format</span>
      </div>

      {/* HTML Preview */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
        <div
          className="confluence-preview prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {/* Raw HTML (collapsible) */}
      <details className="rounded-lg border border-slate-200">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          查看原始 HTML
        </summary>
        <pre className="overflow-x-auto bg-slate-50 p-4 text-xs text-slate-600">
          <code>{htmlContent}</code>
        </pre>
      </details>
    </div>
  );
}
