/**
 * Confluence 整合模組入口
 */

// API Client
export {
  getPage,
  getPageByTitle,
  searchPages,
  updatePage,
  createPage,
} from "./client";

// Parsers
export { parseConfluenceHtml } from "./html-parser";
export { parsePdfBuffer } from "./pdf-parser";
export { mapRowsToComponents } from "./table-mapper";

// Export Generator
export { getExportComponents, generateConfluenceHtml } from "./export-generator";

// Types
export type {
  ParsedRow,
  ParsedComponent,
  ParsedResource,
  ParsedVersionTable,
  ParseResult,
  ImportSummary,
  ImportParsedItem,
  ExportComponent,
} from "./types";
export { COMPONENT_TO_MODEL_TYPE, MODEL_TYPE_TO_COMPONENT } from "./types";
