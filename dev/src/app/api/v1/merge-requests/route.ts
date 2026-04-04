import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api";
import { createMr, MrServiceError } from "@/lib/gitlab/mr-service";
import { db } from "@/db";
import { mergeRequests } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ── POST: 建立 MR ──

const createMrSchema = z.object({
  codegen_id: z.string().uuid("codegen_id 必須是有效的 UUID"),
  title: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  created_by: z.string().min(1).max(100, "created_by 必填"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = createMrSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const { codegen_id, title, description, created_by } = parseResult.data;

    const result = await createMr({
      codegenId: codegen_id,
      title,
      description,
      createdBy: created_by,
    });

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof MrServiceError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        DUPLICATE: 409,
        INVALID_INPUT: 400,
        GITLAB_ERROR: 502,
      };
      const status = statusMap[error.code] ?? 500;
      return errorResponse(error.code, error.message, status);
    }

    console.error("Create MR failed:", error);
    return errorResponse("INTERNAL_ERROR", "建立 MR 失敗", 500);
  }
}

// ── GET: 列出 MR ──

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "OPEN", "MERGED", "CLOSED"]).optional(),
  created_by: z.string().optional(),
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

    const parseResult = listQuerySchema.safeParse(rawParams);
    if (!parseResult.success) {
      return errorResponse(
        "INVALID_INPUT",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const { status, created_by, page, per_page } = parseResult.data;

    const conditions = [];
    if (status) {
      conditions.push(eq(mergeRequests.status, status));
    }
    if (created_by) {
      conditions.push(eq(mergeRequests.createdBy, created_by));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(mergeRequests)
        .where(where)
        .orderBy(desc(mergeRequests.createdAt))
        .limit(per_page)
        .offset((page - 1) * per_page),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(mergeRequests)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    return successResponse({
      data: data.map((mr) => ({
        id: mr.id,
        gitlab_mr_id: mr.gitlabMrId,
        gitlab_mr_url: mr.gitlabMrUrl,
        source_branch: mr.sourceBranch,
        target_branch: mr.targetBranch,
        status: mr.status,
        title: mr.title,
        created_by: mr.createdBy,
        created_at: mr.createdAt.toISOString(),
        updated_at: mr.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    });
  } catch (error) {
    console.error("List MRs failed:", error);
    return errorResponse("INTERNAL_ERROR", "查詢 MR 列表失敗", 500);
  }
}
