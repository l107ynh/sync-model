import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { getHistoryById } from "@/lib/queries/history";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ historyId: string }> }
) {
  try {
    const { historyId } = await params;

    const history = await getHistoryById(historyId);
    if (!history) {
      return errorResponse("NOT_FOUND", "History record not found", 404);
    }

    return successResponse(history);
  } catch (error) {
    console.error("Failed to fetch history detail:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to fetch history detail",
      500
    );
  }
}
