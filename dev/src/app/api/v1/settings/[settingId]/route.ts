import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { getSettingById } from "@/lib/queries/settings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ settingId: string }> }
) {
  try {
    const { settingId } = await params;

    const setting = await getSettingById(settingId);
    if (!setting) {
      return errorResponse("NOT_FOUND", "Setting not found", 404);
    }

    return successResponse(setting);
  } catch (error) {
    console.error("Failed to fetch setting:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch setting", 500);
  }
}
