import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import {
  getNotificationConfig,
  updateNotificationConfig,
} from "@/lib/notifications";

export async function GET() {
  try {
    const config = await getNotificationConfig();
    return successResponse({
      enabled: config.enabled,
      webhook_url_configured: config.webhookUrlConfigured,
    });
  } catch (error) {
    console.error("Get notification config failed:", error);
    return errorResponse("INTERNAL_ERROR", "查詢通知設定失敗", 500);
  }
}

const patchSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = patchSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const result = await updateNotificationConfig(parseResult.data.enabled);

    return successResponse({
      enabled: result.enabled,
      updated_at: result.updatedAt,
    });
  } catch (error) {
    console.error("Update notification config failed:", error);
    return errorResponse("INTERNAL_ERROR", "更新通知設定失敗", 500);
  }
}
