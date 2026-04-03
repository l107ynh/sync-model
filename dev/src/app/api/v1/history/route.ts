import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { queryHistory } from "@/lib/queries/history";

const historyQuerySchema = z.object({
  version_id: z.string().uuid().optional(),
  environment_id: z.string().uuid().optional(),
  edition_id: z.string().uuid().optional(),
  model_component_id: z.string().uuid().optional(),
  changed_by: z.string().optional(),
  change_type: z.enum(["CREATE", "UPDATE", "DELETE"]).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      rawParams[key] = value;
    }

    const parseResult = historyQuerySchema.safeParse(rawParams);
    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
        400
      );
    }

    const params = parseResult.data;

    const result = await queryHistory({
      versionId: params.version_id,
      environmentId: params.environment_id,
      editionId: params.edition_id,
      modelComponentId: params.model_component_id,
      changedBy: params.changed_by,
      changeType: params.change_type,
      fromDate: params.from_date,
      toDate: params.to_date,
      page: params.page,
      perPage: params.per_page,
    });

    return successResponse(result);
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch history", 500);
  }
}
