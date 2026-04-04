import { pgTable, uuid, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const mergeRequests = pgTable("merge_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  codegenId: uuid("codegen_id"),
  gitlabMrId: integer("gitlab_mr_id"),
  gitlabMrUrl: varchar("gitlab_mr_url", { length: 500 }),
  sourceBranch: varchar("source_branch", { length: 200 }).notNull(),
  targetBranch: varchar("target_branch", { length: 200 }).default("main").notNull(),
  title: varchar("title", { length: 200 }),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(), // PENDING, OPEN, MERGED, CLOSED
  changeHistoryIds: jsonb("change_history_ids").$type<string[]>().default([]),
  filesChanged: jsonb("files_changed").$type<{ path: string; action: string }[]>().default([]),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
