import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { modelSettings } from "./model-setting";

export const changeHistories = pgTable("change_histories", {
  id: uuid("id").defaultRandom().primaryKey(),
  modelSettingId: uuid("model_setting_id")
    .notNull()
    .references(() => modelSettings.id),
  changedBy: varchar("changed_by", { length: 100 }).notNull(),
  changeType: varchar("change_type", { length: 20 }).notNull(), // CREATE, UPDATE, DELETE
  diff: jsonb("diff").$type<Record<string, { old: unknown; new: unknown }>>().notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
