/**
 * GPU 設定檔解析器
 *
 * 解析 src/components/inferno/gpu/*.ts 中每個 edition 的 GPU 設定。
 * 每個檔案 export 一個 class extends BaseGpuSettings，
 * 裡面有 protected readonly settings: SettingMap = { ... }。
 *
 * SettingMap 結構：
 *   { [ModelType常數]: { [GPU_KEY常數]: GpuConfig, fallback: GpuConfig } }
 */

import {
  Project,
  SourceFile,
  ObjectLiteralExpression,
  PropertyAssignment,
  Node,
} from "ts-morph";
import * as path from "path";
import * as fs from "fs";
import type {
  ParsedEditionGpuSettings,
  ParsedGpuConfig,
  ParsedGpuSettingsEntry,
  ParsedGpuSettingsMap,
} from "./types";

/** GPU key 常數名稱 → 字串值 的對應表 */
export function resolveGpuKeyConstants(
  gpuKeyFile: SourceFile
): Map<string, string> {
  const map = new Map<string, string>();
  for (const decl of gpuKeyFile.getVariableDeclarations()) {
    const name = decl.getName();
    const init = decl.getInitializer();
    if (init && Node.isStringLiteral(init)) {
      map.set(name, init.getLiteralValue());
    }
  }
  return map;
}

/** ModelType 常數名稱 → 字串值 的對應表 */
export function resolveModelTypeConstants(
  modelTypeFile: SourceFile
): Map<string, string> {
  const map = new Map<string, string>();
  for (const decl of modelTypeFile.getVariableDeclarations()) {
    const name = decl.getName();
    const init = decl.getInitializer();
    if (init && Node.isStringLiteral(init)) {
      map.set(name, init.getLiteralValue());
    }
  }
  return map;
}

/** 從 edition 檔名推斷 edition 名稱 */
function editionNameFromFile(fileName: string): string {
  // dev.ts → dev, pro.ts → pro, 2026-starter.ts → 2026-starter, pro2026.ts → pro2026
  return path.basename(fileName, ".ts");
}

