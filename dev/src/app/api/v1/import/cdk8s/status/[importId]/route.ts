/**
 * GET /api/v1/import/cdk8s/status/:importId
 *
 * 查詢匯入作業的狀態。
 */

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { imports } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api";
import { ErrorCodes } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;

    const result = await db
      .select()
      .from(imports)
      .where(eq(imports.id, importId))
      .limit(1);

    if (result.length === 0) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        "Import record not found",
        ErrorCodes.NOT_FOUND.status
      );
    }

    const record = result[0];

    return successResponse({
      id: record.id,
      status: record.status,
      progress: record.progress,
      summary: record.summary,
      started_at: record.startedAt.toISOString(),
      completed_at: record.completedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch import status:", error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      "Failed to fetch import status",
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}
