# 技術選型調查報告

## 調查日期
2026-04-02

## 1. Next.js 版本與路由架構

### 候選方案
| 方案 | 版本 | 狀態 | 優點 | 缺點 | 適用場景 |
|------|------|------|------|------|---------|
| App Router | Next.js 16.2.x | Stable (推薦) | RSC、nested layouts、streaming、server actions、Turbopack | 學習曲線較陡、部分生態套件尚未完全支援 | 新專案、全端應用 |
| Pages Router | Next.js 16.2.x | Maintenance mode | 穩定、生態成熟、文件豐富 | 不再新增功能、缺少 RSC 支援 | 既有專案維護 |

### 決策
選擇 **App Router (Next.js 16.2.x)**

理由：
1. Pages Router 已進入 maintenance mode，官方不再新增功能
2. App Router 自 Next.js 14 起已穩定，截至 16.2.x 已經非常成熟
3. Server Components 可減少前端 bundle size，對資料表格密集的管理介面有利
4. Server Actions 簡化 API 呼叫流程（但本專案仍保留 REST API 以利未來擴展）
5. Turbopack 提供更快的 dev server 體驗

### 實作注意事項
- 使用 `app/` 目錄結構
- API Routes 放在 `app/api/` 下
- 頁面使用 Server Components + 需要互動的部分用 Client Components (`"use client"`)
- Docker build 使用 `next build` + `next start` (standalone output)

## 2. ORM 選型

### 候選方案
| 方案 | 版本 | npm 下載/週 | Bundle Size | 優點 | 缺點 |
|------|------|------------|-------------|------|------|
| Prisma | 7.x | 6M+ | ~1.6MB (WASM) | DX 佳、schema-first、migration 工具成熟、生態豐富 | 需 generate 步驟、JSONB 查詢需額外處理 |
| Drizzle | 0.45.x | 1.5M+ | ~7.4KB | 極輕量、SQL-like API、無 generate 步驟、型別即時更新 | JSONB 原生查詢支援不完整（需 raw SQL）、生態較新 |
| TypeORM | 0.3.x | 2M+ | ~200KB | 支援 decorator pattern、Active Record / Data Mapper | 維護速度慢、TypeScript 型別支援較差、效能較差 |

### 決策
選擇 **Drizzle ORM 0.45.x**

理由：
1. **輕量**：7.4KB bundle，零依賴，適合 Docker 部署
2. **SQL 透明度**：本專案需要 PostgreSQL JSONB 的進階查詢（篩選 gpu_list、extra_settings），Drizzle 的 SQL-like API 讓複雜查詢更直觀
3. **無 generate 步驟**：schema 修改後型別即時更新，開發體驗流暢
4. **Migration 支援**：drizzle-kit 提供 `generate` + `migrate` 指令，支援自動 migration
5. **Prisma 7 雖大幅改善效能**，但對 JSONB 查詢仍需額外處理，且 generate 步驟在 CI/CD 中增加複雜度

### JSONB 查詢策略
Drizzle 的 JSONB 原生查詢支援有限，需使用 `sql` operator：
```typescript
import { sql } from 'drizzle-orm';
// 查詢 JSONB 欄位
db.select().from(modelSettings)
  .where(sql`${modelSettings.gpuList} @> '["A100"]'::jsonb`)
```
建議封裝 helper functions 統一 JSONB 查詢邏輯。

### 搭配套件
- `drizzle-orm`: 核心 ORM
- `drizzle-kit`: Migration 工具
- `postgres` (postgres.js): PostgreSQL driver（比 pg 更輕量、更快）

## 3. TypeScript AST 解析工具

### 候選方案
| 方案 | 版本 | 優點 | 缺點 | 適用場景 |
|------|------|------|------|---------|
| ts-morph | 24.x | API 友善、文件完善、支援 class/property 解析、可回退到原生 API | 依賴 TypeScript 完整編譯器（bundle 較大） | 程式碼分析與重構 |
| TypeScript Compiler API | 5.x | 零額外依賴、最底層控制 | API 繁瑣、學習曲線高、需手動處理很多細節 | 進階 tooling 開發 |
| @typescript-eslint/parser | 8.x | ESLint 整合良好 | 主要設計給 lint 用、不適合解析 class property values | 程式碼風格檢查 |

### 決策
選擇 **ts-morph 24.x**

理由：
1. cdk8s 的 TypeScript 檔案結構複雜（class 繼承、const export、nested object literals）
2. ts-morph 的 API 可以直接：
   - 遍歷 class declarations 取得 `readonly` properties
   - 解析 object literal expressions 取得 GPU 設定的 key-value
   - 解析 import statements 追蹤 model type 常數定義
