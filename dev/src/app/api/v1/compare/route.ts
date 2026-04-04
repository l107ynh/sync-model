import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { compareVersions } from "@/lib/queries/compare";
import { ApiError } from "@/lib/api-error";

const compareQuerySchema = z
  .object({
    version_a_id: z.string().uuid("version_a_id must be a valid UUID"),
    version_b_id: z.string().uuid("version_b_id must be a valid UUID"),
    environment_id: z.string().uuid().optional(),
    edition_id: z.string().uuid().optional(),
  })
  .refine((data) => data.version_a_id !== data.version_b_id, {
    message: "Cannot compare a version with itself",
    path: ["version_b_id"],
  });

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries()
    );

    if (!searchParams.version_a_id || !searchParams.version_b_id) {
      return errorResponse(
        "INVALID_INPUT",
        "version_a_id and version_b_id are required",
        400
      );
    }

    const parseResult = compareQuerySchema.safeParse(searchParams);
    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const query = parseResult.data;

    const result = await compareVersions({
      versionAId: query.version_a_id,
      versionBId: query.version_b_id,
      environmentId: query.environment_id,
      editionId: query.edition_id,
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.code, error.message, error.status);
    }
    console.error("Failed to compare versions:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to compare versions",
      500
    );
  }
}
