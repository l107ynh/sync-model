import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { generateCodegenPreview } from "@/lib/cdk8s-codegen";
import { getEnv } from "@/lib/env";
import { db } from "@/db";
import { changeHistories } from "@/db/schema";
import { inArray } from "drizzle-orm";

const previewSchema = z.object({
  change_history_ids: z
    .array(z.string().uuid())
    .min(1, "至少需要 1 個 change_history_id")
    .max(50, "最多 50 個 change_history_ids"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = previewSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const { change_history_ids } = parseResult.data;
    const env = getEnv();
    const repoPath = env.CDK8S_REPO_PATH;

    if (!repoPath) {
      return errorResponse(
        "INVALID_INPUT",
        "CDK8S_REPO_PATH 環境變數未設定",
        400
      );
    }

    // 驗證 change_history_ids 都存在
    const existing = await db
      .select({ id: changeHistories.id })
      .from(changeHistories)
      .where(inArray(changeHistories.id, change_history_ids));

    if (existing.length !== change_history_ids.length) {
      const existingIds = new Set(existing.map((e) => e.id));
      const missing = change_history_ids.filter((id) => !existingIds.has(id));
      return errorResponse(
        "NOT_FOUND",
        `找不到以下 change_history_ids: ${missing.join(", ")}`,
        404
      );
    }

    const result = await generateCodegenPreview(change_history_ids, repoPath);

    return successResponse({
      files: result.files.map((f) => ({
        path: f.path,
        action: f.action,
        diff: f.diff,
        full_content: f.modified,
      })),
      warnings: result.warnings,
      summary: result.summary,
    });
  } catch (error) {
    console.error("Codegen preview failed:", error);
    return errorResponse(
      "CODEGEN_ERROR",
      error instanceof Error ? error.message : "Codegen preview 失敗",
      422
    );
  }
}
