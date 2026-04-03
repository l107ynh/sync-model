import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { getVersionById, getEditionsByVersionId } from "@/lib/queries/versions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params;

    const version = await getVersionById(versionId);
    if (!version) {
      return errorResponse("NOT_FOUND", "Version not found", 404);
    }

    const result = await getEditionsByVersionId(versionId);
    return successResponse(result);
  } catch (error) {
    console.error("Failed to fetch editions:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch editions", 500);
  }
}
