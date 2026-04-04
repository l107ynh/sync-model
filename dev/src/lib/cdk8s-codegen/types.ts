/**
 * cdk8s Codegen 型別定義
 */

/** 單一變更描述：哪個 edition + modelType + gpuKey 的哪些欄位要改 */
export interface SettingChange {
  editionName: string;
  modelType: string;
  gpuSettingKey: string;
  fields: FieldChange[];
}

export interface FieldChange {
  field: "deploy" | "gpuList" | "replica" | "gpu_memory_utilization";
  oldValue: unknown;
  newValue: unknown;
}

/** Codegen 產出的單一檔案 */
export interface CodegenFileResult {
  path: string;
  action: "modify" | "create";
  original: string;
  modified: string;
  diff: string;
}

/** Codegen preview 回應 */
export interface CodegenPreviewResponse {
  files: CodegenFileResult[];
  warnings: string[];
  summary: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

/** Codegen generate 回應 */
export interface CodegenGenerateResponse {
  codegenId: string;
  files: { path: string; action: "modify" | "create"; content: string }[];
  status: "ready";
  createdAt: string;
}
