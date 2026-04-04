# Sprint 2 驗證報告

## 總結
- **Completeness**: 7/10
- **Correctness**: 8/10
- **Coherence**: 9/10
- **Overall**: WARNING

---

## Completeness 詳細

### F-004: Model 設定編輯

| Scenario | Spec | 實作 | Test | 狀態 |
|----------|------|------|------|------|
| 修改單一設定 | PATCH /api/v1/settings/{id} 回傳 200, deploy/replica 更新 | `dev/src/app/api/v1/settings/[settingId]/route.ts` PATCH handler + `lib/queries/settings.ts` updateSetting() | `test/e2e/settings-edit.test.ts` 驗證 200 + replica 更新 | ✅ |
| 批量關閉部署 | PATCH /api/v1/settings/batch 回傳 200, updated_count=3 | **未實作**：`dev/src/app/api/v1/settings/` 下無 batch route | `test/e2e/settings-edit.test.ts` 有完整 batch 測試 | ❌ |
| 修改 GPU 設定 | PATCH gpu_list + gpu_memory_utilization 更新 | updateSetting() 支援這兩個欄位 | `test/e2e/settings-edit.test.ts` 測試 gpu_memory_utilization | ✅ |
| replica 為負數 | 回傳 400 INVALID_INPUT | Zod schema `z.number().int().min(0)` 驗證 | `test/e2e/settings-edit.test.ts` 驗證 400 | ✅ |
| gpu_memory_utilization > 1 | 回傳 400 INVALID_INPUT | Zod schema `z.number().min(0).max(1)` 驗證 | `test/e2e/settings-edit.test.ts` 驗證 400 | ✅ |
| 缺少 changed_by | 回傳 400 INVALID_INPUT, message 含 "changed_by" | Zod schema `changed_by: z.string().max(100)` 為必填 | `test/e2e/settings-edit.test.ts` 驗證 400 + message 含 changed_by | ✅ |
| setting 不存在 | 回傳 404 NOT_FOUND | updateSetting() 查詢後拋出 UpdateSettingError | `test/e2e/settings-edit.test.ts` 驗證 404 | ✅ |
| 批量編輯中有不存在的 setting | 回傳 404, 原子操作不修改 | **未實作**：無 batch endpoint | `test/e2e/settings-edit.test.ts` 有測試 | ❌ |
| 空修改（值未變更） | 回傳 400, message 含 "no changes" | computeDiff() 回傳空 diff 時拋出 UpdateSettingError | `test/e2e/settings-edit.test.ts` 驗證 400 + "no changes" | ✅ |
| gpu_memory_utilization 精度處理 | 0.8567 四捨五入為 0.86 | Zod transform `Math.round(v * 100) / 100` | `test/e2e/settings-edit.test.ts` 驗證 0.86 | ✅ |
| 清空 gpu_list | gpu_list = [] 合法 | 實作允許空陣列 | `test/e2e/settings-edit.test.ts` 驗證 [] | ✅ |
| 批量編輯上限 101 | 回傳 400, message 含 "maximum 100" | **未實作**：無 batch endpoint | `test/e2e/settings-edit.test.ts` 有測試 | ❌ |
| 樂觀鎖 expected_updated_at | stale timestamp 回傳 409 CONFLICT | updateSetting() 支援 expected_updated_at 檢查，回傳 409 | `test/e2e/settings-edit.test.ts` 測試 409（容許 200/400 fallback） | ✅ |
| diff 預覽 API | GET /api/v1/settings/:id/preview 回傳 current 值 | **未實作**：無 preview route | 無對應 test | ❌ |
| ChangeHistory 記錄建立 | 每次修改自動建立 ChangeHistory | updateSetting() 在 transaction 內 insert changeHistories | `test/e2e/settings-edit.test.ts` 驗證 history diff 正確 | ✅ |

### F-005: 變更歷史紀錄

