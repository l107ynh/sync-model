import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { sendMrNotification, NotificationError } from "@/lib/notifications";

const sendSchema = z.object({
  merge_request_id: z.string().uuid("merge_request_id 必須是有效的 UUID"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = sendSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const { merge_request_id } = parseResult.data;

    await sendMrNotification(merge_request_id);

    return successResponse({
      status: "sent",
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof NotificationError) {
      const statusMap: Record<string, number> = {
        NOTIFICATION_DISABLED: 503,
        WEBHOOK_ERROR: 502,
      };
      const status = statusMap[error.code] ?? 500;
      return errorResponse(error.code, error.message, status);
    }
    console.error("Send notification failed:", error);
    return errorResponse("INTERNAL_ERROR", "發送通知失敗", 500);
  }
}
