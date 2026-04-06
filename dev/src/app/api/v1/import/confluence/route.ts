/**
 * POST /api/v1/import/confluence
 *
 * Confluence 匯入 API。支援兩種模式：
 * 1. 上傳 PDF/HTML 檔案
 * 2. 透過 Confluence API 讀取頁面（需 page_id）
 *
 * Request: multipart/form-data
 *   - file: PDF 或 HTML 檔案 (max 50MB)
 *   - confluence_page_id: Confluence page ID（與 file 二擇一）
 *   - version_name: 版本名稱（必要）
 *   - dry_run: 是否僅預覽（optional, default false）
 */

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  versions,
  editions,
  modelComponents,
  modelSettings,
  environments,
} from "@/db/schema";
import { parseConfluenceHtml } from "@/lib/confluence/html-parser";
import { parsePdfBuffer } from "@/lib/confluence/pdf-parser";
import { getPage } from "@/lib/confluence/client";
import type { ParseResult, ParsedComponent } from "@/lib/confluence/types";
import { successResponse, errorResponse } from "@/lib/api";
import { ApiError, ErrorCodes } from "@/lib/api-error";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // 1. 提取欄位
    const file = formData.get("file") as File | null;
    const confluencePageId = formData.get("confluence_page_id") as string | null;
    const versionName = formData.get("version_name") as string | null;
    const dryRunStr = formData.get("dry_run") as string | null;
    const dryRun = dryRunStr === "true" || dryRunStr === "1";

    // 2. 驗證輸入
    if (!file && !confluencePageId) {
      throw new ApiError("INVALID_INPUT", "請提供 file 或 confluence_page_id");
    }

    if (!versionName || versionName.trim().length === 0) {
      throw new ApiError("INVALID_INPUT", "version_name 不可為空");
    }

    if (versionName.length > 50) {
      throw new ApiError("INVALID_INPUT", "version_name 最多 50 字元");
    }

    // 3. 檢查版本是否已存在
    if (!dryRun) {
      const existing = await db
        .select()
        .from(versions)
        .where(eq(versions.name, versionName.trim()))
        .limit(1);
      if (existing.length > 0) {
        throw new ApiError("DUPLICATE", `版本 "${versionName}" 已存在`);
      }
    }

    // 4. 取得內容並解析
    let parseResult: ParseResult;

    if (file) {
      // 檔案上傳模式
      if (file.size > MAX_FILE_SIZE) {
        throw new ApiError("INVALID_FILE", `檔案大小超過上限 (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      const fileName = file.name.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      if (fileName.endsWith(".pdf")) {
        parseResult = await parsePdfBuffer(buffer);
      } else if (
        fileName.endsWith(".html") ||
        fileName.endsWith(".htm") ||
        fileName.endsWith(".xhtml")
      ) {
        const htmlContent = buffer.toString("utf-8");
        parseResult = parseConfluenceHtml(htmlContent);
      } else {
        throw new ApiError(
          "INVALID_FILE",
          `不支援的檔案格式: ${fileName}。支援 PDF, HTML, XHTML`
        );
      }
    } else {
      // Confluence API 模式
      try {
        const pageData = await getPage(confluencePageId!);
        parseResult = parseConfluenceHtml(pageData.storageContent);
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(
          "CONFLUENCE_ERROR",
          err instanceof Error ? err.message : "Confluence API 呼叫失敗"
        );
      }
    }

    // 5. 檢查解析結果
    if (parseResult.components.length === 0 && parseResult.tables.length === 0) {
      if (parseResult.warnings.length > 0) {
        // 有 warnings 但沒解析到任何東西，可能是格式問題
        throw new ApiError("PARSE_ERROR", "無法解析表格結構", {
          warnings: parseResult.warnings,
        });
      }
    }

    // 6. 建立 summary
    const matchedComponents = parseResult.components.filter((c) => c.status === "matched");
    const unmatchedComponents = parseResult.components.filter((c) => c.status === "unmatched");

    const summary = {
      model_components_count: parseResult.components.length,
      parsed_tables: parseResult.tables.length,
      skipped_rows: unmatchedComponents.length,
      warnings: parseResult.warnings,
    };

    const parsedData = parseResult.components.map((c) => ({
      component: c.component,
      id: c.id,
      model: c.model,
      model_type: c.modelType,
      component_version: c.componentVersion,
      image: c.image,
      settings: c.settings,
      resource: c.resource,
      status: c.status,
    }));

    // 7. Dry run — 只回傳解析結果
    if (dryRun) {
      return successResponse({
        status: "dry_run",
        summary,
        parsed_data: parsedData,
      });
    }

    // 8. 寫入資料庫
    const versionRecord = await writeToDatabase(
      versionName.trim(),
      matchedComponents
    );

    return successResponse({
      status: "success",
      version: {
        id: versionRecord.id,
        name: versionRecord.name,
      },
      summary,
      parsed_data: parsedData,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return errorResponse(err.code, err.message, err.status, err.details);
    }
    console.error("Confluence import failed:", err);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      err instanceof Error ? err.message : "匯入失敗",
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

/**
 * 將解析結果寫入資料庫
 */
async function writeToDatabase(
  versionName: string,
  components: ParsedComponent[]
) {
  // 1. 建立 version
  const [versionRecord] = await db
    .insert(versions)
    .values({ name: versionName })
    .returning();

  // 2. 確保 "default" environment 存在
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

  // 3. 確保 "default" edition 存在
  let defaultEditionId: string;
  const existingEdition = await db
    .select()
    .from(editions)
    .where(eq(editions.name, "default"))
    .limit(1);

  if (existingEdition.length > 0) {
    defaultEditionId = existingEdition[0].id;
  } else {
    const [created] = await db
      .insert(editions)
      .values({ name: "default" })
      .returning();
    defaultEditionId = created.id;
  }

  // 4. 建立 model components + settings
  for (const comp of components) {
    if (!comp.modelType) continue;

    const [componentRecord] = await db
      .insert(modelComponents)
      .values({
        name: comp.model || comp.id,
        type: comp.modelType,
        versionId: versionRecord.id,
        componentVersion: comp.componentVersion,
        image: comp.image || null,
      })
      .returning();

    // 解析 GPU 資訊到 settings
    const gpuList: string[] = [];
    if (comp.resource.gpuType && comp.resource.gpuCount) {
      for (let i = 0; i < comp.resource.gpuCount; i++) {
        gpuList.push(comp.resource.gpuType);
      }
    }

    await db.insert(modelSettings).values({
      modelComponentId: componentRecord.id,
      environmentId: defaultEnvId,
      editionId: defaultEditionId,
      deploy: comp.settings["deploy"] === true || comp.settings["deploy"] === "true",
      gpuList,
      replica: 1,
      gpuMemoryUtilization: null,
      extraSettings: {
        ...comp.settings,
        resourceRaw: comp.resource.raw,
        importSource: "confluence",
      },
    });
  }

  return versionRecord;
}