| Scenario | Spec | 實作 | Test | 狀態 |
|----------|------|------|------|------|
| 查看全域變更歷史 | GET /api/v1/history 回傳 data + pagination, created_at 倒序 | `dev/src/app/api/v1/history/route.ts` + `lib/queries/history.ts` queryHistory() 使用 `desc(createdAt)` | `test/e2e/history.test.ts` 驗證 200 + 倒序 | ✅ |
| 依操作者篩選歷史 | changed_by=lynn.yang 篩選 | queryHistory() 條件 `eq(changeHistories.changedBy, changedBy)` | `test/e2e/history.test.ts` 驗證 change_type=UPDATE 篩選（未測 changed_by 篩選） | ⚠️ |
| 依日期範圍篩選 | from_date + to_date 篩選 | queryHistory() 使用 `gte/lte` 條件 | `test/e2e/history.test.ts` 驗證日期範圍 | ✅ |
| 查看單一 setting 的歷史 | GET /api/v1/settings/{id}/history 回傳該 setting 的歷史 | `dev/src/app/api/v1/settings/[settingId]/history/route.ts` + getSettingHistory() | `test/e2e/history.test.ts` 驗證 200 + data > 0 | ✅ |
| 查看歷史詳情含 diff | GET /api/v1/history/{historyId} 回傳完整 diff | `dev/src/app/api/v1/history/[historyId]/route.ts` + getHistoryById() | `test/e2e/history.test.ts` 驗證 id, changed_by, change_type, diff, created_at | ✅ |
| 查詢不存在的 setting 歷史 | 回傳 404 NOT_FOUND | route 先 getSettingById() 檢查存在性 | `test/e2e/history.test.ts` 驗證 404 | ✅ |
| 查詢不存在的歷史記錄 | 回傳 404 NOT_FOUND | getHistoryById() 回傳 null 時回傳 404 | `test/e2e/history.test.ts` 驗證 404 | ✅ |
| setting 無任何變更歷史 | 回傳 200, data 含 1 筆 CREATE 記錄, old=null | 隱含在 getSettingHistory() 邏輯中 | 無直接測試 CREATE 記錄的 old=null | ⚠️ |
| 歷史分頁 | page/per_page 正確計算 total_pages | queryHistory() + getSettingHistory() 使用 limit/offset + count | `test/e2e/history.test.ts` 驗證 pagination 欄位 | ✅ |
| version_id 篩選 | 篩選特定版本的歷史 | queryHistory() 條件 `eq(modelComponents.versionId, versionId)` | 無直接 test | ⚠️ |
| environment_id 篩選 | 篩選特定環境的歷史 | queryHistory() 條件 `eq(modelSettings.environmentId, environmentId)` | 無直接 test | ⚠️ |
| edition_id 篩選 | 篩選特定 edition 的歷史 | queryHistory() 條件 `eq(modelSettings.editionId, editionId)` | 無直接 test | ⚠️ |
| model_component_id 篩選 | 篩選特定 model 的歷史 | queryHistory() 條件 `eq(modelSettings.modelComponentId, modelComponentId)` | 無直接 test | ⚠️ |
| changed_by 篩選回傳空結果 | 不存在的操作者回傳 data=[], total=0 | queryHistory() 正確處理 | `test/e2e/history.test.ts` 驗證空結果 | ✅ |

### F-006: 設定版本比較

| Scenario | Spec | 實作 | Test | 狀態 |
|----------|------|------|------|------|
| 比較兩個版本 | GET /api/v1/compare 回傳 summary + changes | `dev/src/app/api/v1/compare/route.ts` + `lib/queries/compare.ts` compareVersions() | `test/e2e/compare.test.ts` 驗證 200 + summary + changes | ✅ |
| 篩選特定環境比較 | environment_id 參數篩選 | getSettingsForVersion() 支援 environmentId 條件 | `test/e2e/compare.test.ts` 驗證 changes 只含指定環境 | ✅ |
| 版本 B 新增了 model | change_type=added, version_a=null | compareVersions() 處理 !a && b 情況 | 隱含在比較測試中 | ✅ |
| 自我比較 | 回傳 400 INVALID_INPUT | Zod refine `version_a_id !== version_b_id` | `test/e2e/compare.test.ts` 驗證 400 | ✅ |
| 版本不存在 | 回傳 404 NOT_FOUND | compareVersions() 查詢後拋出 CompareError | `test/e2e/compare.test.ts` 驗證 404 | ✅ |
| 缺少 version_a_id | 回傳 400 INVALID_INPUT | route 明確檢查 `!searchParams.version_a_id` | `test/e2e/compare.test.ts` 驗證 400 | ✅ |
| 缺少 version_b_id | 回傳 400 INVALID_INPUT | route 明確檢查 `!searchParams.version_b_id` | `test/e2e/compare.test.ts` 驗證 400 | ✅ |
| 兩個版本完全相同 | summary 全為 0, changes=[] | compareVersions() 正確計算 unchanged 計數 | `test/e2e/compare.test.ts` 測試自我比較（但被 400 擋住） | ⚠️ |
| 版本 A 為空 | 所有 B 的設定標記為 added | compareVersions() 處理 !a && b 情況 | 無直接 test | ⚠️ |
| edition_id 篩選 | 篩選特定 edition 比較 | getSettingsForVersion() 支援 editionId 條件 | 無直接 test | ⚠️ |
| 匹配 key 邏輯 | model_component.name + environment.name + edition.name | `buildMatchingKey()` 使用 `name|envName|editionName` | 隱含在比較邏輯中 | ✅ |

