import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { queryVersions } from "@/lib/queries/versions";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10))
    );

    const result = await queryVersions({ page, perPage });
    return successResponse(result);
  } catch (error) {
    console.error("Failed to fetch versions:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch versions", 500);
  }
}
