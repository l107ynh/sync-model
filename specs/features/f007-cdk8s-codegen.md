# F-007: 自動產生 cdk8s 變更

## Status: active
## Sprint: 3
## Priority: P0

## 使用者故事
As a PM, I want 系統自動根據 UI 上的設定變更產生對應的 cdk8s TypeScript 程式碼修改, so that RD 不需要手動翻譯設定到程式碼。

## 範圍
- 從 ModelSetting 變更產生 TypeScript 程式碼差異
- 支援 GPU 設定檔 (`src/components/inferno/gpu/*.ts`) 的修改
- 預覽產生的程式碼變更（diff format）
- 支援多筆變更合併為一次程式碼產生

## API Contract

### `POST /api/v1/codegen/preview`
Auth: 無

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| change_history_ids | uuid[] | yes | 1-50 個 |

Request Example:
```json
{
  "change_history_ids": ["uuid-1", "uuid-2"]
}
```

Response 200:
```json
{
  "files": [
    {
      "path": "src/components/inferno/gpu/pro.ts",
      "action": "modify",
      "diff": "--- a/src/components/inferno/gpu/pro.ts\n+++ b/src/components/inferno/gpu/pro.ts\n@@ -10,7 +10,7 @@\n   'asr-general': {\n     deploy: true,\n     gpuList: ['A100'],\n-    replica: 2,\n+    replica: 3,\n     gpu_memory_utilization: 0.85,\n   },",
      "full_content": "// 完整的檔案內容..."
    }
  ],
  "summary": {
    "files_changed": 1,
    "insertions": 1,
    "deletions": 1
  }
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | change_history_ids 為空或超過 50 個 |
| 404 | NOT_FOUND | 任一 change_history_id 不存在 |
| 422 | CODEGEN_ERROR | 無法產生對應的程式碼（例如找不到目標檔案的對應關係）|

### `POST /api/v1/codegen/generate`
Auth: 無

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| change_history_ids | uuid[] | yes | 1-50 個 |

Response 200:
```json
{
  "codegen_id": "uuid",
  "files": [
    {
      "path": "src/components/inferno/gpu/pro.ts",
      "action": "modify",
      "content": "// 完整的新檔案內容"
    }
  ],
  "status": "ready",
  "created_at": "ISO 8601"
}
```

此 API 的 output 會被 F-008 (GitLab MR) 使用。

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | change_history_ids 為空或超過 50 個 |
| 404 | NOT_FOUND | 任一 change_history_id 不存在 |
| 422 | CODEGEN_ERROR | 無法產生程式碼 |

## Code Generation 邏輯

### GPU 設定檔結構 (`src/components/inferno/gpu/{edition}.ts`)
```typescript
export const gpuConfig = {
  'asr-general': {
    deploy: true,
    gpuList: ['A100'],
    replica: 2,
    gpu_memory_utilization: 0.85,
  },
  'llm-main': {
    deploy: true,
    gpuList: ['H100'],
    replica: 4,
    gpu_memory_utilization: 0.9,
  },
};
```

### 映射規則
- ModelSetting 的 edition.name 對應到 `gpu/{edition}.ts`
- ModelSetting 的 model_component.name 對應到 gpuConfig 的 key
- 修改 deploy / gpuList / replica / gpu_memory_utilization 對應欄位

## Business Rules
1. Codegen 基於 ChangeHistory，而非直接基於 ModelSetting 當前值
2. 多筆 change 若影響同一個檔案，合併為一次修改
3. 產生的 TypeScript 程式碼必須保持原有的 code style（縮排、引號風格）
4. 若 change 影響的 model 在目標 TypeScript 檔案中不存在，記錄 warning 但不阻止
5. codegen 結果暫存，供後續建立 MR 使用

## Scenarios

### Happy Path

#### Scenario: 預覽單筆設定變更的程式碼
GIVEN change_history #1 記錄 asr-general 在 pro edition 的 replica 從 2 改為 3
WHEN POST /api/v1/codegen/preview with { "change_history_ids": ["#1"] }
THEN response status = 200
AND files[0].path = "src/components/inferno/gpu/pro.ts"
AND files[0].diff 包含 "-    replica: 2," 和 "+    replica: 3,"

#### Scenario: 預覽多筆變更合併
GIVEN change_history #1 修改 pro edition 的 asr-general replica
AND change_history #2 修改 pro edition 的 llm-main deploy
WHEN POST /api/v1/codegen/preview with { "change_history_ids": ["#1", "#2"] }
THEN response status = 200
AND files 只有 1 個檔案（合併到同一個 pro.ts）
AND diff 包含兩處修改

#### Scenario: 產生程式碼供 MR 使用
WHEN POST /api/v1/codegen/generate with { "change_history_ids": ["#1"] }
THEN response status = 200
AND codegen_id 不為空
AND files[0].content 包含完整的新檔案內容

### Error Handling

#### Scenario: change_history 不存在
WHEN POST /api/v1/codegen/preview with { "change_history_ids": ["nonexistent"] }
THEN response status = 404
AND response body code = "NOT_FOUND"

#### Scenario: 超過 50 筆變更
WHEN POST /api/v1/codegen/preview with { "change_history_ids": [51 個 uuid] }
THEN response status = 400
AND response body code = "INVALID_INPUT"

### Edge Cases

#### Scenario: 目標檔案中找不到 model
GIVEN change_history #1 記錄 "new-model" 在 pro edition 的變更
AND pro.ts 中沒有 "new-model" 這個 key
WHEN POST /api/v1/codegen/preview with { "change_history_ids": ["#1"] }
THEN response status = 200
AND response body 包含 warning 說明 "new-model" 在 pro.ts 中不存在
AND 新增該 model 到 gpuConfig

#### Scenario: 跨多個 edition 的變更
GIVEN change_history #1 修改 pro edition
AND change_history #2 修改 std edition
WHEN POST /api/v1/codegen/preview with { "change_history_ids": ["#1", "#2"] }
THEN response status = 200
AND files 包含 2 個檔案: pro.ts 和 std.ts
