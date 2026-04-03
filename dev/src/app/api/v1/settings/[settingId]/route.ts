import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { getSettingById, updateSetting, UpdateSettingError } from "@/lib/queries/settings";

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

const patchSettingSchema = z.object({
  deploy: z.boolean().optional(),
  gpu_list: z.array(z.string().max(50)).optional(),
  replica: z.number().int().min(0).optional(),
  gpu_memory_utilization: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .transform((v) =>
      v !== undefined ? Math.round(v * 100) / 100 : undefined
    ),
  extra_settings: z.record(z.unknown()).optional(),
  reason: z.string().max(500).optional(),
  changed_by: z.string().max(100),
  expected_updated_at: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ settingId: string }> }
) {
  try {
    const { settingId } = await params;
    const body = await request.json();

    const parseResult = patchSettingSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
        400
      );
    }

    const { changed_by, reason, expected_updated_at, ...changes } =
      parseResult.data;

    // Filter out undefined values
    const cleanChanges: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) {
        cleanChanges[key] = value;
      }
    }

    if (Object.keys(cleanChanges).length === 0) {
      return errorResponse(
        "INVALID_INPUT",
        "At least one setting field must be provided",
        400
      );
    }

    const result = await updateSetting(
      settingId,
      cleanChanges,
      changed_by,
      reason,
      expected_updated_at
    );

    return successResponse({
      ...result.setting,
      change_history_id: result.changeHistoryId,
    });
  } catch (error) {
    if (error instanceof UpdateSettingError) {
      return errorResponse(error.code, error.message, error.status);
    }
    console.error("Failed to update setting:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to update setting", 500);
  }
}
