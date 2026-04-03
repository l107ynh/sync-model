/**
 * Model 元件解析器
 *
 * 解析 src/components/inferno/inferno-model-*.ts 中的 model component 定義。
 * 每個檔案 export 一個 class extends BaseModelComp / HuggingfaceModelComp / S3ModelComp，
 * 帶有 readonly properties: basename, MODEL_TYPE, MODEL_ID, MODEL_NAME, MODEL_VERSION,
 * MODEL_PATH, gpuSettingKey, IMAGE_TAG 等。
 */

import {
  Project,
  SourceFile,
  ClassDeclaration,
  Node,
} from "ts-morph";
import * as path from "path";
import * as fs from "fs";
import type { ParsedModelComponent } from "./types";

/** 要跳過的檔案 pattern */
const SKIP_PATTERNS = [
  /^@/,                      // 共用模組（@common.*, @vllm.*）
  /^deprecated-/,            // 已棄用
  /^inferno-model-vllm\.ts/, // 共用 vLLM service，不是具體 model
  /^inferno-model-asr-whisper-base\.ts/, // base class
];

/** 僅解析 inferno-model-*.ts 檔案 */
const MODEL_FILE_PATTERN = /^inferno-model-.*\.ts$/;

/** 不含具體 model 定義的檔案（service、job、http 等） */
const NON_MODEL_PATTERNS = [
  /^inferno-http-/,
  /^inferno-job-/,
  /^inferno-llm-proxy/,
  /^inferno-secret/,
  /^inferno-service-/,
  /^inferno-cr-/,
  /^inferno-crd-/,
  /^model-path-registry/,
];

function shouldSkipFile(fileName: string): boolean {
  if (!MODEL_FILE_PATTERN.test(fileName)) return true;
  if (SKIP_PATTERNS.some((p) => p.test(fileName))) return true;
  if (NON_MODEL_PATTERNS.some((p) => p.test(fileName))) return true;
  return false;
}

/**
 * 解析所有 model component 檔案。
 */
