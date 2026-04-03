import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { versions } from "./version";

export const imports = pgTable("imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionId: uuid("version_id").references(() => versions.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  summary: jsonb("summary"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
