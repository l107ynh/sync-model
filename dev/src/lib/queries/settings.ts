import { db } from "@/db";
import {
  modelSettings,
  modelComponents,
  environments,
  editions,
  changeHistories,
} from "@/db/schema";
import { eq, and, ilike, sql, asc, desc } from "drizzle-orm";
import { computeDiff } from "@/lib/diff";
import { ApiError } from "@/lib/api-error";

export interface SettingsQueryParams {
  versionId: string;
  environmentId?: string;
  editionId?: string;
  modelType?: string;
  deployOnly?: boolean;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  perPage: number;
}

export async function querySettings(params: SettingsQueryParams) {
  const {
    versionId,
    environmentId,
    editionId,
    modelType,
    deployOnly,
    search,
    sortBy,
    sortOrder,
    page,
    perPage,
  } = params;

  const conditions = [eq(modelComponents.versionId, versionId)];

  if (environmentId) {
    conditions.push(eq(modelSettings.environmentId, environmentId));
  }
  if (editionId) {
    conditions.push(eq(modelSettings.editionId, editionId));
  }
  if (modelType) {
    conditions.push(eq(modelComponents.type, modelType));
  }
  if (deployOnly) {
    conditions.push(eq(modelSettings.deploy, true));
  }
  if (search) {
    conditions.push(ilike(modelComponents.name, `%${search}%`));
  }

  const whereClause = and(...conditions);

  // Determine sort column
  const sortColumn = (() => {
    switch (sortBy) {
      case "name":
        return modelComponents.name;
      case "type":
        return modelComponents.type;
      case "deploy":
        return modelSettings.deploy;
      case "replica":
        return modelSettings.replica;
      case "gpu_memory_utilization":
        return modelSettings.gpuMemoryUtilization;
      default:
        return modelComponents.name;
    }
  })();

  const orderFn = sortOrder === "desc" ? desc : asc;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: modelSettings.id,
        modelComponentId: modelComponents.id,
        modelComponentName: modelComponents.name,
        modelComponentType: modelComponents.type,
        componentVersion: modelComponents.componentVersion,
        image: modelComponents.image,
        environmentId: environments.id,
        environmentName: environments.name,
        editionId: editions.id,
        editionName: editions.name,
        deploy: modelSettings.deploy,
        gpuList: modelSettings.gpuList,
        replica: modelSettings.replica,
        gpuMemoryUtilization: modelSettings.gpuMemoryUtilization,
        extraSettings: modelSettings.extraSettings,
        updatedAt: modelSettings.updatedAt,
      })
      .from(modelSettings)
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
      .orderBy(orderFn(sortColumn))
      .limit(perPage)
      .offset((page - 1) * perPage),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(modelSettings)
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

  // Get available filter options for this version
  const [availableTypes, availableEnvironments, availableEditions] =
    await Promise.all([
      db
        .selectDistinct({ type: modelComponents.type })
        .from(modelComponents)
        .where(eq(modelComponents.versionId, versionId))
        .then((rows) => rows.map((r) => r.type)),

      db
        .selectDistinct({
          id: environments.id,
          name: environments.name,
        })
        .from(environments)
        .innerJoin(
          modelSettings,
          eq(modelSettings.environmentId, environments.id)
        )
        .innerJoin(
          modelComponents,
          eq(modelSettings.modelComponentId, modelComponents.id)
        )
        .where(eq(modelComponents.versionId, versionId)),

      db
        .selectDistinct({
          id: editions.id,
          name: editions.name,
        })
        .from(editions)
        .innerJoin(
          modelSettings,
          eq(modelSettings.editionId, editions.id)
        )
        .innerJoin(
          modelComponents,
          eq(modelSettings.modelComponentId, modelComponents.id)
        )
        .where(eq(modelComponents.versionId, versionId)),
    ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data: data.map((row) => ({
      id: row.id,
      model_component: {
        id: row.modelComponentId,
        name: row.modelComponentName,
        type: row.modelComponentType,
        component_version: row.componentVersion,
        image: row.image,
      },
      environment: {
        id: row.environmentId,
        name: row.environmentName,
      },
      edition: {
        id: row.editionId,
        name: row.editionName,
      },
      deploy: row.deploy,
      gpu_list: row.gpuList ?? [],
      replica: row.replica,
      gpu_memory_utilization: row.gpuMemoryUtilization !== null
        ? parseFloat(row.gpuMemoryUtilization)
        : null,
      extra_settings: row.extraSettings ?? {},
      updated_at: row.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage) || 1,
    },
    filters: {
      available_types: availableTypes,
      available_environments: availableEnvironments,
      available_editions: availableEditions,
    },
  };
}

export async function getSettingById(settingId: string) {
  const result = await db
    .select({
      id: modelSettings.id,
      modelComponentId: modelComponents.id,
      modelComponentName: modelComponents.name,
      modelComponentType: modelComponents.type,
      componentVersion: modelComponents.componentVersion,
      image: modelComponents.image,
      environmentId: environments.id,
      environmentName: environments.name,
      editionId: editions.id,
      editionName: editions.name,
      deploy: modelSettings.deploy,
      gpuList: modelSettings.gpuList,
      replica: modelSettings.replica,
      gpuMemoryUtilization: modelSettings.gpuMemoryUtilization,
      extraSettings: modelSettings.extraSettings,
      createdAt: modelSettings.createdAt,
      updatedAt: modelSettings.updatedAt,
    })
    .from(modelSettings)
    .innerJoin(
      modelComponents,
      eq(modelSettings.modelComponentId, modelComponents.id)
    )
    .innerJoin(environments, eq(modelSettings.environmentId, environments.id))
    .innerJoin(editions, eq(modelSettings.editionId, editions.id))
    .where(eq(modelSettings.id, settingId))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    model_component: {
      id: row.modelComponentId,
      name: row.modelComponentName,
      type: row.modelComponentType,
      component_version: row.componentVersion,
      image: row.image,
    },
    environment: {
      id: row.environmentId,
      name: row.environmentName,
    },
    edition: {
      id: row.editionId,
      name: row.editionName,
    },
    deploy: row.deploy,
    gpu_list: row.gpuList ?? [],
    replica: row.replica,
    gpu_memory_utilization: row.gpuMemoryUtilization !== null
      ? parseFloat(row.gpuMemoryUtilization)
      : null,
    extra_settings: row.extraSettings ?? {},
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export interface SettingChanges {
  deploy?: boolean;
  gpu_list?: string[];
  replica?: number;
  gpu_memory_utilization?: number;
  extra_settings?: Record<string, unknown>;
}

export async function updateSetting(
  settingId: string,
  changes: SettingChanges,
  changedBy: string,
  reason?: string,
  expectedUpdatedAt?: string
): Promise<{ setting: ReturnType<typeof getSettingById> extends Promise<infer T> ? T : never; changeHistoryId: string }> {
  // 1. Get current setting (raw DB row)
  const currentRows = await db
    .select()
    .from(modelSettings)
    .where(eq(modelSettings.id, settingId))
    .limit(1);

  if (currentRows.length === 0) {
    throw new ApiError("NOT_FOUND", "Setting not found");
  }

  const current = currentRows[0];

  // 2. Optimistic lock check
  if (expectedUpdatedAt) {
    const expected = new Date(expectedUpdatedAt).getTime();
    const actual = current.updatedAt.getTime();
    if (expected !== actual) {
      throw new ApiError(
        "CONFLICT",
        "Setting has been modified by another user. Please refresh and try again."
      );
    }
  }

  // 3. Compute diff
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  if (changes.deploy !== undefined) {
    oldValues.deploy = current.deploy;
    newValues.deploy = changes.deploy;
  }
  if (changes.gpu_list !== undefined) {
    oldValues.gpu_list = current.gpuList ?? [];
    newValues.gpu_list = changes.gpu_list;
  }
  if (changes.replica !== undefined) {
    oldValues.replica = current.replica;
    newValues.replica = changes.replica;
  }
  if (changes.gpu_memory_utilization !== undefined) {
    oldValues.gpu_memory_utilization = current.gpuMemoryUtilization !== null
      ? parseFloat(current.gpuMemoryUtilization)
      : null;
    newValues.gpu_memory_utilization = changes.gpu_memory_utilization;
  }
  if (changes.extra_settings !== undefined) {
    oldValues.extra_settings = current.extraSettings ?? {};
    newValues.extra_settings = changes.extra_settings;
  }

  const diff = computeDiff(oldValues, newValues);

  if (Object.keys(diff).length === 0) {
    throw new ApiError(
      "INVALID_INPUT",
      "No changes detected - submitted values are identical to current values"
    );
  }

  // 4. Transaction: update setting + insert change history
  const now = new Date();
  const changeHistoryId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (changes.deploy !== undefined) updateData.deploy = changes.deploy;
    if (changes.gpu_list !== undefined) updateData.gpuList = changes.gpu_list;
    if (changes.replica !== undefined) updateData.replica = changes.replica;
    if (changes.gpu_memory_utilization !== undefined) {
      updateData.gpuMemoryUtilization = String(changes.gpu_memory_utilization);
    }
    if (changes.extra_settings !== undefined) updateData.extraSettings = changes.extra_settings;

    await tx
      .update(modelSettings)
      .set(updateData)
      .where(eq(modelSettings.id, settingId));

    await tx.insert(changeHistories).values({
      id: changeHistoryId,
      modelSettingId: settingId,
      changedBy,
      changeType: "UPDATE",
      diff,
      reason: reason || null,
    });
  });

  // 5. Return updated setting
  const setting = await getSettingById(settingId);
  return { setting: setting!, changeHistoryId };
}

