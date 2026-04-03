/**
 * POST /api/v1/import/cdk8s
 *
 * 解析本地 cdk8s repo 並將設定匯入資料庫。
 *
 * Request body:
 *   { repoPath: string, versionName: string, dryRun?: boolean }
 *
 * Response:
 *   { status, version?, summary, warnings }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  versions,
  editions,
  modelComponents,
  modelSettings,
  environments,
} from "@/db/schema";
import { parseCdk8sRepo } from "@/lib/cdk8s-parser";
import type {
  ImportResponse,
  ImportSummary,
  ParsedEditionGpuSettings,
  ParsedModelComponent,
  ParsedEnvironment,
} from "@/lib/cdk8s-parser/types";
import { successResponse, errorResponse } from "@/lib/api";
import { ApiError, ErrorCodes } from "@/lib/api-error";

const requestSchema = z.object({
  repoPath: z.string().min(1, "repoPath 不可為空"),
  versionName: z
    .string()
    .min(1, "versionName 不可為空")
    .max(50, "versionName 最多 50 字元"),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // 1. 驗證輸入
    let body: z.infer<typeof requestSchema>;
    try {
      const raw = await request.json();
      body = requestSchema.parse(raw);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ApiError("INVALID_INPUT", "輸入驗證失敗", err.errors);
      }
      throw new ApiError("INVALID_INPUT", "無效的 JSON");
    }

    const { repoPath, versionName, dryRun } = body;

    // 2. 檢查 version 是否已存在
    if (!dryRun) {
      const existing = await db
        .select()
        .from(versions)
        .where(eq(versions.name, versionName))
        .limit(1);
      if (existing.length > 0) {
        throw new ApiError(
          "DUPLICATE",
          `版本 "${versionName}" 已存在`
        );
      }
    }

    // 3. 解析 cdk8s repo
    let parseResult;
    try {
      parseResult = await parseCdk8sRepo(repoPath);
    } catch (err) {
      throw new ApiError(
        "PARSE_ERROR",
        err instanceof Error ? err.message : "設定檔解析失敗"
      );
    }

    // 4. 計算 summary
    const summary = buildSummary(
      parseResult.editions,
      parseResult.modelComponents,
      parseResult.environments
    );

    // 5. Dry run — 只回傳解析結果
    if (dryRun) {
      return successResponse({
        status: "dry_run",
        summary,
        warnings: parseResult.warnings,
      } satisfies ImportResponse);
    }

    // 6. 寫入資料庫
    const versionRecord = await writeToDatabase(
      versionName,
      parseResult.editions,
      parseResult.modelComponents,
      summary
    );

    return successResponse({
      status: "success",
      version: {
        id: versionRecord.id,
        name: versionRecord.name,
      },
      summary,
      warnings: parseResult.warnings,
    } satisfies ImportResponse);
  } catch (err) {
    if (err instanceof ApiError) {
      return errorResponse(err.code, err.message, err.status, err.details);
    }
    console.error("Import failed:", err);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      err instanceof Error ? err.message : "資料庫寫入失敗",
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

/**
 * 建立匯入摘要。
 */
function buildSummary(
  editionsList: ParsedEditionGpuSettings[],
  componentsList: ParsedModelComponent[],
  environmentsList: ParsedEnvironment[]
): ImportSummary {
  const editionNames = editionsList.map((e) => e.editionName);
  const environmentNames = environmentsList.map((e) => e.name);

  // 計算 model types 分佈
  const modelTypes: Record<string, number> = {};
  for (const comp of componentsList) {
    modelTypes[comp.modelType] = (modelTypes[comp.modelType] ?? 0) + 1;
  }

  // model settings 數 = components x editions（每個 model 在每個 edition 有一組設定）
  const modelSettingsCount = componentsList.length * editionsList.length;

  return {
    environmentsCount: environmentNames.length,
    editionsCount: editionNames.length,
    modelComponentsCount: componentsList.length,
    modelSettingsCount,
    environments: environmentNames,
    editions: editionNames,
    modelTypes,
  };
}

/**
 * 將解析結果寫入資料庫。
 */
