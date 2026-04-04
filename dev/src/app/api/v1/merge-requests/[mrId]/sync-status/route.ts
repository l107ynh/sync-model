import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { db } from "@/db";
import { mergeRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMergeRequest, GitLabApiError } from "@/lib/gitlab/client";

const stateMap: Record<string, string> = {
  opened: "OPEN",
  merged: "MERGED",
  closed: "CLOSED",
};

export async function POST(
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

    if (!mr.gitlabMrId) {
      return errorResponse(
        "INVALID_INPUT",
        "此 MR 沒有關聯的 GitLab MR",
        400
      );
    }

    const gitlabMr = await getMergeRequest(mr.gitlabMrId);
    const newStatus = stateMap[gitlabMr.state] ?? "OPEN";

    await db
      .update(mergeRequests)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(mergeRequests.id, mrId));

    return successResponse({
      id: mrId,
      status: newStatus,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof GitLabApiError) {
      return errorResponse(
        "GITLAB_ERROR",
        `GitLab 同步失敗: ${error.message}`,
        502
      );
    }
    console.error("Sync MR status failed:", error);
    return errorResponse("INTERNAL_ERROR", "同步 MR 狀態失敗", 500);
  }
}