3. 需要解析的檔案模式：
   - `gpu/*.ts`：解析 class 的 `settings` property（SettingMap 型別的 object literal）
   - `inferno-model-*.ts`：解析 class 的 `basename`, `MODEL_TYPE`, `MODEL_NAME`, `gpuSettingKey` 等 readonly properties
   - `*.cfg.ts`：解析 class 的 `name`, `stage`, `edition` properties
4. 可在需要時回退到底層 TypeScript Compiler API

### 解析策略（基於實際 cdk8s 結構分析）

#### GPU 設定檔 (`src/components/inferno/gpu/*.ts`)
```
結構：class extends BaseGpuSettings
  → protected readonly settings: SettingMap = { ... }
  → key 為 ModelType 常數（如 ModelTypeLLM）
  → value 為 SettingsEntry，包含具名 key + fallback
  → 每個 GpuConfig: { deploy, gpuList, replica, gpu_memory_utilization, ... }
```

#### 模型元件檔 (`src/components/inferno/inferno-model-*.ts`)
```
結構：class extends *ModelComp
  → readonly basename = 'inferno-model-whisper-general'
  → readonly MODEL_TYPE = ModelTypeASR (import 的常數)
  → readonly MODEL_NAME = 'asr-general'
  → readonly MODEL_VERSION = '1.2.0'
  → readonly gpuSettingKey = GPU_KEY_WHISPER_GENERAL
  → readonly IMAGE_TAG = '0.1.0'
```

#### 環境設定檔 (`src/cfgs/*.cfg.ts`)
```
結構：class extends Cfg
  → readonly name = 'dev'
  → readonly stage = 'dev' | 'stage' | 'prod' | 'on-prem'
  → readonly edition = 'pro' | 'std' | ...
```

### 注意事項
- 解析時需要解析 import 追蹤常數值（如 `GPU_KEY_WHISPER_GENERAL` = `'whisper-general'`）
- 需要建立 GPU_KEY 和 ModelType 的映射表
- `@common.*` 和以 `@` 開頭的檔案是共用模組，不是模型元件
- `deprecated-*` 檔案應跳過或標記 warning

## 4. UI 元件庫

### 候選方案
| 方案 | 版本 | npm 下載/週 | 優點 | 缺點 |
|------|------|------------|------|------|
| shadcn/ui | latest | N/A (copy-paste) | 完全可控、Tailwind CSS 整合、Next.js App Router 原生支援、TanStack Table 官方整合範例 | 需要自行組裝、元件數量較少 |
| Ant Design | 5.x | 2.5M+ | 元件最豐富、Table 內建完整功能、ProComponents 適合後台 | bundle 較大、設計風格較固定、與 Tailwind 整合不便 |
| MUI | 6.x | 6.7M+ | 生態最成熟、MUI X Data Grid 功能強大、文件最完善 | MUI X 進階功能需付費、客製化成本較高 |

### 決策
選擇 **shadcn/ui + TanStack Table**