---

## Correctness 詳細

### PATCH API Schema 驗證

| 檢查項 | Spec | 實作 | 狀態 |
|--------|------|------|------|
| deploy: boolean, optional | `z.boolean().optional()` | ✅ |
| gpu_list: string[], optional, 每項 max 50 | `z.array(z.string().max(50)).optional()` | ✅ |
| replica: integer, optional, >= 0 | `z.number().int().min(0).optional()` | ✅ |
| gpu_memory_utilization: number, optional, 0-1 | `z.number().min(0).max(1).optional()` + transform 四捨五入 | ✅ |
| extra_settings: object, optional | `z.record(z.unknown()).optional()` | ✅ |
| reason: string, optional, max 500 | `z.string().max(500).optional()` | ✅ |
| changed_by: string, required, max 100 | `z.string().max(100)` (required) | ✅ |

### 樂觀鎖（expected_updated_at）

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| Zod 定義 expected_updated_at | ✅ | `z.string().optional()` |
| 比較邏輯正確 | ✅ | `new Date(expectedUpdatedAt).getTime() !== current.updatedAt.getTime()` 時拋出 409 CONFLICT |
| 錯誤碼正確 | ✅ | 拋出 `UpdateSettingError("CONFLICT", ..., 409)` |
| 不提供時跳過檢查 | ✅ | `if (expectedUpdatedAt)` 條件守護 |

### change_histories diff 格式

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| diff 格式 `{ field: { old, new } }` | ✅ | `computeDiff()` 回傳 `Record<string, { old, new }>` |
| DB schema 型別 | ✅ | `jsonb("diff").$type<Record<string, { old: unknown; new: unknown }>>()` |
| 只記錄實際變更的欄位 | ✅ | `computeDiff()` 使用 `isEqual()` 比較，不同才加入 diff |
| 空修改偵測 | ✅ | `Object.keys(diff).length === 0` 時拋出 400 "No changes detected" |
| Transaction 保證一致性 | ✅ | `db.transaction()` 內同時 update setting + insert history |

### Compare API 匹配邏輯

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| 匹配 key: name + env + edition | ✅ | `buildMatchingKey()` = `modelComponentName|environmentName|editionName` |
| A 有 B 沒有 = removed | ✅ | diff 中 version_b = null |
| B 有 A 沒有 = added | ✅ | diff 中 version_a = null |
| 兩邊都有但不同 = modified | ✅ | 逐欄位比較，有差異加入 diff |
| 兩邊相同 = unchanged | ✅ | 不列入 changes 陣列，只增加 unchanged 計數 |
| diff 使用 version_a/version_b 命名 | ✅ | 符合 spec 定義的 `{ version_a, version_b }` 格式 |
| summary 四項計數完整 | ✅ | `{ added, removed, modified, unchanged }` |

### History API 篩選完整性

| 篩選參數 | Spec 定義 | 實作 | 狀態 |
|----------|----------|------|------|
| version_id | ✅ | `eq(modelComponents.versionId, versionId)` | ✅ |
| environment_id | ✅ | `eq(modelSettings.environmentId, environmentId)` | ✅ |
| edition_id | ✅ | `eq(modelSettings.editionId, editionId)` | ✅ |
| model_component_id | ✅ | `eq(modelSettings.modelComponentId, modelComponentId)` | ✅ |
| changed_by | ✅ | `eq(changeHistories.changedBy, changedBy)` | ✅ |
| change_type | ✅ CREATE/UPDATE/DELETE | `z.enum(["CREATE", "UPDATE", "DELETE"])` | ✅ |
| from_date | ✅ ISO 8601 | `gte(changeHistories.createdAt, new Date(fromDate))` | ✅ |
| to_date | ✅ ISO 8601 | `lte(changeHistories.createdAt, new Date(toDate))` | ✅ |
| page | ✅ default 1 | `z.coerce.number().int().min(1).default(1)` | ✅ |
| per_page | ✅ default 20, max 100 | `z.coerce.number().int().min(1).max(100).default(20)` | ✅ |

