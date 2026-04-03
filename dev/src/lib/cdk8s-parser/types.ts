/**
 * cdk8s 設定檔解析結果型別定義
 */

// ── GPU 設定 ──

export interface ParsedGpuConfig {
  deploy: boolean;
  gpuList: string;
  replica?: number;
  defaultReplica?: number;
  gpuMemoryUtilization?: string;
  requiresDownloadJobs?: string[];
}

/** 一個 edition 檔案內，modelType -> { gpuKey -> GpuConfig, fallback -> GpuConfig } */
export interface ParsedGpuSettingsEntry {
  fallback: ParsedGpuConfig;
  [gpuKey: string]: ParsedGpuConfig;
}

export type ParsedGpuSettingsMap = Record<string, ParsedGpuSettingsEntry>;

export interface ParsedEditionGpuSettings {
  editionName: string;
  fileName: string;
  settings: ParsedGpuSettingsMap;
}

// ── Model Component ──

export interface ParsedModelComponent {
  basename: string;
  fileName: string;
  modelType: string;
  modelId: string;
  modelName: string;
  modelVersion: string;
  modelPath: string;
  gpuSettingKey: string;
  /** 繼承的基類：BaseModelComp | HuggingfaceModelComp | S3ModelComp | VllmModelComp | WhisperModelComp */
  baseClass: string;
  /** container image（如果可解析） */
  image?: string;
  /** Huggingface model ref */
  modelRepoRef?: string;
  modelBranch?: string;
  /** S3 key */
  modelS3Key?: string;
  imageTag?: string;
}

// ── Environment / Cfg ──

export interface ParsedEnvironment {
  name: string;
  stage: string;
  edition: string;
  fileName: string;
}

// ── 最終結果 ──

export interface Cdk8sParseResult {
  editions: ParsedEditionGpuSettings[];
  modelComponents: ParsedModelComponent[];
  environments: ParsedEnvironment[];
  warnings: string[];
}

// ── Import API ──

export interface ImportRequest {
  repoPath: string;
  versionName: string;
  dryRun?: boolean;
}

export interface ImportSummary {
  environmentsCount: number;
  editionsCount: number;
  modelComponentsCount: number;
  modelSettingsCount: number;
  editions: string[];
  modelTypes: Record<string, number>;
}

export interface ImportResponse {
  status: "success" | "dry_run";
  version?: {
    id: string;
    name: string;
  };
  summary: ImportSummary;
  warnings: string[];
}
