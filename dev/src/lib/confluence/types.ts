/**
 * Confluence API 和解析用型別定義
 */

// ── Component 映射表 ──

export const COMPONENT_TO_MODEL_TYPE: Record<string, string> = {
  "ASR core": "ASR",
  "TTS core": "TTS",
  LLM: "LLM",
  VLM: "VLM",
  Retriever: "Retriever",
  Reranker: "Reranker",
  "Visual (object-detection)": "ObjectDetection",
  "Visual (object-recognition)": "ObjectRecognition",
  "Visual (face-recognition)": "Face",
  Guardian: "Guardian",
};

/** 反向映射：system model type → Confluence Component 名稱 */
export const MODEL_TYPE_TO_COMPONENT: Record<string, string> = Object.fromEntries(
  Object.entries(COMPONENT_TO_MODEL_TYPE).map(([k, v]) => [v, k])
);

// ── 解析結果型別 ──

export interface ParsedRow {
  component: string;
  id: string;
  model: string;
  image: string;
  settings: string;
  resource: string;
}

export interface ParsedComponent {
  /** 原始 Confluence Component 名稱 */
  component: string;
  /** 原始 ID 欄位 (e.g. "asr-general-1.2.0") */
  id: string;
  /** Model 名稱 */
  model: string;
  /** 映射後的 system model type */
  modelType: string | null;
  /** 元件版本 (從 ID 拆出) */
  componentVersion: string | null;
  /** Container image */
  image: string;
  /** 原始 settings 字串 */
  settings: Record<string, unknown>;
  /** 解析後的 resource */
  resource: ParsedResource;
  /** 匹配狀態 */
  status: "matched" | "unmatched";
}

export interface ParsedResource {
  gpuType?: string;
  gpuCount?: number;
  raw: string;
}

export interface ParsedVersionTable {
  versionLabel: string;
  rows: ParsedRow[];
}

export interface ParseResult {
  tables: ParsedVersionTable[];
  components: ParsedComponent[];
  warnings: string[];
}

// ── Confluence API 型別 ──

export interface ConfluencePageV2 {
  id: string;
  title: string;
  status: string;
  version: { number: number; message?: string };
  body: {
    storage: { value: string; representation: string };
  };
}

export interface ConfluencePageV1 {
  id: string;
  title: string;
  version: { number: number };
  body: {
    storage: { value: string; representation: string };
  };
}

// ── Import API 回傳型別 ──

export interface ImportSummary {
  modelComponentsCount: number;
  parsedTables: number;
  skippedRows: number;
  warnings: string[];
}

export interface ImportParsedItem {
  component: string;
  id: string;
  model: string;
  modelType: string | null;
  componentVersion: string | null;
  image: string;
  settings: Record<string, unknown>;
  resource: ParsedResource;
  status: "matched" | "unmatched";
}

// ── Export 型別 ──

export interface ExportComponent {
  type: string;
  name: string;
  componentVersion: string | null;
  image: string | null;
  deploy: boolean;
  gpuList: string[];
  replica: number;
  gpuMemoryUtilization: string | null;
  extraSettings: Record<string, unknown>;
}
