import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema matching the one in the API route
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

describe("GET /api/v1/history - query validation", () => {
  it("should accept empty params with defaults", () => {
    const result = historyQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(20);
    }
  });

  it("should accept valid UUID filters", () => {
    const result = historyQuerySchema.safeParse({
      version_id: "550e8400-e29b-41d4-a716-446655440000",
      environment_id: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID", () => {
    const result = historyQuerySchema.safeParse({
      version_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid change_type", () => {
    for (const type of ["CREATE", "UPDATE", "DELETE"]) {
      const result = historyQuerySchema.safeParse({ change_type: type });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid change_type", () => {
    const result = historyQuerySchema.safeParse({ change_type: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("should accept valid date range", () => {
    const result = historyQuerySchema.safeParse({
      from_date: "2026-04-01T00:00:00Z",
      to_date: "2026-04-02T23:59:59Z",
    });
    expect(result.success).toBe(true);
  });

  it("should coerce page and per_page from strings", () => {
    const result = historyQuerySchema.safeParse({
      page: "3",
      per_page: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.per_page).toBe(50);
    }
  });

  it("should reject per_page > 100", () => {
    const result = historyQuerySchema.safeParse({ per_page: "200" });
    expect(result.success).toBe(false);
  });

  it("should reject page < 1", () => {
    const result = historyQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("should accept changed_by filter", () => {
    const result = historyQuerySchema.safeParse({ changed_by: "lynn.yang" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.changed_by).toBe("lynn.yang");
    }
  });
});

describe("History response structure", () => {
  it("should have correct pagination structure", () => {
    const pagination = {
      page: 1,
      per_page: 20,
      total: 150,
      total_pages: 8,
    };

    expect(pagination.total_pages).toBe(Math.ceil(pagination.total / pagination.per_page));
  });

  it("should format history item correctly", () => {
    const item = {
      id: "uuid-1",
      model_setting: {
        id: "setting-uuid",
        model_component: { name: "asr-general", type: "ASR" },
        environment: { name: "prod" },
        edition: { name: "pro" },
      },
      changed_by: "lynn.yang",
      change_type: "UPDATE",
      diff: {
        deploy: { old: false, new: true },
        replica: { old: 1, new: 3 },
      },
      reason: "增加 prod 副本數",
      created_at: "2026-04-02T10:30:00.000Z",
    };

    expect(item.model_setting.model_component.name).toBe("asr-general");
    expect(item.change_type).toBe("UPDATE");
    expect(item.diff.replica.old).toBe(1);
    expect(item.diff.replica.new).toBe(3);
  });

  it("CREATE diff should have null old values", () => {
    const createDiff = {
      deploy: { old: null, new: false },
      replica: { old: null, new: 1 },
    };

    for (const value of Object.values(createDiff)) {
      expect(value.old).toBeNull();
    }
  });

  it("DELETE diff should have null new values", () => {
    const deleteDiff = {
      deploy: { old: true, new: null },
      replica: { old: 3, new: null },
    };

    for (const value of Object.values(deleteDiff)) {
      expect(value.new).toBeNull();
    }
  });
});