export function parseModelComponents(
  project: Project,
  infernoDir: string,
  modelTypeConstants: Map<string, string>,
  gpuKeyConstants: Map<string, string>
): { components: ParsedModelComponent[]; warnings: string[] } {
  const components: ParsedModelComponent[] = [];
  const warnings: string[] = [];

  const files = fs
    .readdirSync(infernoDir)
    .filter((f) => f.endsWith(".ts") && !shouldSkipFile(f));

  for (const fileName of files) {
    const filePath = path.join(infernoDir, fileName);
    try {
      const sourceFile = project.getSourceFile(filePath);
      if (!sourceFile) {
        warnings.push(`Model parser: 無法讀取 ${fileName}`);
        continue;
      }

      const parsed = parseModelFile(
        sourceFile,
        fileName,
        modelTypeConstants,
        gpuKeyConstants
      );
      if (parsed) {
        components.push(parsed);
      } else {
        // 不是每個檔案都有完整的 model 定義
        warnings.push(`Model parser: ${fileName} 未找到完整的 model component 定義`);
      }
    } catch (err) {
      warnings.push(
        `Model parser: 解析 ${fileName} 失敗 — ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { components, warnings };
}

/**
 * 解析單一 model component 檔案。
 */
function parseModelFile(
  sourceFile: SourceFile,
  fileName: string,
  modelTypeConstants: Map<string, string>,
  gpuKeyConstants: Map<string, string>
): ParsedModelComponent | null {
  const classes = sourceFile.getClasses();
  if (classes.length === 0) return null;

  // 取第一個 exported class（通常只有一個）
  const cls = classes.find((c) => c.isExported()) ?? classes[0];

  // 解析繼承的基類
  const baseClass = resolveBaseClass(cls);

  // 讀取 readonly properties
  const basename = resolveStringProperty(cls, "basename");
  const modelType = resolveConstantProperty(
    cls,
    "MODEL_TYPE",
    modelTypeConstants
  );
  const modelId = resolveStringProperty(cls, "MODEL_ID");
  const modelName = resolveStringProperty(cls, "MODEL_NAME");
  const modelVersion = resolveStringProperty(cls, "MODEL_VERSION");
  const modelPath = resolveStringProperty(cls, "MODEL_PATH");
  const gpuSettingKey = resolveConstantProperty(
    cls,
    "gpuSettingKey",
    gpuKeyConstants
  );

  // 必要欄位檢查
  if (!basename || !modelType || !modelId || !modelName || !gpuSettingKey) {
    return null;
  }

  // 可選欄位
  const imageTag = resolveStringProperty(cls, "IMAGE_TAG");
  const imageName = resolveStringProperty(cls, "IMAGE_NAME");
  const modelRepoRef = resolveStringProperty(cls, "MODEL_REPO_REF");
  const modelBranch = resolveStringProperty(cls, "MODEL_BRANCH");
  const modelS3Key = resolveStringProperty(cls, "MODEL_S3_KEY");

  // 組合 image
  let image: string | undefined;
  if (imageName && imageTag) {
    image = `${imageName}:${imageTag}`;
  } else if (imageTag) {
    image = imageTag; // 部分 model 只有 IMAGE_TAG
  }

  return {
    basename,
    fileName,
    modelType,
    modelId,
    modelName,
    modelVersion: modelVersion ?? "",
    modelPath: modelPath ?? "",
    gpuSettingKey,
    baseClass,
    image,
    modelRepoRef: modelRepoRef ?? undefined,
    modelBranch: modelBranch ?? undefined,
    modelS3Key: modelS3Key ?? undefined,
    imageTag: imageTag ?? undefined,
  };
}

/**
 * 讀取 class property 的字串值。
 * 支援 `readonly prop = 'value'` 和 template literal。
 */
function resolveStringProperty(
  cls: ClassDeclaration,
  propName: string
): string | null {
  const prop = cls.getProperty(propName);
  if (!prop) return null;

  const init = prop.getInitializer();
  if (!init) return null;

  // 字串 literal
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // Template literal（如 `ailabstw-bias-detection-large/v0.7`）
  if (Node.isTemplateExpression(init) || Node.isNoSubstitutionTemplateLiteral(init)) {
    // 盡量取得純文字
    const text = init.getText();
    // 移除 backtick
    if (text.startsWith("`") && text.endsWith("`")) {
      const inner = text.slice(1, -1);
      // 如果含有 ${...} 則無法靜態解析
      if (!inner.includes("${")) {
        return inner;
      }
    }
  }

  // 有些 property 是 expression（如 this.cfg.stageIs('dev') ? 'x' : 'y'）
  // 這裡無法靜態解析，回傳 null
  return null;
}

/**
 * 讀取 class property 的常數引用值。
 * 支援 `readonly MODEL_TYPE = ModelTypeLLM` → 解析為 'llm'
 * 支援 `readonly gpuSettingKey = GPU_KEY_VLLM_MEDIUM_1_8_9` → 解析為 'vllm-medium-1-8-9'
 */
function resolveConstantProperty(
  cls: ClassDeclaration,
  propName: string,
  constants: Map<string, string>
): string | null {
  const prop = cls.getProperty(propName);
  if (!prop) return null;

  const init = prop.getInitializer();
  if (!init) return null;

  // 字串 literal
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // Identifier（常數引用）
  if (Node.isIdentifier(init)) {
    const name = init.getText();
    if (constants.has(name)) {
      return constants.get(name)!;
    }
    // fallback: 嘗試去掉前綴
    return name;
  }

  // PropertyAccessExpression（如 someModule.SomeConst）—— 不常見但以防萬一
  const text = init.getText();
  if (constants.has(text)) {
    return constants.get(text)!;
  }

  return null;
}

/**
 * 解析 class 繼承的基類名稱。
 */
function resolveBaseClass(cls: ClassDeclaration): string {
  const extendsExpr = cls.getExtends();
  if (!extendsExpr) return "unknown";
  return extendsExpr.getText();
}
