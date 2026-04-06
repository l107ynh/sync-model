/**
 * POST /api/v1/export/confluence
 *
 * Confluence 匯出 API。
 *
 * Request body (JSON):
 *   - version_id: uuid（必要）
 *   - format: "html" | "confluence_api"（必要）
 *   - environment_ids: uuid[]（選配）
 *   - edition_ids: uuid[]（選配）
 *   - confluence_page_id: string（format=confluence_api 時必要）
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { versions } from "@/db/schema";
import {
  getExportComponents,
  generateConfluenceHtml,
} from "@/lib/confluence/export-generator";
import { getPage, updatePage } from "@/lib/confluence/client";
import { successResponse, errorResponse } from "@/lib/api";
import { ApiError, ErrorCodes } from "@/lib/api-error";

const requestSchema = z.object({
  version_id: z.string().uuid("version_id 必須為 UUID"),
  format: z.enum(["html", "confluence_api"], {
    errorMap: () => ({ message: "format 必須為 html 或 confluence_api" }),
  }),
  environment_ids: z.array(z.string().uuid()).optional(),
  edition_ids: z.array(z.string().uuid()).optional(),
  confluence_page_id: z.string().optional(),
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

    const { version_id, format, environment_ids, edition_ids, confluence_page_id } = body;

    // 2. format=confluence_api 需要 confluence_page_id
    if (format === "confluence_api" && !confluence_page_id) {
      throw new ApiError(
        "INVALID_INPUT",
        "format 為 confluence_api 時必須提供 confluence_page_id"
      );
    }

    // 3. 檢查 version 是否存在
    const [version] = await db
      .select()
      .from(versions)
      .where(eq(versions.id, version_id))
      .limit(1);

    if (!version) {
      throw new ApiError("NOT_FOUND", `版本 ${version_id} 不存在`);
    }

    // 4. 查詢匯出資料
    const components = await getExportComponents({
      versionId: version_id,
      environmentIds: environment_ids,
      editionIds: edition_ids,
    });

    // 5. 產生 HTML
    const htmlContent = generateConfluenceHtml(components);

    // 6. 根據 format 回應
    if (format === "html") {
      return successResponse({
        format: "html",
        content: htmlContent,
        version: { id: version.id, name: version.name },
        generated_at: new Date().toISOString(),
      });
    }

    if (format === "confluence_api") {
      try {
        // 取得目前頁面版本號
        const currentPage = await getPage(confluence_page_id!);
        const result = await updatePage(
          confluence_page_id!,
          currentPage.title,
          htmlContent,
          currentPage.versionNumber
        );

        return successResponse({
          status: "updated",
          confluence_page_id: confluence_page_id,
          confluence_page_url: result.pageUrl,
          updated_at: result.updatedAt,
        });
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(
          "CONFLUENCE_ERROR",
          err instanceof Error ? err.message : "Confluence API 更新失敗"
        );
      }
    }

    throw new ApiError("INVALID_INPUT", `不支援的格式: ${format}`);
  } catch (err) {
    if (err instanceof ApiError) {
      return errorResponse(err.code, err.message, err.status, err.details);
    }
    console.error("Confluence export failed:", err);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      err instanceof Error ? err.message : "匯出失敗",
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}
