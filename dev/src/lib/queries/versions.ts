import { db } from "@/db";
import { versions, modelComponents, environments, editions, modelSettings } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export interface VersionsQueryParams {
  page: number;
  perPage: number;
}

export async function queryVersions(params: VersionsQueryParams) {
  const { page, perPage } = params;
  const offset = (page - 1) * perPage;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: versions.id,
        name: versions.name,
        description: versions.description,
        createdAt: versions.createdAt,
        updatedAt: versions.updatedAt,
      })
      .from(versions)
      .orderBy(desc(versions.createdAt))
      .limit(perPage)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(versions),
  ]);

  // Get model component counts for each version
  const versionIds = data.map((v) => v.id);
  const componentCounts =
    versionIds.length > 0
      ? await db
          .select({
            versionId: modelComponents.versionId,
            count: sql<number>`count(*)::int`.as("count"),
          })
          .from(modelComponents)
          .where(
            sql`${modelComponents.versionId} IN (${sql.join(
              versionIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
          .groupBy(modelComponents.versionId)
      : [];

  const countMap = new Map(componentCounts.map((c) => [c.versionId, c.count]));

  const total = countResult[0]?.count ?? 0;

  return {
    data: data.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      model_components_count: countMap.get(v.id) ?? 0,
      created_at: v.createdAt.toISOString(),
      updated_at: v.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage) || 1,
    },
  };
}

export async function getVersionById(versionId: string) {
  const result = await db
    .select()
    .from(versions)
    .where(eq(versions.id, versionId))
    .limit(1);

  if (result.length === 0) return null;

  const componentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(modelComponents)
    .where(eq(modelComponents.versionId, versionId));

  return {
    id: result[0].id,
    name: result[0].name,
    description: result[0].description,
    model_components_count: componentCount[0]?.count ?? 0,
    created_at: result[0].createdAt.toISOString(),
    updated_at: result[0].updatedAt.toISOString(),
  };
}

export async function getEnvironmentsByVersionId(versionId: string) {
  // Get distinct environments that have settings for this version
  const result = await db
    .selectDistinct({
      id: environments.id,
      name: environments.name,
    })
    .from(environments)
    .innerJoin(modelSettings, eq(modelSettings.environmentId, environments.id))
    .innerJoin(
      modelComponents,
      eq(modelSettings.modelComponentId, modelComponents.id)
    )
    .where(eq(modelComponents.versionId, versionId));

  return { data: result };
}

export async function getEditionsByVersionId(versionId: string) {
  // Get distinct editions that have settings for this version
  const result = await db
    .selectDistinct({
      id: editions.id,
      name: editions.name,
    })
    .from(editions)
    .innerJoin(modelSettings, eq(modelSettings.editionId, editions.id))
    .innerJoin(
      modelComponents,
      eq(modelSettings.modelComponentId, modelComponents.id)
    )
    .where(eq(modelComponents.versionId, versionId));

  return { data: result };
}
