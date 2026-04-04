import { db } from "@/db";
import {
  modelSettings,
  modelComponents,
  environments,
  editions,
  versions,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { isEqual } from "@/lib/diff";
import { ApiError } from "@/lib/api-error";

export interface CompareParams {
  versionAId: string;
  versionBId: string;
  environmentId?: string;
  editionId?: string;
}

interface SettingRecord {
  settingId: string;
  modelComponentName: string;
  modelComponentType: string;
  environmentName: string;
  editionName: string;
  deploy: boolean;
  gpuList: string[];
  replica: number;
  gpuMemoryUtilization: number | null;
  extraSettings: Record<string, unknown>;
}

interface ChangeDiff {
  [field: string]: { version_a: unknown; version_b: unknown };
}

interface ChangeEntry {
  model_component_name: string;
  model_type: string;
  environment: string;
  edition: string;
  change_type: "added" | "removed" | "modified";
  diff: ChangeDiff;
}

function buildMatchingKey(r: SettingRecord): string {
  return `${r.modelComponentName}|${r.environmentName}|${r.editionName}`;
}

const COMPARE_FIELDS = [
  "deploy",
  "gpu_list",
  "replica",
  "gpu_memory_utilization",
  "extra_settings",
] as const;

function getFieldValue(record: SettingRecord, field: string): unknown {
  switch (field) {
    case "deploy":
      return record.deploy;
    case "gpu_list":
      return record.gpuList;
    case "replica":
      return record.replica;
    case "gpu_memory_utilization":
      return record.gpuMemoryUtilization;
    case "extra_settings":
      return record.extraSettings;
    default:
      return undefined;
  }
}

async function getSettingsForVersion(
  versionId: string,
  environmentId?: string,
  editionId?: string
): Promise<SettingRecord[]> {
  const conditions = [eq(modelComponents.versionId, versionId)];
  if (environmentId) {
    conditions.push(eq(modelSettings.environmentId, environmentId));
  }
  if (editionId) {
    conditions.push(eq(modelSettings.editionId, editionId));
  }

  const rows = await db
    .select({
      settingId: modelSettings.id,
      modelComponentName: modelComponents.name,
      modelComponentType: modelComponents.type,
      environmentName: environments.name,
      editionName: editions.name,
      deploy: modelSettings.deploy,
      gpuList: modelSettings.gpuList,
      replica: modelSettings.replica,
      gpuMemoryUtilization: modelSettings.gpuMemoryUtilization,
      extraSettings: modelSettings.extraSettings,
    })
    .from(modelSettings)
    .innerJoin(
      modelComponents,
      eq(modelSettings.modelComponentId, modelComponents.id)
    )
    .innerJoin(environments, eq(modelSettings.environmentId, environments.id))
    .innerJoin(editions, eq(modelSettings.editionId, editions.id))
    .where(and(...conditions));

  return rows.map((r) => ({
    settingId: r.settingId,
    modelComponentName: r.modelComponentName,
    modelComponentType: r.modelComponentType,
    environmentName: r.environmentName,
    editionName: r.editionName,
    deploy: r.deploy,
    gpuList: (r.gpuList as string[]) ?? [],
    replica: r.replica,
    gpuMemoryUtilization: r.gpuMemoryUtilization !== null
      ? parseFloat(r.gpuMemoryUtilization)
      : null,
    extraSettings: (r.extraSettings as Record<string, unknown>) ?? {},
  }));
}

export async function compareVersions(params: CompareParams) {
  const { versionAId, versionBId, environmentId, editionId } = params;

  // 1. Validate versions exist
  const [versionA, versionB] = await Promise.all([
    db.select().from(versions).where(eq(versions.id, versionAId)).limit(1),
    db.select().from(versions).where(eq(versions.id, versionBId)).limit(1),
  ]);

  if (versionA.length === 0) {
    throw new ApiError("NOT_FOUND", `Version A not found: ${versionAId}`);
  }
  if (versionB.length === 0) {
    throw new ApiError("NOT_FOUND", `Version B not found: ${versionBId}`);
  }

  // 2. Get settings for both versions
  const [settingsA, settingsB] = await Promise.all([
    getSettingsForVersion(versionAId, environmentId, editionId),
    getSettingsForVersion(versionBId, environmentId, editionId),
  ]);

  // 3. Build maps by matching key
  const mapA = new Map<string, SettingRecord>();
  for (const s of settingsA) {
    mapA.set(buildMatchingKey(s), s);
  }
  const mapB = new Map<string, SettingRecord>();
  for (const s of settingsB) {
    mapB.set(buildMatchingKey(s), s);
  }

  // 4. Compare
  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  const changes: ChangeEntry[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  for (const key of allKeys) {
    const a = mapA.get(key);
    const b = mapB.get(key);

    if (a && !b) {
      // Removed in version B
      removed++;
      const diff: ChangeDiff = {};
      for (const field of COMPARE_FIELDS) {
        const val = getFieldValue(a, field);
        if (val !== null && val !== undefined) {
          diff[field] = { version_a: val, version_b: null };
        }
      }
      changes.push({
        model_component_name: a.modelComponentName,
        model_type: a.modelComponentType,
        environment: a.environmentName,
        edition: a.editionName,
        change_type: "removed",
        diff,
      });
    } else if (!a && b) {
      // Added in version B
      added++;
      const diff: ChangeDiff = {};
      for (const field of COMPARE_FIELDS) {
        const val = getFieldValue(b, field);
        if (val !== null && val !== undefined) {
          diff[field] = { version_a: null, version_b: val };
        }
      }
      changes.push({
        model_component_name: b.modelComponentName,
        model_type: b.modelComponentType,
        environment: b.environmentName,
        edition: b.editionName,
        change_type: "added",
        diff,
      });
    } else if (a && b) {
      // Both exist - check for modifications
      const diff: ChangeDiff = {};
      for (const field of COMPARE_FIELDS) {
        const valA = getFieldValue(a, field);
        const valB = getFieldValue(b, field);
        if (!isEqual(valA, valB)) {
          diff[field] = { version_a: valA, version_b: valB };
        }
      }
      if (Object.keys(diff).length > 0) {
        modified++;
        changes.push({
          model_component_name: a.modelComponentName,
          model_type: a.modelComponentType,
          environment: a.environmentName,
          edition: a.editionName,
          change_type: "modified",
          diff,
        });
      } else {
        unchanged++;
      }
    }
  }

  return {
    version_a: { id: versionA[0].id, name: versionA[0].name },
    version_b: { id: versionB[0].id, name: versionB[0].name },
    summary: { added, removed, modified, unchanged },
    changes,
  };
}