### API Response 格式與 Spec 對照

| API | Spec Response | 實作 Response | 狀態 |
|-----|--------------|--------------|------|
| PATCH /settings/:id | `{ id, model_component, environment, edition, deploy, gpu_list, replica, gpu_memory_utilization, extra_settings, updated_at, change_history_id }` | 回傳 `{ ...setting, change_history_id }` 完整 | ✅ |
| GET /history | `{ data: [{ id, model_setting: { id, model_component, environment, edition }, changed_by, change_type, diff, reason, created_at }], pagination }` | queryHistory() 回傳格式一致 | ✅ |
| GET /history/:id | 包含 model_setting.model_component.component_version | getHistoryById() 回傳 component_version | ✅ |
| GET /settings/:id/history | `{ data: [{ id, changed_by, change_type, diff, reason, created_at }], pagination }` | getSettingHistory() 回傳格式一致 | ✅ |
| GET /compare | `{ version_a, version_b, summary, changes }` | compareVersions() 回傳格式一致 | ✅ |

---

## Coherence 詳細

### 風格與 Sprint 1 一致性

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| Route handler 結構 | ✅ | 統一使用 try-catch + `successResponse()`/`errorResponse()` 模式，與 Sprint 1 的 Settings/Versions route 一致 |
| Zod validation | ✅ | 所有新 route 使用 `safeParse()` + 格式化錯誤訊息，與 Sprint 1 一致 |
| Query builder 模式 | ✅ | 使用 Drizzle ORM 的 `select().from().innerJoin().where()` 鏈式調用，與 Sprint 1 一致 |
| 分頁格式 | ✅ | `{ data, pagination: { page, per_page, total, total_pages } }` 統一格式 |
| API response snake_case | ✅ | 所有新 API response 使用 snake_case（`model_setting`, `changed_by`, `change_type`, `model_component_name`） |
| 路由路徑命名 | ✅ | 遵循 RESTful 慣例：`/history`, `/history/:id`, `/settings/:id/history`, `/compare` |
| Error class 模式 | ⚠️ | Sprint 2 新增 `UpdateSettingError` 和 `CompareError` 兩個自訂 Error class，但未使用共用的 `ApiError` class（Sprint 1 也未使用 ApiError，問題延續） |

### API Response 格式統一

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| 成功 response | ✅ | 所有新 route 使用 `successResponse()` helper |
| 錯誤 response | ✅ | 所有新 route 使用 `errorResponse(code, message, status)` 回傳 `{ code, message }` |
| 分頁資訊 | ✅ | History list 和 Setting history 均回傳 `pagination` 物件，格式與 Sprint 1 一致 |
| 404 格式 | ✅ | 統一使用 `errorResponse("NOT_FOUND", ..., 404)` |
| 400 格式 | ✅ | 統一使用 `errorResponse("INVALID_INPUT", ..., 400)` |

### 錯誤處理

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| 使用自訂 Error class | ⚠️ | `UpdateSettingError` 和 `CompareError` 結構相同但各自定義，未共用 `ApiError`。建議重構為使用共用的 `ApiError` class。 |
| 500 catch-all | ✅ | 所有新 route 在 catch block 中回傳 `errorResponse("INTERNAL_ERROR", ..., 500)` |
| 型別安全 | ✅ | 使用 `instanceof` 檢查特定 Error 型別，其餘走 catch-all |

### 程式碼品質

| 檢查項 | 狀態 | 說明 |
|--------|------|------|
| TypeScript 嚴謹度 | ✅ | 無 `any` 使用，完整型別標註 |
| Path alias | ✅ | 統一使用 `@/` alias |
| 共用 utility | ✅ | `computeDiff()` 和 `isEqual()` 抽為獨立模組 `lib/diff.ts` |
| isEqual 重複實作 | ⚠️ | `lib/diff.ts` 和 `lib/queries/compare.ts` 各自實作了 `isEqual()` 函式，邏輯相同但未共用 |

---

## 發現的問題

### 高優先

1. **[高] PATCH /api/v1/settings/batch 未實作**
   - Spec (F-004) 定義了批量編輯 API `PATCH /api/v1/settings/batch`，包含原子操作、上限 100 個 setting_ids 等完整規格
   - `dev/src/app/api/v1/settings/` 下無 batch route 檔案
   - E2E test `test/e2e/settings-edit.test.ts` 已撰寫 4 個 batch 測試案例，但無對應後端實作
   - 影響：批量編輯功能完全缺失，4 個 E2E test 必定失敗

