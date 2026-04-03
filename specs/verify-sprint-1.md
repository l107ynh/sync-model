# Sprint 1 驗證報告

## 總結
- **Completeness**: 7/10
- **Correctness**: 6/10
- **Coherence**: 8/10
- **Overall**: WARNING

---

## Completeness 詳細

### F-001: 專案初始化與基礎架構

| Scenario | Spec | 實作 | Test | 狀態 |
|----------|------|------|------|------|
| 健康檢查成功 | GET /api/v1/health 回傳 200, status=ok, database=connected | `dev/src/app/api/v1/health/route.ts` 完整實作 | `test/e2e/health.test.ts` TC-001 | ✅ |
| Docker Compose 啟動成功 | app:3000 + db:5432 | `dev/docker-compose.yml` 完整 | 無自動化測試（需手動 docker compose up） | ⚠️ |
| 資料庫未連線時健康檢查失敗 | 回傳 503, status=error | `route.ts` catch block 回傳 503 | 無對應 E2E test（需模擬 DB 斷線） | ⚠️ |
| 不存在的 API path | 回傳 404, code=NOT_FOUND | 依賴 Next.js 預設 404 行為 | `test/e2e/health.test.ts` TC-004 測試 /nonexistent | ⚠️ |
| 重複執行 migration | migration 不會重複建立 | 使用 Drizzle ORM schema push（無顯式 migration 檔案） | 無對應 test | ⚠️ |
| 統一 Error Response 格式 | `{ code, message, details }` | `dev/src/lib/api-error.ts` 定義 ErrorCodes + ApiError class；`dev/src/lib/api.ts` 的 `errorResponse()` 使用 `{ code, message, details }` 格式 | `test/e2e/health.test.ts` 驗證 code + message | ✅ |
| 所有 DB tables migration | versions, environments, editions, model_components, model_settings, change_histories, merge_requests | 7 張 table schema 全部定義於 `dev/src/db/schema/` | 無顯式 migration 檔案測試 | ✅ |
| UUID v4 primary key | 所有 entity 使用 UUID | 所有 schema 使用 `uuid("id").defaultRandom().primaryKey()` | 隱含在其他測試中 | ✅ |
| ISO 8601 timestamps | 所有 timestamp 使用 ISO 8601 UTC | `toISOString()` 用於所有 API response | `test/e2e/health.test.ts` 驗證 timestamp 格式 | ✅ |

### F-002: cdk8s 設定檔解析與匯入

| Scenario | Spec | 實作 | Test | 狀態 |
|----------|------|------|------|------|
| 成功匯入 cdk8s 設定 | POST /api/v1/import/cdk8s 回傳 200 + summary | `dev/src/app/api/v1/import/cdk8s/route.ts` 完整實作 | `test/e2e/import.test.ts` TC-006 | ✅ |
| Dry run 預覽 | dry_run=true 只解析不寫入 | 實作完整，回傳 status=dry_run | `test/e2e/import.test.ts` TC-007 | ✅ |
| 指定特定 branch 匯入 | branch 參數 | **未實作**：API 接受 `repoPath` 而非 `branch`，是本地解析而非 GitLab API | `test/e2e/import.test.ts` TC-008 但用 branch 參數 | ❌ |
| version_name 已存在 | 回傳 409 DUPLICATE | 實作於 route.ts L63-74 | `test/e2e/import.test.ts` TC-009 | ⚠️ |
| GitLab 無法連線 | 回傳 502 GITLAB_ERROR | **未實作**：目前是本地 repo 解析，不透過 GitLab API | 無對應 test | ❌ |
| version_name 為空 | 回傳 400 INVALID_INPUT | Zod 驗證實作 | `test/e2e/import.test.ts` TC-010, TC-011 | ⚠️ |
| 部分設定檔解析失敗 | warnings 記錄，其他正常匯入 | parser 各處 catch 推入 warnings | `test/e2e/import.test.ts` TC-013 | ✅ |
| Environment/Edition 已存在時重用 | 重用既有記錄 | `writeToDatabase()` 先查詢後 insert/reuse | 無直接 test | ⚠️ |
| GPU 設定檔缺少欄位 | 使用預設值 null + warnings | `gpu-parser.ts` 對缺少欄位回傳預設值 | 無直接 test | ⚠️ |
| Import status API | GET /api/v1/import/cdk8s/status/:importId | **未實作** | 無對應 test | ❌ |
| Summary 包含 environments 清單 | summary.environments 列出環境名稱 | `buildSummary()` 設定 `environmentsCount: 0`，**缺少 environments 陣列** | test 期望 `environments` 欄位 | ❌ |

