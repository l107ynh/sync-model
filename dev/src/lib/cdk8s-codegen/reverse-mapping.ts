/**
 * 反向常數映射
 *
 * 將 DB 儲存的字串值反轉為 cdk8s TypeScript 原始碼中的常數名稱。
 * 例如：'llm' → 'ModelTypeLLM', 'vllm-medium-1-8-9' → 'GPU_KEY_VLLM_MEDIUM_1_8_9'
 */

import { SourceFile, Node } from "ts-morph";
import {
  resolveGpuKeyConstants,
  resolveModelTypeConstants,
} from "../cdk8s-parser/gpu-parser";

/** 值 → 常數名稱 的映射表 */
export interface ReverseMapping {
  /** GPU key value → constant name, e.g. 'vllm-medium-1-8-9' → 'GPU_KEY_VLLM_MEDIUM_1_8_9' */
  gpuKeyReverse: Map<string, string>;
  /** ModelType value → constant name, e.g. 'llm' → 'ModelTypeLLM' */
  modelTypeReverse: Map<string, string>;
}

/**
 * 建立反向映射表
 */
export function buildReverseMapping(
  gpuKeyFile: SourceFile,
  modelTypeFile: SourceFile
): ReverseMapping {
  const gpuKeyForward = resolveGpuKeyConstants(gpuKeyFile);
  const modelTypeForward = resolveModelTypeConstants(modelTypeFile);

  const gpuKeyReverse = new Map<string, string>();
  for (const [constName, value] of gpuKeyForward) {
    gpuKeyReverse.set(value, constName);
  }

  const modelTypeReverse = new Map<string, string>();
  for (const [constName, value] of modelTypeForward) {
    modelTypeReverse.set(value, constName);
  }

  return { gpuKeyReverse, modelTypeReverse };
}

/**
 * 將 gpu key 值轉為常數名稱（用於 codegen）
 * 若找不到，返回 null
 */
export function resolveGpuKeyConstantName(
  value: string,
  reverseMapping: ReverseMapping
): string | null {
  // 'fallback' 是字串 literal，不需要常數名稱
  if (value === "fallback") return null;
  return reverseMapping.gpuKeyReverse.get(value) ?? null;
}

/**
 * 將 model type 值轉為常數名稱（用於 codegen）
 */
export function resolveModelTypeConstantName(
  value: string,
  reverseMapping: ReverseMapping
): string | null {
  return reverseMapping.modelTypeReverse.get(value) ?? null;
}
