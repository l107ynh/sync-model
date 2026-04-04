import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { db } from "@/db";
import { mergeRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mrId: string }> }
) {
  try {
    const { mrId } = await params;

    const [mr] = await db
      .select()
      .from(mergeRequests)
      .where(eq(mergeRequests.id, mrId))
      .limit(1);

    if (!mr) {
      return errorResponse("NOT_FOUND", `MR ${mrId} 不存在`, 404);
    }

    return successResponse({
      id: mr.id,
      codegen_id: mr.codegenId,
      gitlab_mr_id: mr.gitlabMrId,
      gitlab_mr_url: mr.gitlabMrUrl,
      source_branch: mr.sourceBranch,
      target_branch: mr.targetBranch,
      status: mr.status,
      title: mr.title,
      change_history_ids: mr.changeHistoryIds,
      files_changed: mr.filesChanged,
      created_by: mr.createdBy,
      created_at: mr.createdAt.toISOString(),
      updated_at: mr.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Get MR failed:", error);
    return errorResponse("INTERNAL_ERROR", "查詢 MR 失敗", 500);
  }
}