async function writeToDatabase(
  versionName: string,
  editionsList: ParsedEditionGpuSettings[],
  componentsList: ParsedModelComponent[],
  summary: ImportSummary
) {
  // 1. 建立 version
  const [versionRecord] = await db
    .insert(versions)
    .values({ name: versionName })
    .returning();

  // 2. 確保所有 editions 存在（upsert by name）
  const editionMap = new Map<string, string>(); // name → id
  for (const edition of editionsList) {
    const existing = await db
      .select()
      .from(editions)
      .where(eq(editions.name, edition.editionName))
      .limit(1);

    if (existing.length > 0) {
      editionMap.set(edition.editionName, existing[0].id);
    } else {
      const [created] = await db
        .insert(editions)
        .values({ name: edition.editionName })
        .returning();
      editionMap.set(edition.editionName, created.id);
    }
  }

  // 3. 確保 "default" environment 存在（Phase 1 只用一個環境）
  let defaultEnvId: string;
  const existingEnv = await db
    .select()
    .from(environments)
    .where(eq(environments.name, "default"))
    .limit(1);

  if (existingEnv.length > 0) {
    defaultEnvId = existingEnv[0].id;
  } else {
    const [created] = await db
      .insert(environments)
      .values({ name: "default" })
      .returning();
    defaultEnvId = created.id;
  }

  // 4. 建立 model components
  const componentMap = new Map<string, string>(); // modelName → id
  for (const comp of componentsList) {
    const [record] = await db
      .insert(modelComponents)
      .values({
        name: comp.modelName,
        type: comp.modelType,
        versionId: versionRecord.id,
        componentVersion: comp.modelVersion || null,
        image: comp.image || null,
      })
      .returning();
    componentMap.set(comp.modelName, record.id);
  }

  // 5. 建立 model settings（每個 component x 每個 edition）
  for (const comp of componentsList) {
    const compId = componentMap.get(comp.modelName);
    if (!compId) continue;

    for (const edition of editionsList) {
      const editionId = editionMap.get(edition.editionName);
      if (!editionId) continue;

      // 找出這個 component 在這個 edition 的 GPU 設定
      const gpuConfig = resolveGpuConfigForComponent(comp, edition);

      await db.insert(modelSettings).values({
        modelComponentId: compId,
        environmentId: defaultEnvId,
        editionId: editionId,
        deploy: gpuConfig.deploy,
        gpuList: gpuConfig.gpuList
          ? gpuConfig.gpuList.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        replica: gpuConfig.replica ?? 1,
        gpuMemoryUtilization: gpuConfig.gpuMemoryUtilization ?? null,
        extraSettings: {
          defaultReplica: gpuConfig.defaultReplica,
          requiresDownloadJobs: gpuConfig.requiresDownloadJobs,
          gpuSettingKey: comp.gpuSettingKey,
          basename: comp.basename,
          modelId: comp.modelId,
          modelPath: comp.modelPath,
          modelRepoRef: comp.modelRepoRef,
          modelS3Key: comp.modelS3Key,
          imageTag: comp.imageTag,
        },
      });
    }
  }

  return versionRecord;
}

/**
 * 依據 component 的 gpuSettingKey 和 MODEL_TYPE，
 * 從 edition 的 GPU 設定中找出對應的 GpuConfig。
 *
 * 查找順序：
 * 1. settings[modelType][gpuSettingKey] — 精確匹配
 * 2. settings[modelType].fallback — fallback
 * 3. 預設值
 */
function resolveGpuConfigForComponent(
  comp: ParsedModelComponent,
  edition: ParsedEditionGpuSettings
) {
  const modelTypeSettings = edition.settings[comp.modelType];

  if (!modelTypeSettings) {
    return {
      deploy: false,
      gpuList: "",
      replica: 0,
      gpuMemoryUtilization: undefined,
      defaultReplica: undefined,
      requiresDownloadJobs: undefined,
    };
  }

  // 精確匹配 gpuSettingKey
  if (comp.gpuSettingKey && modelTypeSettings[comp.gpuSettingKey]) {
    return modelTypeSettings[comp.gpuSettingKey];
  }

  // Fallback
  if (modelTypeSettings.fallback) {
    return modelTypeSettings.fallback;
  }

  return {
    deploy: false,
    gpuList: "",
    replica: 0,
    gpuMemoryUtilization: undefined,
    defaultReplica: undefined,
    requiresDownloadJobs: undefined,
  };
}
