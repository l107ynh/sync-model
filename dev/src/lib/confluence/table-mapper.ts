/**
 * 表格列到系統 model component 的映射邏輯
 */

import type {
  ParsedRow,
  ParsedVersionTable,
  ParsedComponent,
  ParsedResource,
} from "./types";
import { COMPONENT_TO_MODEL_TYPE } from "./types";

/**
 * 將解析出的表格列映射為系統 model component 結構
 */
export function mapRowsToComponents(
  tables: ParsedVersionTable[],
  warnings: string[]
): ParsedComponent[] {
  const components: ParsedComponent[] = [];

  for (const table of tables) {
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      const comp = mapSingleRow(row, i, table.versionLabel, warnings);
      components.push(comp);
    }
  }

  return components;
}

/**
 * 映射單一列
 */
function mapSingleRow(
  row: ParsedRow,
  rowIndex: number,
  versionLabel: string,
  warnings: string[]
): ParsedComponent {
  // 1. Component → modelType
  const modelType = resolveModelType(row.component, warnings, rowIndex);

  // 2. ID → model name + componentVersion
  const { name, version: componentVersion } = parseModelId(row.id);

  // 3. 解析 resource
  const resource = parseResource(row.resource);

  // 4. 解析 settings
  const settings = parseSettings(row.settings);

  // 5. 處理 "同3.0" 引用
  if (isReferenceValue(row.model) || isReferenceValue(row.id)) {
    warnings.push(
      `Row ${rowIndex + 1} (${versionLabel}): 欄位含有引用值 "${row.model || row.id}"，需手動確認`
    );
  }

  return {
    component: row.component,
    id: row.id,
    model: row.model || name,
    modelType,
    componentVersion,
    image: row.image,
    settings,
    resource,
    status: modelType ? "matched" : "unmatched",
  };
}

/**
 * 從 Component 欄位解析 model type
 */
function resolveModelType(
  component: string,
  warnings: string[],
  rowIndex: number
): string | null {
  const trimmed = component.trim();

  // 直接匹配
  if (COMPONENT_TO_MODEL_TYPE[trimmed]) {
    return COMPONENT_TO_MODEL_TYPE[trimmed];
  }

  // 模糊匹配：忽略大小寫
  for (const [key, value] of Object.entries(COMPONENT_TO_MODEL_TYPE)) {
    if (key.toLowerCase() === trimmed.toLowerCase()) {
      return value;
    }
  }

  // 部分匹配：如 "Visual" 開頭
  if (/^visual/i.test(trimmed)) {
    if (/object.?detect/i.test(trimmed)) return "ObjectDetection";
    if (/object.?recog/i.test(trimmed)) return "ObjectRecognition";
    if (/face/i.test(trimmed)) return "Face";
  }

  warnings.push(
    `Row ${rowIndex + 1}: Component "${component}" 無法匹配到已知的 model type`
  );
  return null;
}

/**
 * 從 ID 欄位拆出 model name 和 version
 * e.g. "asr-general-1.2.0" → { name: "asr-general", version: "1.2.0" }
 */
function parseModelId(id: string): { name: string; version: string | null } {
  const trimmed = id.trim();
  if (!trimmed) return { name: "", version: null };

  // 嘗試匹配尾端的版本號 (數字.數字.數字)
  const match = trimmed.match(/^(.+?)-(\d+\.\d+(?:\.\d+)?)$/);
  if (match) {
    return { name: match[1], version: match[2] };
  }

  return { name: trimmed, version: null };
}

/**
 * 解析 Resource 欄位
 * e.g. "GPU: A100 x2" → { gpuType: "A100", gpuCount: 2 }
 * e.g. "平均RTF <= 0.5, VRAM 5G-16G" → { raw: "..." }
 */
function parseResource(resource: string): ParsedResource {
  const raw = resource.trim();
  if (!raw) return { raw: "" };

  // 嘗試解析 "GPU: {type} x{count}" 格式
  const gpuMatch = raw.match(/GPU:\s*(\w+)\s*x\s*(\d+)/i);
  if (gpuMatch) {
    return {
      gpuType: gpuMatch[1],
      gpuCount: parseInt(gpuMatch[2], 10),
      raw,
    };
  }

  // 嘗試解析 "VRAM" 格式
  const vramMatch = raw.match(/VRAM\s+([\w\d]+)/i);
  if (vramMatch) {
    return { raw };
  }

  return { raw };
}

/**
 * 解析 Settings 欄位為 key-value
 */
function parseSettings(settings: string): Record<string, unknown> {
  const trimmed = settings.trim();
  if (!trimmed) return {};

  // 嘗試 JSON 解析
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null) return parsed;
  } catch {
    // not JSON
  }

  // 嘗試 key: value 或 key=value 解析
  const result: Record<string, string> = {};
  const pairs = trimmed.split(/[,;]\s*/);
  for (const pair of pairs) {
    const kv = pair.match(/^([^:=]+)[=:]\s*(.+)$/);
    if (kv) {
      result[kv[1].trim()] = kv[2].trim();
    } else if (pair.trim()) {
      // 單獨的值作為 raw
      result["raw"] = trimmed;
      return result;
    }
  }

  return Object.keys(result).length > 0 ? result : { raw: trimmed };
}

/**
 * 是否為引用值 (如 "同3.0")
 */
function isReferenceValue(value: string): boolean {
  return /^同\d+\.\d+/.test(value.trim());
}
