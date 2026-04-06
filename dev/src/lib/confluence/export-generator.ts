/**
 * Confluence 匯出生成器
 *
 * 從 DB 查詢指定版本設定，產生 Confluence Storage Format HTML table。
 */

import { db } from "@/db";
import { modelComponents, modelSettings } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { ExportComponent } from "./types";
import { MODEL_TYPE_TO_COMPONENT } from "./types";

interface ExportOptions {
  versionId: string;
  environmentIds?: string[];
  editionIds?: string[];
}

/**
 * 查詢 DB 並產出可匯出的 component 清單
 */
export async function getExportComponents(options: ExportOptions): Promise<ExportComponent[]> {
  const { versionId, environmentIds, editionIds } = options;

  // 查詢該版本的所有 model components
  const components = await db
    .select()
    .from(modelComponents)
    .where(eq(modelComponents.versionId, versionId));

  if (components.length === 0) return [];

  const componentIds = components.map((c) => c.id);

  // 查詢 settings，套用篩選
  const settingsQuery = db
    .select({
      modelComponentId: modelSettings.modelComponentId,
      environmentId: modelSettings.environmentId,
      editionId: modelSettings.editionId,
      deploy: modelSettings.deploy,
      gpuList: modelSettings.gpuList,
      replica: modelSettings.replica,
      gpuMemoryUtilization: modelSettings.gpuMemoryUtilization,
      extraSettings: modelSettings.extraSettings,
    })
    .from(modelSettings)
    .where(
      and(
        inArray(modelSettings.modelComponentId, componentIds),
        ...(environmentIds && environmentIds.length > 0
          ? [inArray(modelSettings.environmentId, environmentIds)]
          : []),
        ...(editionIds && editionIds.length > 0
          ? [inArray(modelSettings.editionId, editionIds)]
          : [])
      )
    );

  const settings = await settingsQuery;

  // 組合 component + 第一筆 setting
  const result: ExportComponent[] = [];
  for (const comp of components) {
    const setting = settings.find((s) => s.modelComponentId === comp.id);

    result.push({
      type: comp.type,
      name: comp.name,
      componentVersion: comp.componentVersion,
      image: comp.image,
      deploy: setting?.deploy ?? false,
      gpuList: (setting?.gpuList as string[]) ?? [],
      replica: setting?.replica ?? 1,
      gpuMemoryUtilization: setting?.gpuMemoryUtilization ?? null,
      extraSettings: (setting?.extraSettings as Record<string, unknown>) ?? {},
    });
  }

  // 按 model type 分組，組內按 name 排序
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });

  return result;
}

/**
 * 產生 Confluence Storage Format HTML table
 */
export function generateConfluenceHtml(components: ExportComponent[]): string {
  const headers = ["Component", "ID", "Model", "Images", "Settings", "Resource"];
  const headerRow = headers.map((h) => `<th><p>${escapeHtml(h)}</p></th>`).join("");

  const dataRows = components
    .map((comp) => {
      const confluenceComponent = MODEL_TYPE_TO_COMPONENT[comp.type] ?? comp.type;
      const id = comp.componentVersion
        ? `${comp.name}-${comp.componentVersion}`
        : comp.name;
      const settingsStr = formatSettings(comp);
      const resourceStr = formatResource(comp);

      return `    <tr>
      <td><p>${escapeHtml(confluenceComponent)}</p></td>
      <td><p>${escapeHtml(id)}</p></td>
      <td><p>${escapeHtml(comp.name)}</p></td>
      <td><p>${escapeHtml(comp.image ?? "")}</p></td>
      <td><p>${escapeHtml(settingsStr)}</p></td>
      <td><p>${escapeHtml(resourceStr)}</p></td>
    </tr>`;
    })
    .join("\n");

  return `<table>
  <colgroup><col /><col /><col /><col /><col /><col /></colgroup>
  <tbody>
    <tr>${headerRow}</tr>
${dataRows}
  </tbody>
</table>`;
}

/**
 * 格式化 Settings 欄位
 */
function formatSettings(comp: ExportComponent): string {
  const parts: string[] = [];

  if (comp.deploy) parts.push("deploy: true");
  else parts.push("deploy: false");

  if (comp.extraSettings && Object.keys(comp.extraSettings).length > 0) {
    for (const [key, value] of Object.entries(comp.extraSettings)) {
      if (value !== undefined && value !== null) {
        parts.push(`${key}: ${String(value)}`);
      }
    }
  }

  return parts.join(", ");
}

/**
 * 格式化 Resource 欄位
 */
function formatResource(comp: ExportComponent): string {
  const parts: string[] = [];

  if (comp.gpuList && comp.gpuList.length > 0) {
    parts.push(`GPU: ${comp.gpuList.join(", ")}`);
  }

  if (comp.replica > 1) {
    parts.push(`replica: ${comp.replica}`);
  }

  if (comp.gpuMemoryUtilization) {
    parts.push(`mem: ${comp.gpuMemoryUtilization}`);
  }

  return parts.join(", ") || "-";
}

/**
 * HTML 轉義
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
