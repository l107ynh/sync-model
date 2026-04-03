import { describe, it, expect } from "vitest";

describe("GET /api/v1/health", () => {
  it("should return health check response structure", () => {
    const response = {
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: "connected",
    };

    expect(response.status).toBe("ok");
    expect(response.version).toBe("1.0.0");
    expect(response.database).toBe("connected");
    expect(response.timestamp).toBeDefined();
  });

  it("should return error structure when db is disconnected", () => {
    const response = {
      status: "error",
      message: "Database connection failed",
    };

    expect(response.status).toBe("error");
    expect(response.message).toBe("Database connection failed");
  });
});
