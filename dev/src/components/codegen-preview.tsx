"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileCode2 } from "lucide-react";

interface CodegenFile {
  path: string;
  action: string;
  diff: string;
  full_content?: string;
}

interface CodegenPreviewProps {
  files: CodegenFile[];
  summary?: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
  warnings?: string[];
}

export function CodegenPreview({
  files,
  summary,
  warnings,
}: CodegenPreviewProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(files.map((f) => f.path))
  );

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>
            {summary.filesChanged} 個檔案變更
          </span>
          <span className="text-green-600">+{summary.insertions}</span>
          <span className="text-red-600">-{summary.deletions}</span>
        </div>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm font-medium text-yellow-800">警告</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-yellow-700">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Files */}
      {files.map((file) => (
        <Card key={file.path}>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleFile(file.path)}
              >
                {expandedFiles.has(file.path) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <FileCode2 className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-sm font-mono">
                {file.path}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {file.action}
              </Badge>
            </div>
          </CardHeader>
          {expandedFiles.has(file.path) && (
            <CardContent className="pt-0">
              <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
                <code>
                  {file.diff.split("\n").map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.startsWith("+") && !line.startsWith("+++")
                          ? "text-green-400 bg-green-950/30"
                          : line.startsWith("-") && !line.startsWith("---")
                            ? "text-red-400 bg-red-950/30"
                            : line.startsWith("@@")
                              ? "text-blue-400"
                              : ""
                      }
                    >
                      {line}
                    </div>
                  ))}
                </code>
              </pre>
            </CardContent>
          )}
        </Card>
      ))}

      {files.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-500">
          沒有產生任何程式碼變更
        </div>
      )}
    </div>
  );
}
