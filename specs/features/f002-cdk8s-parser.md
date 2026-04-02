# F-002: cdk8s 設定檔解析與匯入

## Status: active
## Sprint: 1
## Priority: P0

## 使用者故事
As a PM, I want 系統能解析 cdk8s repo 中的 TypeScript 設定檔並匯入資料庫, so that 我不需要手動建立所有 model 設定。

## 範圍
- 解析 `src/cfgs/*.cfg.ts` 取得環境設定
- 解析 `src/components/inferno/gpu/*.ts` 取得 edition 的 GPU 設定
- 解析 `src/components/inferno/*.ts` 取得模型元件清單
- 提供 API 觸發匯入（支援指定 GitLab branch / commit）
- 匯入結果摘要

## API Contract

### `POST /api/v1/import/cdk8s`
Auth: 無（Phase 1）

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| branch | string | no | default "main" |
| version_name | string | yes | max 50 chars, e.g. "3.2" |
| dry_run | boolean | no | default false, true 時只解析不寫入 |

Request Example:
```json
{
  "version_name": "3.2",
  "branch": "main",
  "dry_run": false
}
```

Response 200:
```json
{
  "status": "success",
  "version": {
    "id": "uuid",
    "name": "3.2"
  },
  "summary": {
    "environments_count": 12,
    "editions_count": 6,
    "model_components_count": 54,
    "model_settings_count": 324,
    "environments": ["dev", "prod", "dogfood", "on-prem", "stg1vm1"],
    "editions": ["std", "pro", "pro2026", "2026-starter", "2026-std", "2026-pro"],
    "model_types": {
      "LLM": 15,
      "VLM": 5,
      "ASR": 8,
      "TTS": 6,
      "Retriever": 4,
      "Reranker": 3,
      "ObjectDetection": 4,
      "ObjectRecognition": 3,
      "Face": 3,
      "Guardian": 3
    }
  },
  "warnings": [
    "Skipped unknown component: xyz.ts"
  ]
}
```

Response 200 (dry_run = true):
```json
{
  "status": "dry_run",
  "summary": { ... },
  "warnings": [ ... ]
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | version_name 為空或格式不正確 |
| 409 | DUPLICATE | version_name 已存在且 dry_run = false |
| 502 | GITLAB_ERROR | 無法連線 GitLab 或 repo 不存在 |
| 422 | PARSE_ERROR | TypeScript 設定檔格式無法解析 |

### `GET /api/v1/import/cdk8s/status/:importId`
Auth: 無

Response 200:
```json
{
  "id": "uuid",
  "status": "completed",
  "progress": 100,
  "summary": { ... },
  "started_at": "ISO 8601",
  "completed_at": "ISO 8601"
}
```

## 解析邏輯

### 環境設定檔 (`src/cfgs/*.cfg.ts`)
- 檔名模式: `{env}.cfg.ts`
- 解析環境名稱: dev, prod, dogfood, on-prem, stg1vm1 ~ stg3vm3

### GPU 設定檔 (`src/components/inferno/gpu/*.ts`)
- 檔名模式: `{edition}.ts`
- 每個檔案 export 一個物件，key 為 model 名稱，value 為 GPU 設定
- 解析欄位: deploy (boolean), gpuList (string[]), replica (number), gpu_memory_utilization (number)

### 模型元件檔 (`src/components/inferno/*.ts`)
- 每個 .ts 檔代表一個模型元件
- 解析: 元件名稱、模型類型、container image、版本號

## Business Rules
1. 匯入為 idempotent: 同一 version_name 不可重複匯入（需先刪除再匯入，或回傳 409）
2. dry_run 模式不寫入資料庫，只回傳解析結果
3. 解析失敗的單一檔案不阻止整體匯入，記錄到 warnings
4. GitLab API token 從環境變數 `GITLAB_TOKEN` 讀取
5. 匯入過程中若遇到已存在的 environment/edition 名稱，重用既有記錄（不重複建立）

## Scenarios

### Happy Path

#### Scenario: 成功匯入 cdk8s 設定
GIVEN GitLab 可連線且 repo 存在
AND version "3.2" 不存在於系統中
WHEN POST /api/v1/import/cdk8s with { "version_name": "3.2", "branch": "main" }
THEN response status = 200
AND response body status = "success"
AND response body summary.environments_count > 0
AND response body summary.editions_count > 0
AND response body summary.model_components_count > 0
AND database 中存在 version "3.2" 及相關 model settings

#### Scenario: Dry run 預覽匯入結果
GIVEN GitLab 可連線
WHEN POST /api/v1/import/cdk8s with { "version_name": "3.2", "dry_run": true }
THEN response status = 200
AND response body status = "dry_run"
AND database 中不存在 version "3.2"

#### Scenario: 指定特定 branch 匯入
WHEN POST /api/v1/import/cdk8s with { "version_name": "3.2", "branch": "feature/new-model" }
THEN 從 GitLab 的 feature/new-model branch 讀取設定檔
AND response status = 200

### Error Handling

#### Scenario: version_name 已存在
GIVEN version "3.2" 已存在於系統中
WHEN POST /api/v1/import/cdk8s with { "version_name": "3.2" }
THEN response status = 409
AND response body code = "DUPLICATE"

#### Scenario: GitLab 無法連線
GIVEN GitLab API 不可達
WHEN POST /api/v1/import/cdk8s with { "version_name": "3.2" }
THEN response status = 502
AND response body code = "GITLAB_ERROR"

#### Scenario: version_name 為空
WHEN POST /api/v1/import/cdk8s with { "version_name": "" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

### Edge Cases

#### Scenario: 部分設定檔解析失敗
GIVEN cdk8s repo 中有一個格式異常的 TypeScript 檔案
WHEN POST /api/v1/import/cdk8s with { "version_name": "3.2" }
THEN response status = 200
AND response body warnings 包含該檔案的解析錯誤訊息
AND 其他正常檔案成功匯入

#### Scenario: Environment/Edition 已存在時重用
GIVEN environment "dev" 已存在（由之前版本匯入建立）
WHEN POST /api/v1/import/cdk8s with { "version_name": "3.3" }
THEN 重用既有的 environment "dev" 記錄
AND 不建立重複的 environment

#### Scenario: GPU 設定檔缺少某些欄位
GIVEN GPU 設定中 model "asr-general" 沒有 gpu_memory_utilization 欄位
WHEN 匯入此設定
THEN gpu_memory_utilization 使用預設值 null
AND warnings 記錄缺少欄位的資訊