2. **[高] GET /api/v1/settings/:settingId/preview 未實作**
   - Spec (F-004) 定義了 preview API 用於取得目前設定值供 diff 預覽使用
   - 無對應 route 檔案，也無 E2E test
   - 影響：前端 diff 預覽功能缺少 API 支援（但可透過 GET /settings/:id 替代）

### 中優先

3. **[中] isEqual() 函式重複實作**
   - `dev/src/lib/diff.ts:26` 和 `dev/src/lib/queries/compare.ts:73` 各自實作了功能相同的 `isEqual()` 函式
   - 應抽為共用 utility，避免未來維護不一致

4. **[中] UpdateSettingError 和 CompareError 未使用共用 ApiError**
   - `dev/src/lib/queries/settings.ts:389` 定義 `UpdateSettingError`
   - `dev/src/lib/queries/compare.ts:262` 定義 `CompareError`
   - 兩者結構完全相同（code + message + status），應使用 `lib/api-error.ts` 的 `ApiError` class
   - 此問題從 Sprint 1 延續，ApiError class 仍未被任何 route 使用

5. **[中] E2E test 缺少部分 F-005 篩選場景**
   - `changed_by` 篩選有測試（empty case），但未測有結果的 case
   - `version_id`, `environment_id`, `edition_id`, `model_component_id` 篩選均無直接 E2E test
   - Spec 定義的 CREATE 記錄 old=null 場景無測試

6. **[中] F-006 "兩版本完全相同" 場景不可測**
   - E2E test 用自我比較測試 changes=[]，但 API 正確地擋住自我比較回傳 400
   - 需要兩個設定完全相同的不同 version 才能測試此場景
   - 目前測試邏輯有 fallback 處理但無法實際驗證 changes=[] 的正確性

### 低優先

7. **[低] History list 的 model_setting 缺少 environment/edition id**
   - Spec (F-005) GET /api/v1/history 的 response 中 `model_setting.environment` 和 `model_setting.edition` 只有 `name` 沒有 `id`
   - GET /api/v1/history/:id 的 response 則有 id（正確）
   - 不一致但影響較小，list 通常不需要 id

8. **[低] Compare API 對 gpu_memory_utilization 型別處理**
   - `getSettingsForVersion()` 中 `gpuMemoryUtilization` 使用 `parseFloat(r.gpuMemoryUtilization)` 轉換
   - 若 DB 值為 null，回傳 null（正確）
   - 但 `parseFloat` 對 "0" 回傳 0，而 `0` 是 falsy 值，條件判斷 `r.gpuMemoryUtilization ? parseFloat(...) : null` 會將 0 轉為 null
   - 此問題也存在於 `getSettingById()` 和 `querySettings()`，但 gpu_memory_utilization = 0 在業務上較罕見

---

## 建議

1. **實作 PATCH /api/v1/settings/batch endpoint**（高優先）
   - 新增 `dev/src/app/api/v1/settings/batch/route.ts`
   - 實作原子操作邏輯：先驗證所有 setting_ids 存在，再 transaction 內批量更新
   - 支援 setting_ids 上限 100、changes 至少一個欄位、changed_by 必填

2. **考慮移除或延後 preview API**
   - GET /api/v1/settings/:settingId 已能回傳完整設定值
   - preview API 可能是多餘的，若確認不需要可從 spec 移除

3. **抽出共用的 isEqual() 函式**
   - 將 `lib/diff.ts` 的 `isEqual()` export，讓 `lib/queries/compare.ts` import 使用

4. **統一 Error class**
   - 將 `UpdateSettingError` 和 `CompareError` 改為使用 `ApiError`
   - 在 `ApiError` 的 `ErrorCodes` 中新增 `CONFLICT: { code: "CONFLICT", status: 409 }`

5. **修正 gpu_memory_utilization 的 falsy 判斷**
   - 將 `r.gpuMemoryUtilization ? parseFloat(...) : null` 改為 `r.gpuMemoryUtilization !== null ? parseFloat(...) : null`
   - 影響檔案：`lib/queries/settings.ts` (3 處), `lib/queries/compare.ts` (1 處)

6. **補齊 E2E test**
   - F-005: 新增 version_id / environment_id / edition_id / model_component_id 篩選測試
   - F-005: 新增 CREATE 記錄的 old=null 驗證
   - F-006: 準備兩個設定相同的 version seed data 以測試 unchanged 場景
