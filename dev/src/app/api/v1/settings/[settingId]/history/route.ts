import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { getSettingById } from "@/lib/queries/settings";
import { getSettingHistory } from "@/lib/queries/history";

const settingHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ settingId: string }> }
) {
  try {
    const { settingId } = await params;

    // Verify setting exists
    const setting = await getSettingById(settingId);
    if (!setting) {
      return errorResponse("NOT_FOUND", "Setting not found", 404);
    }

    const { searchParams } = new URL(request.url);
    const rawParams: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      rawParams[key] = value;
    }

    const parseResult = settingHistoryQuerySchema.safeParse(rawParams);
    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
        400
      );
    }

    const { page, per_page } = parseResult.data;
    const result = await getSettingHistory(settingId, page, per_page);

    return successResponse(result);
  } catch (error) {
    console.error("Failed to fetch setting history:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to fetch setting history",
      500
    );
  }
}