### F-003: Model 設定表格檢視

| Scenario | Spec | 實作 | Test | 狀態 |
|----------|------|------|------|------|
| 檢視版本清單 | GET /api/v1/versions 回傳 data + pagination | `dev/src/app/api/v1/versions/route.ts` 完整實作 | `test/e2e/versions.test.ts` TC-016 | ✅ |
| 版本清單按 created_at 倒序 | 最新在最前 | `queryVersions` 使用 `desc(versions.createdAt)` | `test/e2e/versions.test.ts` 驗證倒序 | ✅ |
| 檢視特定版本所有設定 | GET /api/v1/settings?version_id={id} | 完整實作，包含 join 4 張表 | `test/e2e/settings.test.ts` | ✅ |
| 依環境篩選設定 | environment_id 參數 | 實作於 `querySettings` | `test/e2e/settings.test.ts` | ✅ |
| 依模型類型篩選 | model_type 參數 | 實作於 `querySettings` | `test/e2e/settings.test.ts` | ✅ |
| 只顯示已部署 model | deploy_only=true | 實作於 `querySettings` | `test/e2e/settings.test.ts` | ✅ |
| 搜尋 model 名稱 | search 參數，大小寫不敏感 | 使用 `ilike` 實作 | `test/e2e/settings.test.ts` | ✅ |
| 缺少 version_id | 回傳 400 INVALID_INPUT | 明確檢查 + Zod 驗證 | `test/e2e/settings.test.ts` TC-028 | ✅ |
| version_id 不存在 | 回傳 404 NOT_FOUND | 查詢 version 後檢查 | `test/e2e/settings.test.ts` TC-029 | ✅ |
| 版本無任何設定 | 回傳空 data, total=0 | 隱含在 query 邏輯中 | 無直接 test（用 NONEXISTENT_TYPE 間接測試） | ⚠️ |
| 多條件篩選無結果 | 回傳空 data | 隱含在 query 邏輯中 | `test/e2e/settings.test.ts` TC-032 | ✅ |
| 分頁邊界 | 正確處理第二頁 | limit/offset 實作正確 | `test/e2e/settings.test.ts` TC-033 | ✅ |
| GET /api/v1/versions/:versionId/environments | 回傳 data 陣列 | 完整實作 | `test/e2e/environments.test.ts` | ✅ |
| GET /api/v1/versions/:versionId/editions | 回傳 data 陣列 | 完整實作 | `test/e2e/editions.test.ts` | ✅ |
| GET /api/v1/settings/:settingId | 回傳單筆 setting detail | 完整實作 | `test/e2e/settings.test.ts` (404 case) | ⚠️ |
| 設定表格頁面 UI | 篩選列 + 表格 + 分頁 | `dev/src/app/settings/page.tsx` + 多個 component | 無 browser test | ⚠️ |
| 版本清單頁面 UI | 卡片顯示版本 | `dev/src/app/page.tsx` + `version-selector.tsx` | 無 browser test | ⚠️ |

---

## Correctness 詳細

### API Contract 偏差

