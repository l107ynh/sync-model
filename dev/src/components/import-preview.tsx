"use client";

import { cn } from "@/lib/utils";

interface ParsedItem {
  component: string;
  id: string;
  model: string;
  model_type: string | null;
  component_version: string | null;
  image: string;
  settings: Record<string, unknown>;
  resource: { gpuType?: string; gpuCount?: number; raw: string };
  status: "matched" | "unmatched";
}

interface ImportSummary {
  model_components_count: number;
  parsed_tables: number;
  skipped_rows: number;
  warnings: string[];
}

interface ImportPreviewProps {
  summary: ImportSummary;
  parsedData: ParsedItem[];
  className?: string;
}

export function ImportPreview({ summary, parsedData, className }: ImportPreviewProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{summary.model_components_count}</p>
          <p className="text-sm text-slate-500">Model Components</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{summary.parsed_tables}</p>
          <p className="text-sm text-slate-500">解析的表格</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-amber-600">{summary.skipped_rows}</p>
          <p className="text-sm text-slate-500">跳過的列</p>
        </div>
      </div>

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-medium text-amber-800">Warnings</h3>
          <ul className="mt-2 space-y-1">
            {summary.warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Data Table */}
      {parsedData.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Component</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">ID</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Model Type</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Image</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parsedData.map((item, i) => (
                <tr
                  key={i}
                  className={cn(
                    item.status === "unmatched" && "bg-amber-50"
                  )}
                >
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        item.status === "matched"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {item.status === "matched" ? "matched" : "unmatched"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-900">{item.component}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{item.id}</td>
                  <td className="px-3 py-2 text-slate-600">{item.model_type ?? "-"}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 font-mono text-xs text-slate-500">
                    {item.image || "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{item.resource.raw || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
