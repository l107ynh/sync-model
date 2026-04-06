"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  className?: string;
}

export function FileUpload({
  accept = ".pdf,.html,.htm,.xhtml",
  maxSize = 50 * 1024 * 1024,
  onFileSelect,
  onFileRemove,
  className,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (file.size > maxSize) {
        setError(`檔案大小超過上限 (${Math.round(maxSize / 1024 / 1024)}MB)`);
        return;
      }

      const ext = file.name.toLowerCase().split(".").pop();
      const allowedExts = accept.split(",").map((a) => a.trim().replace(".", ""));
      if (!allowedExts.includes(ext ?? "")) {
        setError(`不支援的檔案格式。支援: ${accept}`);
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [accept, maxSize, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onFileRemove?.();
  }, [onFileRemove]);

  return (
    <div className={className}>
      {selectedFile ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <FileText className="h-8 w-8 text-blue-500" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {selectedFile.name}
            </p>
            <p className="text-xs text-slate-500">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={handleRemove}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          )}
        >
          <Upload className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">
            拖放檔案到此處，或{" "}
            <span className="font-medium text-blue-600">瀏覽選擇</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            支援 PDF, HTML ({Math.round(maxSize / 1024 / 1024)}MB 以下)
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
