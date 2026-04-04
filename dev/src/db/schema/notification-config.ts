import { pgTable, uuid, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationConfig = pgTable("notification_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
