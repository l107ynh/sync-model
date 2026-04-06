/**
 * PDF 表格解析器
 *
 * 使用 pdf.js-extract 提取文字座標，重建 Confluence 表格結構。
 *
 * 演算法：
 * 1. 提取所有文字元素（含 x/y 座標）
 * 2. 偵測版本標題（regex: /^\d+\.\d+$/）分區
 * 3. 偵測表頭 "Component" 的 y 座標
 * 4. 按 y 座標分組為列（同一 y 範圍 ±tolerance = 同一列）
 * 5. 按 x 座標對應到 6 個欄位
 * 6. 合併同一 cell 的多行文字
 */

import type { ParsedRow, ParsedVersionTable, ParseResult } from "./types";
import { mapRowsToComponents } from "./table-mapper";

interface TextElement {
  x: number;
  y: number;
  width: number;
  height: number;
  str: string;
  fontName?: string;
  page: number;
}

/** Y 座標容差（pixels），同列判定 */
const Y_TOLERANCE = 4;

/** 表頭關鍵字 */
const HEADER_KEYWORDS = ["component", "id", "model", "images", "settings", "resource"];

/**
 * 解析 PDF Buffer，提取表格資料
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<ParseResult> {
  const warnings: string[] = [];

  // 動態 import pdf.js-extract
  let PDFExtract: typeof import("pdf.js-extract").PDFExtract;
  try {
    const mod = await import("pdf.js-extract");
    PDFExtract = mod.PDFExtract;
  } catch {
    throw new Error("pdf.js-extract 未安裝，請執行 npm install pdf.js-extract");
  }

  const pdfExtract = new PDFExtract();
  const data = await pdfExtract.extractBuffer(buffer);

  // 收集所有頁面的文字元素
  const allElements: TextElement[] = [];
  for (let pageIdx = 0; pageIdx < data.pages.length; pageIdx++) {
    const page = data.pages[pageIdx];
    for (const item of page.content) {
      if (item.str && item.str.trim()) {
        allElements.push({
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          str: item.str,
          fontName: item.fontName,
          page: pageIdx,
        });
      }
    }
  }

  if (allElements.length === 0) {
    warnings.push("PDF 中未找到任何文字");
    return { tables: [], components: [], warnings };
  }

  // 分區：找出版本標題和表格區域
  const sections = splitIntoSections(allElements);

  if (sections.length === 0) {
    // 如果沒找到版本標題，嘗試整體當作一張表
    const rows = extractTableFromElements(allElements, warnings, "unknown");
    const table: ParsedVersionTable = { versionLabel: "unknown", rows };
    const tables = rows.length > 0 ? [table] : [];
    const components = mapRowsToComponents(tables, warnings);

    if (tables.length === 0) {
      warnings.push("未找到有效的表格結構");
    }

    return { tables, components, warnings };
  }

  // 解析每個版本區段
  const tables: ParsedVersionTable[] = [];
  for (const section of sections) {
    const rows = extractTableFromElements(section.elements, warnings, section.version);
    if (rows.length > 0) {
      tables.push({ versionLabel: section.version, rows });
    }
  }

  if (tables.length === 0) {
    warnings.push("未找到有效的 model 設定資料");
  }

  const components = mapRowsToComponents(tables, warnings);
  return { tables, components, warnings };
}

interface Section {
  version: string;
  elements: TextElement[];
}

/**
 * 根據版本標題將文字元素分區
 */
function splitIntoSections(elements: TextElement[]): Section[] {
  const sections: Section[] = [];

  // 按 page, y, x 排序
  const sorted = [...elements].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (Math.abs(a.y - b.y) > Y_TOLERANCE) return a.y - b.y;
    return a.x - b.x;
  });

  // 找出版本標題元素
  const versionPattern = /^\d+\.\d+(?:\.\d+)?$/;
  const versionElements: Array<{ index: number; version: string; page: number; y: number }> = [];

  for (let i = 0; i < sorted.length; i++) {
    const text = sorted[i].str.trim();
    if (versionPattern.test(text)) {
      versionElements.push({
        index: i,
        version: text,
        page: sorted[i].page,
        y: sorted[i].y,
      });
    }
  }

  if (versionElements.length === 0) return [];

  // 將元素分配到各版本區段
  for (let v = 0; v < versionElements.length; v++) {
    const start = versionElements[v];
    const nextStart = v + 1 < versionElements.length ? versionElements[v + 1] : null;

    const sectionElements = sorted.filter((el) => {
      // 在當前版本之後（同頁同 y 以下，或後面的頁）
      const afterStart =
        el.page > start.page ||
        (el.page === start.page && el.y >= start.y);

      // 在下一版本之前
      const beforeEnd = nextStart
        ? el.page < nextStart.page ||
          (el.page === nextStart.page && el.y < nextStart.y)
        : true;

      return afterStart && beforeEnd;
    });

    sections.push({ version: start.version, elements: sectionElements });
  }

  return sections;
}