/** 解析一個 GpuConfig object literal */
function parseGpuConfig(objExpr: ObjectLiteralExpression): ParsedGpuConfig {
  const config: ParsedGpuConfig = {
    deploy: false,
    gpuList: "",
  };

  for (const prop of objExpr.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;
    const key = prop.getName();
    const init = prop.getInitializer();
    if (!init) continue;

    switch (key) {
      case "deploy":
        config.deploy = init.getText() === "true";
        break;
      case "gpuList":
        if (Node.isStringLiteral(init)) {
          config.gpuList = init.getLiteralValue();
        } else {
          config.gpuList = init.getText().replace(/['"]/g, "");
        }
        break;
      case "replica":
        if (init.getText() !== "undefined") {
          config.replica = parseInt(init.getText(), 10);
          if (isNaN(config.replica)) config.replica = undefined;
        }
        break;
      case "defaultReplica":
        if (init.getText() !== "undefined") {
          config.defaultReplica = parseInt(init.getText(), 10);
          if (isNaN(config.defaultReplica)) config.defaultReplica = undefined;
        }
        break;
      case "gpu_memory_utilization":
        if (Node.isStringLiteral(init)) {
          config.gpuMemoryUtilization = init.getLiteralValue();
        } else {
          config.gpuMemoryUtilization = init.getText().replace(/['"]/g, "");
        }
        break;
      case "requiresDownloadJobs":
        if (Node.isArrayLiteralExpression(init)) {
          config.requiresDownloadJobs = init
            .getElements()
            .map((el) => el.getText());
        }
        break;
    }
  }

  return config;
}

/**
 * 解析 GPU 設定檔目錄下所有 edition 檔案。
 *
 * @param project ts-morph Project（已加入 cdk8s source files）
 * @param gpuDir GPU 設定檔目錄的絕對路徑
 * @param modelTypeConstants ModelType 常數名 → 值 的映射
 * @param gpuKeyConstants GPU_KEY 常數名 → 值 的映射
 */
export function parseGpuEditions(
  project: Project,
  gpuDir: string,
  modelTypeConstants: Map<string, string>,
  gpuKeyConstants: Map<string, string>
): { editions: ParsedEditionGpuSettings[]; warnings: string[] } {
  const editions: ParsedEditionGpuSettings[] = [];
  const warnings: string[] = [];

  const files = fs
    .readdirSync(gpuDir)
    .filter((f) => f.endsWith(".ts") && !f.startsWith("@"));

  for (const fileName of files) {
    const filePath = path.join(gpuDir, fileName);
    try {
      const sourceFile = project.getSourceFile(filePath);
      if (!sourceFile) {
        warnings.push(`GPU parser: 無法讀取 ${fileName}`);
        continue;
      }

      const editionName = editionNameFromFile(fileName);
      const settings = parseEditionSettings(
        sourceFile,
        modelTypeConstants,
        gpuKeyConstants,
        warnings,
        fileName
      );

      editions.push({
        editionName,
        fileName,
        settings,
      });
    } catch (err) {
      warnings.push(
        `GPU parser: 解析 ${fileName} 失敗 — ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { editions, warnings };
}

/**
 * 解析單一 edition source file 的 settings property。
 */
function parseEditionSettings(
  sourceFile: SourceFile,
  modelTypeConstants: Map<string, string>,
  gpuKeyConstants: Map<string, string>,
  warnings: string[],
  fileName: string
): ParsedGpuSettingsMap {
  const result: ParsedGpuSettingsMap = {};

  // 找到 class 的 settings property
  const classes = sourceFile.getClasses();
  if (classes.length === 0) {
    warnings.push(`GPU parser: ${fileName} 中找不到 class`);
    return result;
  }

  const cls = classes[0];
  const settingsProp = cls.getProperty("settings");
  if (!settingsProp) {
    warnings.push(`GPU parser: ${fileName} 中找不到 settings property`);
    return result;
  }

  const initializer = settingsProp.getInitializer();
  if (!initializer || !Node.isObjectLiteralExpression(initializer)) {
    warnings.push(`GPU parser: ${fileName} 的 settings 不是 object literal`);
    return result;
  }

  // 遍歷 SettingMap 的頂層 properties（每個是 [ModelType]: { ... }）
  for (const topProp of initializer.getProperties()) {
    if (!Node.isPropertyAssignment(topProp)) continue;

    // 解析 model type key — 可能是 [ModelTypeLLM] 計算屬性
    const modelTypeKey = resolvePropertyKey(
      topProp,
      modelTypeConstants,
      gpuKeyConstants
    );
    if (!modelTypeKey) {
      warnings.push(
        `GPU parser: ${fileName} 中無法解析 model type key: ${topProp.getText().substring(0, 60)}`
      );
      continue;
    }

    const entryInit = topProp.getInitializer();
    if (!entryInit || !Node.isObjectLiteralExpression(entryInit)) continue;

    const entry: ParsedGpuSettingsEntry = {
      fallback: { deploy: false, gpuList: "" },
    };

    // 遍歷 SettingsEntry 的 properties
    for (const entryProp of entryInit.getProperties()) {
      if (!Node.isPropertyAssignment(entryProp)) continue;

      const gpuKey = resolvePropertyKey(
        entryProp,
        modelTypeConstants,
        gpuKeyConstants
      );
      if (!gpuKey) continue;

      const gpuConfigInit = entryProp.getInitializer();
      if (!gpuConfigInit || !Node.isObjectLiteralExpression(gpuConfigInit))
        continue;

      entry[gpuKey] = parseGpuConfig(gpuConfigInit);
    }

    result[modelTypeKey] = entry;
  }

  return result;
}

/**
 * 解析 property key，處理 computed property names（如 [ModelTypeLLM]）和字串 literal。
 */
function resolvePropertyKey(
  prop: PropertyAssignment,
  modelTypeConstants: Map<string, string>,
  gpuKeyConstants: Map<string, string>
): string | null {
  const nameNode = prop.getNameNode();

  // 計算屬性名：[SomeConstant]
  if (Node.isComputedPropertyName(nameNode)) {
    const expr = nameNode.getExpression();
    const text = expr.getText();

    // 嘗試從 ModelType 常數解析
    if (modelTypeConstants.has(text)) {
      return modelTypeConstants.get(text)!;
    }

    // 嘗試從 GPU_KEY 常數解析
    if (gpuKeyConstants.has(text)) {
      return gpuKeyConstants.get(text)!;
    }

    return text;
  }

  // 普通屬性名（如 fallback）
  return prop.getName();
}
