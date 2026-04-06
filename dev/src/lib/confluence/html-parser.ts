/**
 * Confluence HTML / Storage Format 解析器
 *
 * 解析 Confluence XHTML 表格，提取 model 設定資料。
 */

import type { ParsedRow, ParsedVersionTable, ParseResult } from "./types";
import { mapRowsToComponents } from "./table-mapper";

/**
 * 從 Confluence Storage Format HTML 解析表格。
 *
 * 支援格式：
 * - 標準 <table> 內含 <th> 表頭和 <td> 資料列
 * - 版本標題以 <h1>~<h3> 或特定文字（如 "3.0", "3.1"）出現
 */
export function parseConfluenceHtml(html: string): ParseResult {
  const warnings: string[] = [];
  const tables: ParsedVersionTable[] = [];

  // 移除 Confluence macro 標籤
  const cleaned = html.replace(/<ac:[^>]*>[\s\S]*?<\/ac:[^>]*>/g, "");

  // 以簡易方式解析 — 找出所有 <table> 區塊
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tableMatches = cleaned.match(tableRegex);

  if (!tableMatches || tableMatches.length === 0) {
    warnings.push("未找到任何 HTML 表格");
    return { tables: [], components: [], warnings };
  }

  // 嘗試找出每張表格前的版本標題
  let searchPos = 0;
  let tableIndex = 0;

  for (const tableHtml of tableMatches) {
    const tablePos = cleaned.indexOf(tableHtml, searchPos);
    const precedingText = cleaned.slice(searchPos, tablePos);
    searchPos = tablePos + tableHtml.length;

    // 從前文找版本號
    const versionLabel = extractVersionLabel(precedingText) || `table-${tableIndex + 1}`;

    // 解析表格列
    const rows = parseHtmlTable(tableHtml, warnings, tableIndex);
    if (rows.length > 0) {
      tables.push({ versionLabel, rows });
    }

    tableIndex++;
  }

  // 映射為 components
  const components = mapRowsToComponents(tables, warnings);

  return { tables, components, warnings };
}

/**
 * 從文字中提取版本號 (e.g. "3.0", "3.1.2")
 */
function extractVersionLabel(text: string): string | null {
  // 找 heading 中的版本號
  const headingMatch = text.match(/<h[1-3][^>]*>[\s\S]*?(\d+\.\d+(?:\.\d+)?)[\s\S]*?<\/h[1-3]>/i);
  if (headingMatch) return headingMatch[1];

  // 找單獨的版本號文字
  const versionMatch = text.match(/(?:^|\s)(\d+\.\d+(?:\.\d+)?)(?:\s|$)/m);
  if (versionMatch) return versionMatch[1];

  return null;
}

/**
 * 解析單一 HTML 表格
 */
function parseHtmlTable(tableHtml: string, warnings: string[], tableIndex: number): ParsedRow[] {
  const rows: ParsedRow[] = [];

  // 提取所有 <tr>
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  const trMatches = tableHtml.match(trRegex);
  if (!trMatches) return rows;

  // 第一個含 <th> 的列視為表頭
  let headerRow: string[] | null = null;
  let headerIndex = -1;

  for (let i = 0; i < trMatches.length; i++) {
    const tr = trMatches[i];
    if (/<th[\s>]/i.test(tr)) {
      headerRow = extractCells(tr, "th");
      headerIndex = i;
      break;
    }
  }

  if (!headerRow) {
    // 沒有 <th>，用第一列當表頭
    headerRow = extractCells(trMatches[0], "td");
    headerIndex = 0;
  }

  // 建立欄位索引映射
  const colMap = buildColumnMap(headerRow);
  if (!colMap) {
    warnings.push(`表格 ${tableIndex + 1}: 無法辨識表頭欄位 (${headerRow.join(", ")})`);
    return rows;
  }

  // 解析資料列
  for (let i = headerIndex + 1; i < trMatches.length; i++) {
    const cells = extractCells(trMatches[i], "td");
    if (cells.length === 0) continue;

    const row: ParsedRow = {
      component: cells[colMap.component] ?? "",
      id: cells[colMap.id] ?? "",
      model: cells[colMap.model] ?? "",
      image: cells[colMap.images] ?? "",
      settings: cells[colMap.settings] ?? "",
      resource: cells[colMap.resource] ?? "",
    };

    // 跳過空列
    if (!row.component.trim() && !row.id.trim() && !row.model.trim()) continue;

    rows.push(row);
  }

  return rows;
}

/**
 * 從 <tr> 中提取 cell 文字內容
 */
function extractCells(trHtml: string, tag: "th" | "td"): string[] {
  const regex = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi");
  const matches = trHtml.match(regex);
  if (!matches) return [];

  return matches.map((cell) => {
    // 移除所有 HTML tag，保留文字
    return cell
      .replace(/<[^>]+>/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  });
}

/**
 * 從表頭建立欄位索引映射
 */
function buildColumnMap(
  headers: string[]
): { component: number; id: number; model: number; images: number; settings: number; resource: number } | null {
  const normalized = headers.map((h) => h.toLowerCase().trim());

  const find = (keywords: string[]): number => {
    return normalized.findIndex((h) => keywords.some((k) => h.includes(k)));
  };

  const component = find(["component"]);
  const id = find(["id"]);
  const model = find(["model"]);
  const images = find(["image"]);
  const settings = find(["setting"]);
  const resource = find(["resource"]);

  // 至少需要 component 和 id
  if (component === -1 || id === -1) return null;

  return {
    component,
    id,
    model: model !== -1 ? model : id,
    images: images !== -1 ? images : -1,
    settings: settings !== -1 ? settings : -1,
    resource: resource !== -1 ? resource : -1,
  };
}