/**
 * 從一組文字元素中提取表格
 */
function extractTableFromElements(
  elements: TextElement[],
  warnings: string[],
  versionLabel: string
): ParsedRow[] {
  if (elements.length === 0) return [];

  // 按 y 分組為列
  const rowGroups = groupByY(elements);

  // 找出表頭列
  const headerGroupIdx = findHeaderRow(rowGroups);
  if (headerGroupIdx === -1) {
    return [];
  }

  const headerGroup = rowGroups[headerGroupIdx];

  // 確定欄位 x 範圍
  const columnBoundaries = determineColumnBoundaries(headerGroup);
  if (columnBoundaries.length < 2) {
    warnings.push(`${versionLabel}: 表頭欄位不足`);
    return [];
  }

  // 建立欄位索引
  const colMap = mapColumnsToFields(headerGroup, columnBoundaries);

  // 解析資料列
  const rows: ParsedRow[] = [];
  for (let i = headerGroupIdx + 1; i < rowGroups.length; i++) {
    const group = rowGroups[i];
    const cellTexts = assignToCells(group, columnBoundaries);

    const row: ParsedRow = {
      component: cellTexts[colMap.component] ?? "",
      id: cellTexts[colMap.id] ?? "",
      model: cellTexts[colMap.model] ?? "",
      image: cellTexts[colMap.images] ?? "",
      settings: cellTexts[colMap.settings] ?? "",
      resource: cellTexts[colMap.resource] ?? "",
    };

    // 跳過空列或版本標題列
    if (!row.component.trim() && !row.id.trim()) continue;
    if (/^\d+\.\d+(?:\.\d+)?$/.test(row.component.trim())) continue;

    rows.push(row);
  }

  return rows;
}

/**
 * 按 y 座標分組
 */
function groupByY(elements: TextElement[]): TextElement[][] {
  const sorted = [...elements].sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: TextElement[][] = [];
  let currentGroup: TextElement[] = [];
  let currentY = -Infinity;

  for (const el of sorted) {
    if (Math.abs(el.y - currentY) > Y_TOLERANCE) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [el];
      currentY = el.y;
    } else {
      currentGroup.push(el);
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups;
}

/**
 * 找出表頭列 index
 */
function findHeaderRow(groups: TextElement[][]): number {
  for (let i = 0; i < groups.length; i++) {
    const text = groups[i].map((e) => e.str.toLowerCase().trim()).join(" ");
    const matchCount = HEADER_KEYWORDS.filter((kw) => text.includes(kw)).length;
    if (matchCount >= 2) return i;
  }
  return -1;
}

/**
 * 從表頭列元素確定欄位邊界 (x 座標)
 */
function determineColumnBoundaries(headerElements: TextElement[]): number[] {
  const sorted = [...headerElements].sort((a, b) => a.x - b.x);
  return sorted.map((el) => el.x);
}

/**
 * 建立欄位名稱到索引的映射
 */
function mapColumnsToFields(
  headerElements: TextElement[],
  boundaries: number[]
): { component: number; id: number; model: number; images: number; settings: number; resource: number } {
  const sorted = [...headerElements].sort((a, b) => a.x - b.x);
  const result = { component: 0, id: 1, model: 2, images: 3, settings: 4, resource: 5 };

  for (let i = 0; i < sorted.length; i++) {
    const text = sorted[i].str.toLowerCase().trim();
    if (text.includes("component")) result.component = i;
    else if (text === "id") result.id = i;
    else if (text.includes("model")) result.model = i;
    else if (text.includes("image")) result.images = i;
    else if (text.includes("setting")) result.settings = i;
    else if (text.includes("resource")) result.resource = i;
  }

  return result;
}

/**
 * 將一列中的文字元素分配到各欄
 */
function assignToCells(elements: TextElement[], boundaries: number[]): string[] {
  const cells: string[][] = Array.from({ length: boundaries.length }, () => []);

  for (const el of elements) {
    // 找出最近的欄位邊界
    let colIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < boundaries.length; i++) {
      const dist = Math.abs(el.x - boundaries[i]);
      if (dist < minDist) {
        minDist = dist;
        colIdx = i;
      }
    }

    cells[colIdx].push(el.str);
  }

  return cells.map((texts) => texts.join(" ").trim());
}