| 問題 | 嚴重度 | 說明 |
|------|--------|------|
| **Import API request body 不符 spec** | 高 | Spec 定義 `{ branch, version_name, dry_run }`；實作使用 `{ repoPath, versionName, dryRun }`（camelCase + 多了 repoPath、少了 branch）。路徑：`dev/src/app/api/v1/import/cdk8s/route.ts:32-38` |
| **Import API error response key 不一致** | 高 | Spec 定義統一錯誤格式 `{ code, message, details }`；Import route 使用 `{ error, message }` 或 `{ error, details }`。E2E test 期望 `code` 但實作回傳 `error`。路徑：`dev/src/app/api/v1/import/cdk8s/route.ts:50,55,71,84,125` |
| **Import summary 缺少 environments 欄位** | 中 | Spec 定義 summary 包含 `environments` 陣列和 `environments_count`；實作的 `buildSummary()` 設 `environmentsCount: 0` 且 `ImportSummary` type 不含 `environments` 陣列。路徑：`dev/src/app/api/v1/import/cdk8s/route.ts:153` |
| **Import summary field naming** | 中 | Spec 使用 snake_case（`environments_count`, `editions_count`）；實作的 `ImportSummary` type 使用 camelCase（`environmentsCount`, `editionsCount`）。路徑：`dev/src/lib/cdk8s-parser/types.ts:79-86` |
| **未實作 GitLab API 整合** | 高 | Spec 要求透過 GitLab API 讀取 cdk8s repo（支援指定 branch/commit）；實作改為本地 repo path 解析（`parseCdk8sRepo(repoPath)`）。這是架構層級的偏差。 |
| **未實作 Import Status API** | 中 | Spec 定義 `GET /api/v1/import/cdk8s/status/:importId`；完全未實作。 |
| **Import 502 GITLAB_ERROR 未實作** | 中 | 因為未使用 GitLab API，所以無法回傳 502 GITLAB_ERROR。 |
| **PARSE_ERROR 未在 ErrorCodes 定義** | 低 | `api-error.ts` 的 ErrorCodes 不含 PARSE_ERROR（422）；Import route 直接硬編碼。 |
| **DB_ERROR 未在 ErrorCodes 定義** | 低 | Import route 使用 "DB_ERROR" 但 ErrorCodes 只定義 "INTERNAL_ERROR"（500）。 |

### DB Schema 正確性

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| versions table | ✅ | id(uuid), name(varchar50, unique), description(text), created_at, updated_at |
| environments table | ✅ | id(uuid), name(varchar50, unique), created_at |
| editions table | ✅ | id(uuid), name(varchar50, unique), created_at |
| model_components table | ✅ | id, name, type, version_id(FK), component_version, image, unique(name, version_id) |
| model_settings table | ✅ | id, model_component_id(FK), environment_id(FK), edition_id(FK), deploy, gpu_list(jsonb), replica, gpu_memory_utilization(numeric), extra_settings(jsonb), unique(component, env, edition) |
| change_histories table | ✅ | id, model_setting_id(FK), changed_by, change_type, diff(jsonb), reason, created_at |
| merge_requests table | ✅ | id, gitlab_mr_id, gitlab_mr_url, source_branch, target_branch, status, change_history_ids(jsonb) |

### cdk8s Parser 正確性

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| GPU edition 解析 | ✅ | 正確解析 `settings` property 的 nested object，處理 computed property names |
| Model component 解析 | ✅ | 正確讀取 readonly properties，支援 string literal + constant reference + template literal |
| ModelType 常數解析 | ✅ | 從 `model_type.ts` 讀取 variable declarations |
| GPU key 常數解析 | ✅ | 從 `@common.gpu.key.ts` 讀取 variable declarations |
| 環境設定解析 | ✅ | 解析 `*.cfg.ts` 的 class properties（name, stage, edition） |
| 檔案跳過邏輯 | ✅ | SKIP_PATTERNS + NON_MODEL_PATTERNS 避免解析非 model 檔案 |
| 所有 model types 支援 | ✅ | 10 種 model types 全部在 `types/index.ts` 定義 |

