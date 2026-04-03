import { describe, it, expect } from "vitest";
import {
  versions,
  environments,
  editions,
  modelComponents,
  modelSettings,
  changeHistories,
  mergeRequests,
} from "@/db/schema";

describe("Database Schema", () => {
  it("should export versions table", () => {
    expect(versions).toBeDefined();
  });

  it("should export environments table", () => {
    expect(environments).toBeDefined();
  });

  it("should export editions table", () => {
    expect(editions).toBeDefined();
  });

  it("should export modelComponents table", () => {
    expect(modelComponents).toBeDefined();
  });

  it("should export modelSettings table", () => {
    expect(modelSettings).toBeDefined();
  });

  it("should export changeHistories table", () => {
    expect(changeHistories).toBeDefined();
  });

  it("should export mergeRequests table", () => {
    expect(mergeRequests).toBeDefined();
  });
});
