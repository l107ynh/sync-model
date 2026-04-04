import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { generateCodegenPreview } from "@/lib/cdk8s-codegen";
import { getEnv } from "@/lib/env";
import { db } from "@/db";
import { changeHistories, codegenResults } from "@/db/schema";
import { inArray } from "drizzle-orm";

const generateSchema = z.object({
  change_history_ids: z
    .array(z.string().uuid())
    .min(1, "至少需要 1 個 change_history_id")
    .max(50, "最多 50 個 change_history_ids"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = generateSchema.safeParse(body);

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

    // 產生 codegen
    const preview = await generateCodegenPreview(change_history_ids, repoPath);

    // 儲存到 DB
    const [codegenResult] = await db
      .insert(codegenResults)
      .values({
        changeHistoryIds: change_history_ids,
        files: preview.files.map((f) => ({
          path: f.path,
          action: f.action,
          content: f.modified,
          diff: f.diff,
        })),
        summary: preview.summary,
        status: "ready",
      })
      .returning();

    return successResponse({
      codegen_id: codegenResult.id,
      files: preview.files.map((f) => ({
        path: f.path,
        action: f.action,
        content: f.modified,
      })),
      status: "ready",
      created_at: codegenResult.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Codegen generate failed:", error);
    return errorResponse(
      "CODEGEN_ERROR",
      error instanceof Error ? error.message : "Codegen generate 失敗",
      422
    );
  }
}