### 錯誤處理完整性

| Error Code | HTTP Status | Settings API | Versions API | Import API | Health API |
|------------|-------------|-------------|--------------|------------|------------|
| INVALID_INPUT | 400 | ✅ | N/A | ⚠️ 用 `error` 而非 `code` | N/A |
| NOT_FOUND | 404 | ✅ | N/A | N/A | N/A |
| DUPLICATE | 409 | N/A | N/A | ⚠️ 用 `error` 而非 `code` | N/A |
| INTERNAL_ERROR | 500 | ✅ | ✅ | ⚠️ 用 `error: "DB_ERROR"` | N/A |
| DB_CONNECTION_ERROR | 503 | N/A | N/A | N/A | ✅（格式不同但功能正確） |
| GITLAB_ERROR | 502 | N/A | N/A | ❌ 未實作 | N/A |
| PARSE_ERROR | 422 | N/A | N/A | ⚠️ 用 `error` 而非 `code` | N/A |

---

## Coherence 詳細

### 程式碼風格

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| 命名慣例 | ⚠️ | API request/response 混用 camelCase 和 snake_case：Import API 用 camelCase（`versionName`, `dryRun`），Settings/Versions API response 用 snake_case（`model_component`, `gpu_list`）。Spec 統一使用 snake_case。 |
| 檔案結構 | ✅ | 遵循 Next.js App Router 慣例：`app/api/v1/` 下按資源分路由，`lib/` 放共用邏輯，`components/` 放 UI 元件，`db/schema/` 放 DB schema |
| TypeScript 型別完整性 | ✅ | 全部使用完整型別，未找到任何 `any` 使用 |
| Design tokens 使用 | ⚠️ | `design/tokens/` 定義了完整的 color/typography/spacing tokens，但 UI 元件直接使用 Tailwind class（如 `bg-blue-100`, `text-xs`）而非引用 design tokens。tokens 是文件性質，並未程式化整合。 |

### API Response 格式一致性

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| 成功 response | ⚠️ | Settings/Versions API 使用 `successResponse()` helper 統一包裝；Health API 直接 `NextResponse.json()`；Import API 直接 `NextResponse.json()` |
| 錯誤 response | ❌ | Settings/Versions API 使用 `errorResponse()` helper 回傳 `{ code, message }`；Import API 直接回傳 `{ error, message }` 或 `{ error, details }`。**兩個 API 群的錯誤格式不一致**。 |
| 分頁格式 | ✅ | Versions 和 Settings API 統一使用 `{ data, pagination: { page, per_page, total, total_pages } }` |

### Import Paths

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| Path alias | ✅ | 統一使用 `@/` alias（`@/db`, `@/lib/`, `@/components/`） |
| 循環依賴 | ✅ | 未發現循環 import |
| 未使用的 imports | ✅ | 未發現明顯的未使用 import |

### ApiError class 使用

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| ApiError class 定義 | ⚠️ | `dev/src/lib/api-error.ts` 定義了 `ApiError` class 和 `ErrorCodes`，但 **沒有任何 route handler 使用它**。所有 route 都直接呼叫 `errorResponse()` 或 `NextResponse.json()`。ApiError class 形同廢碼。 |

---

## 發現的問題

1. **[高] Import API contract 與 spec 嚴重不符**：request body 使用 `repoPath` + camelCase 而非 spec 定義的 `branch` + snake_case。整個匯入機制從「GitLab API 遠端讀取」改為「本地 repo path 解析」，這是架構層級的偏差。
   - 檔案：`dev/src/app/api/v1/import/cdk8s/route.ts:32-38`

2. **[高] Import API error response 格式不一致**：使用 `{ error: "CODE" }` 而非統一的 `{ code: "CODE" }`，與 Settings/Versions API 及 spec 定義的統一錯誤格式不同。E2E test 期望 `code` 欄位但實作回傳 `error` 欄位，代表 **E2E test 必定會失敗**。
   - 檔案：`dev/src/app/api/v1/import/cdk8s/route.ts:50,55,71,84,125`
   - 對照：`test/e2e/import.test.ts:42`（expect `code`），`test/e2e/import.test.ts:204`（expect `code`）

