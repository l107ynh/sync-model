/**
 * GPU 設定檔 Code Generation
 *
 * 用 ts-morph 讀取現有 GPU 設定檔 AST，修改對應的 property 值，
 * 輸出修改後的 TypeScript 原始碼。
 *
 * 維持 computed property names（[GPU_KEY_XXX]）和原有格式。
 */

import {
  Project,
  SourceFile,
  ObjectLiteralExpression,
  PropertyAssignment,
  Node,
} from "ts-morph";
import * as path from "path";
import type { SettingChange, FieldChange } from "./types";
import type { ReverseMapping } from "./reverse-mapping";
import {
  resolveModelTypeConstantName,
  resolveGpuKeyConstantName,
} from "./reverse-mapping";

/**
 * 對一個 edition 檔案套用多筆 setting changes。
 *
 * @returns 修改後的完整原始碼，如果沒有任何實際修改則回傳 null
 */
export function applyChangesToEditionFile(
  sourceFile: SourceFile,
  changes: SettingChange[],
  reverseMapping: ReverseMapping
): { modified: string; warnings: string[] } | null {
  const warnings: string[] = [];
  let hasModification = false;

  // 找到 class 的 settings property
  const classes = sourceFile.getClasses();
  if (classes.length === 0) {
    warnings.push(`找不到 class in ${sourceFile.getBaseName()}`);
    return null;
  }

  const cls = classes[0];
  const settingsProp = cls.getProperty("settings");
  if (!settingsProp) {
    warnings.push(`找不到 settings property in ${sourceFile.getBaseName()}`);
    return null;
  }

  const settingsObj = settingsProp.getInitializer();
  if (!settingsObj || !Node.isObjectLiteralExpression(settingsObj)) {
    warnings.push(`settings 不是 object literal in ${sourceFile.getBaseName()}`);
    return null;
  }

  for (const change of changes) {
    const result = applyChange(settingsObj, change, reverseMapping);
    if (result.applied) {
      hasModification = true;
    }
    warnings.push(...result.warnings);
  }

  if (!hasModification) return null;

  return {
    modified: sourceFile.getFullText(),
    warnings,
  };
}

/**
 * 對 settingsObj AST 套用一筆 change
 */
function applyChange(
  settingsObj: ObjectLiteralExpression,
  change: SettingChange,
  reverseMapping: ReverseMapping
): { applied: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 找到 [ModelType] property
  const modelTypeConstName = resolveModelTypeConstantName(
    change.modelType,
    reverseMapping
  );
  if (!modelTypeConstName) {
    warnings.push(
      `無法反向映射 modelType: ${change.modelType}，嘗試直接搜尋`
    );
  }

  const modelTypeProp = findComputedProperty(
    settingsObj,
    modelTypeConstName ?? change.modelType
  );

  if (!modelTypeProp) {
    warnings.push(
      `找不到 modelType [${modelTypeConstName ?? change.modelType}] in settings`
    );
    return { applied: false, warnings };
  }

  const modelTypeObj = modelTypeProp.getInitializer();
  if (!modelTypeObj || !Node.isObjectLiteralExpression(modelTypeObj)) {
    warnings.push(`modelType ${change.modelType} 的值不是 object literal`);
    return { applied: false, warnings };
  }

  // 找到 [GPU_KEY] property
  const isFallback = change.gpuSettingKey === "fallback";
  let gpuKeyProp: PropertyAssignment | undefined;

  if (isFallback) {
    gpuKeyProp = modelTypeObj
      .getProperties()
      .find(
        (p) => Node.isPropertyAssignment(p) && p.getName() === "fallback"
      ) as PropertyAssignment | undefined;
  } else {
    const gpuKeyConstName = resolveGpuKeyConstantName(
      change.gpuSettingKey,
      reverseMapping
    );
    if (!gpuKeyConstName) {
      warnings.push(
        `無法反向映射 gpuSettingKey: ${change.gpuSettingKey}`
      );
      return { applied: false, warnings };
    }
    gpuKeyProp = findComputedProperty(modelTypeObj, gpuKeyConstName);
  }

  if (!gpuKeyProp) {
    warnings.push(
      `找不到 gpuSettingKey [${change.gpuSettingKey}] in ${change.modelType}`
    );
    return { applied: false, warnings };
  }

  const gpuConfigObj = gpuKeyProp.getInitializer();
  if (!gpuConfigObj || !Node.isObjectLiteralExpression(gpuConfigObj)) {
    warnings.push(
      `gpuSettingKey ${change.gpuSettingKey} 的值不是 object literal`
    );
    return { applied: false, warnings };
  }

  // 修改欄位
  let applied = false;
  for (const fieldChange of change.fields) {
    const fieldApplied = applyFieldChange(gpuConfigObj, fieldChange, warnings);
    if (fieldApplied) applied = true;
  }

  return { applied, warnings };
}

/**
 * 修改 GpuConfig 中的一個欄位值
 */
function applyFieldChange(
  gpuConfigObj: ObjectLiteralExpression,
  fieldChange: FieldChange,
  warnings: string[]
): boolean {
  const fieldName =
    fieldChange.field === "gpuList" ? "gpuList" : fieldChange.field;

  const prop = gpuConfigObj
    .getProperties()
    .find(
      (p) => Node.isPropertyAssignment(p) && p.getName() === fieldName
    ) as PropertyAssignment | undefined;

  if (!prop) {
    // 如果目標欄位不存在，新增
    const newValue = formatFieldValue(fieldChange.field, fieldChange.newValue);
    gpuConfigObj.addPropertyAssignment({
      name: fieldName,
      initializer: newValue,
    });
    return true;
  }

  // 修改現有值
  const newValue = formatFieldValue(fieldChange.field, fieldChange.newValue);
  prop.setInitializer(newValue);
  return true;
}

/**
 * 將欄位值格式化為 TypeScript 表達式字串
 */
function formatFieldValue(field: string, value: unknown): string {
  switch (field) {
    case "deploy":
      return String(value);
    case "gpuList":
      // DB 存 ["0", "1"]，cdk8s 需要 '0,1'
      if (Array.isArray(value)) {
        return `'${value.join(",")}'`;
      }
      return `'${String(value)}'`;
    case "replica":
      if (value === null || value === undefined) return "undefined";
      return String(value);
    case "gpu_memory_utilization":
      return `'${String(value)}'`;
    default:
      return JSON.stringify(value);
  }
}

/**
 * 在 ObjectLiteralExpression 中找到 computed property name 符合指定常數名稱的 PropertyAssignment。
 * 例如找 [ModelTypeLLM] 或 [GPU_KEY_VLLM_MEDIUM_1_8_9]
 */
function findComputedProperty(
  obj: ObjectLiteralExpression,
  constantName: string
): PropertyAssignment | undefined {
  for (const prop of obj.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;
    const nameNode = prop.getNameNode();

    if (Node.isComputedPropertyName(nameNode)) {
      const expr = nameNode.getExpression();
      if (expr.getText() === constantName) {
        return prop;
      }
    } else if (prop.getName() === constantName) {
      return prop;
    }
  }
  return undefined;
}
