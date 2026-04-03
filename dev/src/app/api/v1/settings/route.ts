import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { getVersionById } from "@/lib/queries/versions";
import { querySettings } from "@/lib/queries/settings";

const querySchema = z.object({
  version_id: z.string().uuid("version_id must be a valid UUID"),
  environment_id: z.string().uuid().optional(),
  edition_id: z.string().uuid().optional(),
  model_type: z.string().optional(),
  deploy_only: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  search: z.string().optional(),
  sort_by: z.enum(["name", "type", "deploy", "replica", "gpu_memory_utilization"]).default("name"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v ?? "1", 10))),
  per_page: z
    .string()
    .optional()
    .transform((v) => Math.min(200, Math.max(1, parseInt(v ?? "50", 10)))),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries()
    );

    // Validate version_id is present
    if (!searchParams.version_id) {
      return errorResponse(
        "INVALID_INPUT",
        "version_id is required",
        400
      );
    }

    const parseResult = querySchema.safeParse(searchParams);
    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const query = parseResult.data;

    // Check version exists
    const version = await getVersionById(query.version_id);
    if (!version) {
      return errorResponse("NOT_FOUND", "Version not found", 404);
    }

    const result = await querySettings({
      versionId: query.version_id,
      environmentId: query.environment_id,
      editionId: query.edition_id,
      modelType: query.model_type,
      deployOnly: query.deploy_only,
      search: query.search,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
      page: query.page,
      perPage: query.per_page,
    });

    return successResponse(result);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch settings", 500);
  }
}