理由：
1. **Next.js App Router 原生支援**：shadcn/ui 官方文件直接支援 App Router
2. **TanStack Table 官方整合**：shadcn/ui 提供完整的 [Data Table 範例](https://ui.shadcn.com/docs/components/radix/data-table)，包含排序、篩選、分頁
3. **完全可控**：元件程式碼在專案中，可針對「deploy 狀態圓點」、「GPU List tags」等特殊需求自由客製
4. **Tailwind CSS**：與 Next.js 16 的預設 CSS 方案一致
5. **輕量**：不會像 Ant Design / MUI 引入大量未使用的元件

### 缺點與應對
- shadcn/ui 元件數量較少 → 本專案 Sprint 1 只需 Table, Button, Select, Input, Badge, Card, Dropdown 等基礎元件，完全足夠
- 需要自行處理複雜表格邏輯 → TanStack Table 的 headless API 提供完整的 sorting/filtering/pagination 支援

## 5. Table 元件

### 候選方案
| 方案 | 版本 | Bundle Size | 授權 | 優點 | 缺點 |
|------|------|------------|------|------|------|
| TanStack Table | 8.x | ~10-20KB | MIT | headless、完全可控、免費、與 shadcn/ui 整合佳 | 需自行實作 UI |
| AG Grid Community | 32.x | ~200KB+ | MIT | 功能強大、內建所有表格功能、10萬+行效能佳 | Enterprise 功能需付費、bundle 大、客製化困難 |

### 決策
選擇 **TanStack Table v8**

理由：
1. 本專案資料量預估 ~50-500 筆 model settings（54 models x 6 editions），不需要虛擬化
2. TanStack Table 的 sorting + filtering + pagination 完全滿足需求
3. 與 shadcn/ui 有官方整合範例，開發效率高
4. 免費、MIT 授權、bundle 輕量
5. AG Grid 的強大功能（10萬+行、tree data、pivot table）在此專案中不需要

## 6. Diff 顯示元件

### 候選方案
| 方案 | 用途 | 優點 | 缺點 |
|------|------|------|------|
| react-diff-viewer-continued | 文字/JSON diff | 支援 side-by-side / inline、syntax highlight、JSON 最佳化 | 主要為文字 diff |
| json-diff-kit | JSON 專用 diff | TypeScript 撰寫、LCS diff for arrays、區分 modification vs add/remove | React 專用 viewer |

### 決策
選擇 **json-diff-kit**

理由：
1. 本專案的 diff 需求主要是 JSON 格式的設定比較（ModelSetting 的 JSONB 欄位變更）
2. json-diff-kit 專為 JSON 設計，能區分 modification（值改變）和 add/remove（欄位增減）
3. 支援 array 的 LCS diff（對 gpu_list 比較有利）
4. Sprint 2 的 F-006「設定版本比較」需要此功能，Sprint 1 先安裝但不使用

## 7. 其他 Library

| 用途 | 選擇 | 版本 | 替代方案 | 選擇理由 |
|------|------|------|---------|---------|
| PostgreSQL Driver | postgres (postgres.js) | 3.x | pg, @neondatabase/serverless | 最快的 Node.js PG driver、Drizzle 官方推薦 |
| Schema Validation | zod | 3.x | joi, yup | TypeScript-first、Next.js 生態標準、Server Actions 整合 |
| HTTP Client (GitLab API) | ky | 1.x | axios, node-fetch | 輕量、支援 retry、TypeScript friendly |
| Date 處理 | date-fns | 4.x | dayjs, luxon | tree-shakeable、輕量、無 mutable state |
| CSS | Tailwind CSS | 4.x | CSS Modules, styled-components | Next.js 16 預設方案、與 shadcn/ui 搭配 |
| Icon | lucide-react | latest | react-icons, heroicons | shadcn/ui 預設 icon 庫 |
| Migration | drizzle-kit | latest | prisma migrate, knex migrate | 與 Drizzle ORM 配套 |

## 8. 開發工具

| 用途 | 選擇 | 理由 |
|------|------|------|
| Linting | ESLint + @typescript-eslint | Next.js 內建 |
| Formatting | Prettier | 業界標準 |
| Testing (Unit) | Vitest | 比 Jest 更快、原生 ESM 支援、與 TypeScript 整合佳 |
| Testing (E2E) | Playwright | 跨瀏覽器支援、Next.js 官方推薦 |
| Container | Docker + Docker Compose | 專案需求 |

## 9. 參考資料

- [Next.js App Router 2026 完整指南](https://dev.to/ottoaria/nextjs-app-router-in-2026-the-complete-guide-for-full-stack-developers-5bjl)
- [Next.js App Router vs Pages Router 比較](https://kitemetric.com/blogs/next-js-routing-in-2025-app-router-vs-pages-router)
- [Drizzle vs Prisma 2026 深入比較](https://medium.com/@codabu/drizzle-vs-prisma-choosing-the-right-typescript-orm-in-2026-deep-dive-63abb6aa882b)
- [Drizzle vs Prisma 實用比較](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- [Bytebase: Drizzle ORM vs Prisma 2026](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [Drizzle ORM PostgreSQL JSONB 欄位文件](https://orm.drizzle.team/docs/column-types/pg)
- [ts-morph 官方文件](https://ts-morph.com/)
- [ts-morph GitHub](https://github.com/dsherret/ts-morph)
- [TypeScript Compiler API Wiki](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [shadcn/ui vs MUI vs Ant Design 2026 比較](https://adminlte.io/blog/shadcn-ui-vs-mui-vs-ant-design/)
- [shadcn/ui Data Table + TanStack Table 整合](https://ui.shadcn.com/docs/components/radix/data-table)
- [TanStack Table vs AG Grid 完整比較](https://www.simple-table.com/blog/tanstack-table-vs-ag-grid-comparison)
- [AG Grid 與 TanStack Table 開源合作](https://www.developer-tech.com/news/ag-grid-and-tanstack-table-join-forces-open-source-partners/)
- [json-diff-kit GitHub](https://github.com/RexSkz/json-diff-kit)
- [react-diff-viewer-continued npm](https://www.npmjs.com/package/react-diff-viewer-continued)
