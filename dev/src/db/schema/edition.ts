import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const editions = pgTable("editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
