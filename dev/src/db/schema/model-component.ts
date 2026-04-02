import { pgTable, uuid, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { versions } from "./version";

export const modelComponents = pgTable(
  "model_components",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id),
    componentVersion: varchar("component_version", { length: 50 }),
    image: varchar("image", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueNameVersion: unique().on(table.name, table.versionId),
  })
);
