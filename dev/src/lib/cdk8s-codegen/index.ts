/**
 * cdk8s Codegen 主入口
 *
 * 接收 ChangeHistory IDs，查詢 DB 取得變更內容，
 * 產生對應的 TypeScript 檔案修改（preview + generate）。
 */

import { Project } from "ts-morph";
import * as path from "path";
import * as fs from "fs";
import { db } from "@/db";
import {
  changeHistories,
  modelSettings,
  modelComponents,
  editions,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { buildReverseMapping, type ReverseMapping } from "./reverse-mapping";
import { applyChangesToEditionFile } from "./gpu-codegen";
import type {
  SettingChange,
  FieldChange,
  CodegenFileResult,
  CodegenPreviewResponse,
} from "./types";

export type { CodegenPreviewResponse, CodegenFileResult } from "./types";

/**
 * 從 ChangeHistory IDs 產生 codegen preview
 */
export async function generateCodegenPreview(
  changeHistoryIds: string[],
  repoPath: string
): Promise<CodegenPreviewResponse> {
  // 1. 查詢 ChangeHistory + 關聯資料
  const changes = await resolveChanges(changeHistoryIds);
  if (changes.length === 0) {
    return {
      files: [],
      warnings: ["沒有任何有效的 setting changes"],
      summary: { filesChanged: 0, insertions: 0, deletions: 0 },
    };
  }

  // 2. 依 edition 分組
  const byEdition = groupByEdition(changes);

  // 3. 建立 ts-morph project + 反向映射
  const gpuDir = path.join(repoPath, "src/components/inferno/gpu");
  const modelTypeFilePath = path.join(
    repoPath,
    "src/external/model_core/ts/src/model_type.ts"
  );
  const gpuKeyFilePath = path.join(gpuDir, "@common.gpu.key.ts");

  const project = new Project({
    compilerOptions: { allowJs: true, noEmit: true },
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths([
    path.join(gpuDir, "*.ts"),
    modelTypeFilePath,
  ]);

  const gpuKeySrc = project.getSourceFile(gpuKeyFilePath);
  const modelTypeSrc = project.getSourceFile(modelTypeFilePath);

  if (!gpuKeySrc || !modelTypeSrc) {
    throw new Error("無法讀取 GPU key 或 ModelType 定義檔");
  }

  const reverseMapping = buildReverseMapping(gpuKeySrc, modelTypeSrc);

  // 4. 對每個 edition 產生修改
  const files: CodegenFileResult[] = [];
  const allWarnings: string[] = [];

  for (const [editionName, editionChanges] of byEdition) {
    const fileName = `${editionName}.ts`;
    const filePath = path.join(gpuDir, fileName);
    const relativePath = `src/components/inferno/gpu/${fileName}`;

    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) {
      allWarnings.push(`找不到 edition 檔案: ${fileName}`);
      continue;
    }

    const original = sourceFile.getFullText();
    const result = applyChangesToEditionFile(
      sourceFile,
      editionChanges,
      reverseMapping
    );

    if (result) {
      allWarnings.push(...result.warnings);
      const modified = result.modified;
      const diff = createSimpleDiff(original, modified, relativePath);

      files.push({
        path: relativePath,
        action: "modify",
        original,
        modified,
        diff,
      });
    }
  }

  // 5. 統計
  let insertions = 0;
  let deletions = 0;
  for (const file of files) {
    const lines = file.diff.split("\n");
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) insertions++;
      if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }
  }

  return {
    files,
    warnings: allWarnings,
    summary: {
      filesChanged: files.length,
      insertions,
      deletions,
    },
  };
}

/**
 * 從 DB 查詢 ChangeHistory + ModelSetting + ModelComponent + Edition
 * 轉為 SettingChange 列表
 */
