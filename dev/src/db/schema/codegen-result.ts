import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

export interface CodegenFile {
  path: string;
  action: "modify" | "create";
  content: string;
  diff?: string;
}

export interface CodegenSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export const codegenResults = pgTable("codegen_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  changeHistoryIds: jsonb("change_history_ids").$type<string[]>().notNull(),
  files: jsonb("files").$type<CodegenFile[]>().notNull(),
  summary: jsonb("summary").$type<CodegenSummary>(),
  status: varchar("status", { length: 20 }).default("ready").notNull(), // ready, used
  mergeRequestId: uuid("merge_request_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
