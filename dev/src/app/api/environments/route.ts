import { db } from "@/db";
import { environments } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const data = await db.select().from(environments);
    return successResponse(data);
  } catch {
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to fetch environments",
      500
    );
  }
}
