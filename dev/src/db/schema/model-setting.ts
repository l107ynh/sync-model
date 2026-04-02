import {
  pgTable,
  uuid,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { modelComponents } from "./model-component";
import { environments } from "./environment";
import { editions } from "./edition";

export const modelSettings = pgTable(
  "model_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelComponentId: uuid("model_component_id")
      .notNull()
      .references(() => modelComponents.id),
    environmentId: uuid("environment_id")
      .notNull()
      .references(() => environments.id),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    deploy: boolean("deploy").default(false).notNull(),
    gpuList: jsonb("gpu_list").$type<string[]>().default([]),
    replica: integer("replica").default(1).notNull(),
    gpuMemoryUtilization: numeric("gpu_memory_utilization", {
      precision: 3,
      scale: 2,
    }),
    extraSettings: jsonb("extra_settings")
      .$type<Record<string, unknown>>()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSetting: unique().on(
      table.modelComponentId,
      table.environmentId,
      table.editionId
    ),
  })
);
