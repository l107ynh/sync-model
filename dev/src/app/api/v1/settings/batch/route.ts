import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { db } from "@/db";
import {
  modelSettings,
  changeHistories,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeDiff } from "@/lib/diff";
import { getSettingById } from "@/lib/queries/settings";

const MAX_BATCH_SIZE = 50;

const batchSettingItemSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
  settings: z.object({
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
  }),
  reason: z.string().max(500).optional(),
  expected_updated_at: z.string().optional(),
});

const batchPatchSchema = z.object({
  settings: z
    .array(batchSettingItemSchema)
    .min(1, "At least one setting is required")
    .max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} settings per batch`),
  changed_by: z.string().max(100),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = batchPatchSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
        400
      );
    }

    const { settings: items, changed_by } = parseResult.data;

    // 1. Validate all settings exist before starting transaction
    const currentRowsMap = new Map<
      string,
      typeof modelSettings.$inferSelect
    >();

    for (const item of items) {
      const rows = await db
        .select()
        .from(modelSettings)
        .where(eq(modelSettings.id, item.id))
        .limit(1);

      if (rows.length === 0) {
        return errorResponse(
          "NOT_FOUND",
          `Setting not found: ${item.id}`,
          404
        );
      }
      currentRowsMap.set(item.id, rows[0]);
    }

    // 2. Validate optimistic locks and compute diffs
    const updates: Array<{
      item: (typeof items)[number];
      current: typeof modelSettings.$inferSelect;
      diff: Record<string, { old: unknown; new: unknown }>;
      changeHistoryId: string;
    }> = [];

    for (const item of items) {
      const current = currentRowsMap.get(item.id)!;

      // Optimistic lock check
      if (item.expected_updated_at) {
        const expected = new Date(item.expected_updated_at).getTime();
        const actual = current.updatedAt.getTime();
        if (expected !== actual) {
          return errorResponse(
            "CONFLICT",
            `Setting ${item.id} has been modified by another user. Please refresh and try again.`,
            409
          );
        }
      }

      // Compute diff
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};
      const changes = item.settings;

      if (changes.deploy !== undefined) {
        oldValues.deploy = current.deploy;
        newValues.deploy = changes.deploy;
      }
      if (changes.gpu_list !== undefined) {
        oldValues.gpu_list = current.gpuList ?? [];
        newValues.gpu_list = changes.gpu_list;
      }
      if (changes.replica !== undefined) {
        oldValues.replica = current.replica;
        newValues.replica = changes.replica;
      }
      if (changes.gpu_memory_utilization !== undefined) {
        oldValues.gpu_memory_utilization =
          current.gpuMemoryUtilization !== null
            ? parseFloat(current.gpuMemoryUtilization)
            : null;
        newValues.gpu_memory_utilization = changes.gpu_memory_utilization;
      }
      if (changes.extra_settings !== undefined) {
        oldValues.extra_settings = current.extraSettings ?? {};
        newValues.extra_settings = changes.extra_settings;
      }

      const diff = computeDiff(oldValues, newValues);

      if (Object.keys(diff).length === 0) {
        return errorResponse(
          "INVALID_INPUT",
          `No changes detected for setting ${item.id} - submitted values are identical to current values`,
          400
        );
      }

      updates.push({
        item,
        current,
        diff,
        changeHistoryId: crypto.randomUUID(),
      });
    }

    // 3. Transaction: batch update all settings + insert change histories
    const now = new Date();

    await db.transaction(async (tx) => {
      for (const { item, diff, changeHistoryId } of updates) {
        const changes = item.settings;
        const updateData: Record<string, unknown> = { updatedAt: now };

        if (changes.deploy !== undefined) updateData.deploy = changes.deploy;
        if (changes.gpu_list !== undefined)
          updateData.gpuList = changes.gpu_list;
        if (changes.replica !== undefined) updateData.replica = changes.replica;
        if (changes.gpu_memory_utilization !== undefined) {
          updateData.gpuMemoryUtilization = String(
            changes.gpu_memory_utilization
          );
        }
        if (changes.extra_settings !== undefined)
          updateData.extraSettings = changes.extra_settings;

        await tx
          .update(modelSettings)
          .set(updateData)
          .where(eq(modelSettings.id, item.id));

        await tx.insert(changeHistories).values({
          id: changeHistoryId,
          modelSettingId: item.id,
          changedBy: changed_by,
          changeType: "UPDATE",
          diff,
          reason: item.reason || null,
        });
      }
    });

    // 4. Fetch updated settings
    const updated = await Promise.all(
      updates.map(async ({ item, changeHistoryId }) => {
        const setting = await getSettingById(item.id);
        return {
          ...setting,
          change_history_id: changeHistoryId,
        };
      })
    );

    return successResponse({ updated, failed: [] });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.code, error.message, error.status);
    }
    console.error("Failed to batch update settings:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to batch update settings",
      500
    );
  }
}