3. **[中] Import summary 缺少 environments 資訊**：`buildSummary()` 設定 `environmentsCount: 0` 且不回傳 `environments` 陣列，但 spec 要求 summary 包含 `environments: ["dev", "prod", ...]` 和正確的 `environments_count`。
   - 檔案：`dev/src/app/api/v1/import/cdk8s/route.ts:153`

4. **[中] Import Status API 完全未實作**：spec 定義的 `GET /api/v1/import/cdk8s/status/:importId` 未實作，也無對應 test。
   - Spec：`specs/features/f002-cdk8s-parser.md:89-102`

5. **[中] ErrorCodes 不完整**：`PARSE_ERROR`（422）、`GITLAB_ERROR`（502）、`DB_ERROR` 未定義在 `api-error.ts` 的 ErrorCodes 中。
   - 檔案：`dev/src/lib/api-error.ts`

6. **[中] ApiError class 未被使用**：定義了 ApiError class 但所有 route handler 都不使用它，形同廢碼。
   - 檔案：`dev/src/lib/api-error.ts`

7. **[低] Design tokens 未程式化整合**：`design/tokens/` 下有完整的 JSON tokens 定義，但 UI 元件直接使用 Tailwind utility classes，tokens 僅作為設計文件參考。
   - 檔案：`design/tokens/colors.json`, `dev/src/components/model-type-badge.tsx`

8. **[低] 不存在的 API path 回傳格式**：Spec 要求 `GET /api/v1/nonexistent` 回傳 `{ code: "NOT_FOUND" }`，但沒有全域 404 handler 來保證此格式。E2E test `health.test.ts:62` 期望此行為，可能依賴 Next.js 預設行為或其他 middleware。

9. **[低] GET /api/v1/settings/:settingId 的成功路徑缺少 E2E test**：只測了 404 not found，未測試成功取得 setting detail 的場景。

10. **[低] UI 的 Environment/Edition 篩選使用 Select dropdown 而非 spec 說的「多選」**：spec 寫 "Environment dropdown (多選)"、"Edition dropdown (多選)"，但實作為單選 Select。
    - 檔案：`dev/src/components/edition-filter.tsx`, `dev/src/components/environment-tabs.tsx`

---

## 建議

1. **統一 Import API contract**：將 Import route 的 request body 改為 snake_case（`version_name`, `dry_run`, `branch`），error response 改用 `{ code, message, details }` 格式，與其他 API 和 spec 一致。這是最高優先的修復項目。

2. **決定 GitLab API vs 本地解析的策略**：目前 Import 改用本地 repo path 解析，這是合理的 Phase 1 簡化，但應在 spec 中明確記錄此偏差，並在 `tech-survey.md` 中說明後續 sprint 的 GitLab 整合計畫。

3. **補齊 Import Summary 的 environments 資訊**：`buildSummary()` 應接收 `environments` 參數並正確回傳環境清單和數量。

4. **統一使用 errorResponse() helper 或 ApiError class**：選擇其一作為標準，移除另一個。建議統一使用 `errorResponse()` 並補齊 PARSE_ERROR、GITLAB_ERROR 等 error codes。

5. **補齊 E2E test 覆蓋**：
   - GET /api/v1/settings/:settingId 的成功路徑
   - 版本無任何設定的場景
   - DB 斷線時 health check 回傳 503

6. **考慮 UI 多選篩選**：如果 spec 確實要求多選 Environment/Edition，需將 Select 改為 multi-select 元件。如果確認單選即可，則更新 spec。

7. **Import Status API**：如果 Sprint 1 不需要此功能，應從 spec 中移到後續 sprint，避免驗證缺口。
