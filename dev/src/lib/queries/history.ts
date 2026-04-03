import { db } from "@/db";
import {
  changeHistories,
  modelSettings,
  modelComponents,
  environments,
  editions,
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface HistoryQueryParams {
  versionId?: string;
  environmentId?: string;
  editionId?: string;
  modelComponentId?: string;
  changedBy?: string;
  changeType?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  perPage: number;
}

export async function queryHistory(params: HistoryQueryParams) {
  const {
    versionId,
    environmentId,
    editionId,
    modelComponentId,
    changedBy,
    changeType,
    fromDate,
    toDate,
    page,
    perPage,
  } = params;

  const conditions = [];

  if (versionId) {
    conditions.push(eq(modelComponents.versionId, versionId));
  }
  if (environmentId) {
    conditions.push(eq(modelSettings.environmentId, environmentId));
  }
  if (editionId) {
    conditions.push(eq(modelSettings.editionId, editionId));
  }
  if (modelComponentId) {
    conditions.push(eq(modelSettings.modelComponentId, modelComponentId));
  }
  if (changedBy) {
    conditions.push(eq(changeHistories.changedBy, changedBy));
  }
  if (changeType) {
    conditions.push(eq(changeHistories.changeType, changeType));
  }
  if (fromDate) {
    conditions.push(gte(changeHistories.createdAt, new Date(fromDate)));
  }
  if (toDate) {
    conditions.push(lte(changeHistories.createdAt, new Date(toDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: changeHistories.id,
        modelSettingId: modelSettings.id,
        modelComponentName: modelComponents.name,
        modelComponentType: modelComponents.type,
        componentVersion: modelComponents.componentVersion,
        environmentName: environments.name,
        editionName: editions.name,
        changedBy: changeHistories.changedBy,
        changeType: changeHistories.changeType,
        diff: changeHistories.diff,
        reason: changeHistories.reason,
        createdAt: changeHistories.createdAt,
      })
      .from(changeHistories)
      .innerJoin(
        modelSettings,
        eq(changeHistories.modelSettingId, modelSettings.id)
      )
      .innerJoin(
        modelComponents,
        eq(modelSettings.modelComponentId, modelComponents.id)
      )
      .innerJoin(
        environments,
        eq(modelSettings.environmentId, environments.id)
      )
      .innerJoin(editions, eq(modelSettings.editionId, editions.id))
      .where(whereClause)
      .orderBy(desc(changeHistories.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(changeHistories)
      .innerJoin(
        modelSettings,
        eq(changeHistories.modelSettingId, modelSettings.id)
      )
      .innerJoin(
        modelComponents,
        eq(modelSettings.modelComponentId, modelComponents.id)
      )
      .innerJoin(
        environments,
        eq(modelSettings.environmentId, environments.id)
      )
      .innerJoin(editions, eq(modelSettings.editionId, editions.id))
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data: data.map((row) => ({
      id: row.id,
      model_setting: {
        id: row.modelSettingId,
        model_component: {
          name: row.modelComponentName,
          type: row.modelComponentType,
        },
        environment: { name: row.environmentName },
        edition: { name: row.editionName },
      },
      changed_by: row.changedBy,
      change_type: row.changeType,
      diff: row.diff,
      reason: row.reason,
      created_at: row.createdAt.toISOString(),
    })),
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage) || 1,
    },
  };
}

export async function getHistoryById(historyId: string) {
  const result = await db
    .select({
      id: changeHistories.id,
      modelSettingId: modelSettings.id,
      modelComponentName: modelComponents.name,
      modelComponentType: modelComponents.type,
      componentVersion: modelComponents.componentVersion,
      environmentId: environments.id,
      environmentName: environments.name,
      editionId: editions.id,
      editionName: editions.name,
      changedBy: changeHistories.changedBy,
      changeType: changeHistories.changeType,
      diff: changeHistories.diff,
      reason: changeHistories.reason,
      createdAt: changeHistories.createdAt,
    })
    .from(changeHistories)
    .innerJoin(
      modelSettings,
      eq(changeHistories.modelSettingId, modelSettings.id)
    )
    .innerJoin(
      modelComponents,
      eq(modelSettings.modelComponentId, modelComponents.id)
    )
    .innerJoin(environments, eq(modelSettings.environmentId, environments.id))
    .innerJoin(editions, eq(modelSettings.editionId, editions.id))
    .where(eq(changeHistories.id, historyId))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    model_setting: {
      id: row.modelSettingId,
      model_component: {
        name: row.modelComponentName,
        type: row.modelComponentType,
        component_version: row.componentVersion,
      },
      environment: { id: row.environmentId, name: row.environmentName },
      edition: { id: row.editionId, name: row.editionName },
    },
    changed_by: row.changedBy,
    change_type: row.changeType,
    diff: row.diff,
    reason: row.reason,
    created_at: row.createdAt.toISOString(),
  };
}

export async function getSettingHistory(
  settingId: string,
  page: number,
  perPage: number
) {
  const [data, countResult] = await Promise.all([
    db
      .select({
        id: changeHistories.id,
        changedBy: changeHistories.changedBy,
        changeType: changeHistories.changeType,
        diff: changeHistories.diff,
        reason: changeHistories.reason,
        createdAt: changeHistories.createdAt,
      })
      .from(changeHistories)
      .where(eq(changeHistories.modelSettingId, settingId))
      .orderBy(desc(changeHistories.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(changeHistories)
      .where(eq(changeHistories.modelSettingId, settingId)),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data: data.map((row) => ({
      id: row.id,
      changed_by: row.changedBy,
      change_type: row.changeType,
      diff: row.diff,
      reason: row.reason,
      created_at: row.createdAt.toISOString(),
    })),
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage) || 1,
    },
  };
}