async function resolveChanges(
  changeHistoryIds: string[]
): Promise<SettingChange[]> {
  const histories = await db
    .select({
      id: changeHistories.id,
      modelSettingId: changeHistories.modelSettingId,
      diff: changeHistories.diff,
    })
    .from(changeHistories)
    .where(inArray(changeHistories.id, changeHistoryIds));

  if (histories.length === 0) return [];

  const settingIds = [...new Set(histories.map((h) => h.modelSettingId))];

  const settingsRows = await db
    .select({
      id: modelSettings.id,
      modelComponentId: modelSettings.modelComponentId,
      editionId: modelSettings.editionId,
    })
    .from(modelSettings)
    .where(inArray(modelSettings.id, settingIds));

  const settingsMap = new Map(settingsRows.map((s) => [s.id, s]));

  const componentIds = [
    ...new Set(settingsRows.map((s) => s.modelComponentId)),
  ];
  const editionIds = [...new Set(settingsRows.map((s) => s.editionId))];

  const [componentsRows, editionsRows] = await Promise.all([
    db
      .select({
        id: modelComponents.id,
        name: modelComponents.name,
        type: modelComponents.type,
      })
      .from(modelComponents)
      .where(inArray(modelComponents.id, componentIds)),
    db
      .select({
        id: editions.id,
        name: editions.name,
      })
      .from(editions)
      .where(inArray(editions.id, editionIds)),
  ]);

  const componentMap = new Map(componentsRows.map((c) => [c.id, c]));
  const editionMap = new Map(editionsRows.map((e) => [e.id, e]));

  const changes: SettingChange[] = [];

  for (const history of histories) {
    const setting = settingsMap.get(history.modelSettingId);
    if (!setting) continue;

    const component = componentMap.get(setting.modelComponentId);
    const edition = editionMap.get(setting.editionId);
    if (!component || !edition) continue;

    const diff = history.diff as Record<
      string,
      { old: unknown; new: unknown }
    >;

    const fields: FieldChange[] = [];
    const fieldMapping: Record<string, FieldChange["field"]> = {
      deploy: "deploy",
      gpu_list: "gpuList",
      replica: "replica",
      gpu_memory_utilization: "gpu_memory_utilization",
    };

    for (const [dbField, change] of Object.entries(diff)) {
      const codegenField = fieldMapping[dbField];
      if (codegenField) {
        fields.push({
          field: codegenField,
          oldValue: change.old,
          newValue: change.new,
        });
      }
    }

    if (fields.length > 0) {
      changes.push({
        editionName: edition.name,
        modelType: component.type,
        gpuSettingKey: component.name,
        fields,
      });
    }
  }

  return changes;
}

/**
 * 按 edition 分組
 */
function groupByEdition(
  changes: SettingChange[]
): Map<string, SettingChange[]> {
  const map = new Map<string, SettingChange[]>();
  for (const change of changes) {
    const existing = map.get(change.editionName) ?? [];
    existing.push(change);
    map.set(change.editionName, existing);
  }
  return map;
}

/**
 * 產生簡化版 unified diff
 */
function createSimpleDiff(
  original: string,
  modified: string,
  filePath: string
): string {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");

  const diffLines: string[] = [];
  diffLines.push(`--- a/${filePath}`);
  diffLines.push(`+++ b/${filePath}`);

  // 簡化：只列出差異行
  const maxLen = Math.max(origLines.length, modLines.length);
  let inHunk = false;
  let hunkStart = -1;

  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i];
    const mod = modLines[i];

    if (orig !== mod) {
      if (!inHunk) {
        const contextStart = Math.max(0, i - 2);
        hunkStart = contextStart;
        diffLines.push(
          `@@ -${contextStart + 1},${origLines.length} +${contextStart + 1},${modLines.length} @@`
        );
        // Context lines before
        for (let j = contextStart; j < i; j++) {
          if (origLines[j] !== undefined) {
            diffLines.push(` ${origLines[j]}`);
          }
        }
        inHunk = true;
      }
      if (orig !== undefined) diffLines.push(`-${orig}`);
      if (mod !== undefined) diffLines.push(`+${mod}`);
    } else if (inHunk) {
      // Context line after diff
      diffLines.push(` ${orig ?? ""}`);
      // End hunk after 2 context lines
      if (
        i + 1 < maxLen &&
        origLines[i + 1] === modLines[i + 1] &&
        i + 2 < maxLen &&
        origLines[i + 2] === modLines[i + 2]
      ) {
        diffLines.push(` ${origLines[i + 1]}`);
        inHunk = false;
      }
    }
  }

  return diffLines.join("\n");
}
