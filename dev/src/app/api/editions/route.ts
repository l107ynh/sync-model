import { db } from "@/db";
import { editions } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const data = await db.select().from(editions);
    return successResponse(data);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to fetch editions", 500);
  }
}
