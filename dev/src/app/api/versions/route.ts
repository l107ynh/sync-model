import { db } from "@/db";
import { versions } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const data = await db.select().from(versions);
    return successResponse(data);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to fetch versions", 500);
  }
}
