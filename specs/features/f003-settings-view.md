# F-003: Model 設定表格檢視

## Status: active
## Sprint: 1
## Priority: P0

## 使用者故事
As a PM, I want 在 Web UI 上以表格方式檢視 version x environment x edition 的 model 設定, so that 我可以快速了解各環境的部署狀態。

## 範圍
- 版本清單頁面
- 設定表格頁面（version + environment + edition 組合篩選）
- 表格顯示: model name, type, deploy, gpuList, replica, gpu_memory_utilization
- 篩選/排序功能

## API Contract

### `GET /api/v1/versions`
Auth: 無

Query Parameters:
| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| page | integer | no | 1 | >= 1 |
| per_page | integer | no | 20 | 1-100 |

Response 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "3.2",
      "description": "FEDGPT 3.2 release",
      "model_components_count": 54,
      "created_at": "ISO 8601",
      "updated_at": "ISO 8601"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

### `GET /api/v1/versions/:versionId/environments`
Auth: 無

Response 200:
```json
{
  "data": [
    { "id": "uuid", "name": "dev" },
    { "id": "uuid", "name": "prod" },
    { "id": "uuid", "name": "dogfood" }
  ]
}
```

### `GET /api/v1/versions/:versionId/editions`
Auth: 無

Response 200:
```json
{
  "data": [
    { "id": "uuid", "name": "std" },
    { "id": "uuid", "name": "pro" },
    { "id": "uuid", "name": "2026-pro" }
  ]
}
```

### `GET /api/v1/settings`
Auth: 無

Query Parameters:
| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| version_id | uuid | yes | - | 必須存在 |
| environment_id | uuid | no | - | 篩選特定環境 |
| edition_id | uuid | no | - | 篩選特定 edition |
| model_type | string | no | - | 篩選模型類型 (LLM, ASR, etc.) |
| deploy_only | boolean | no | false | true 時只顯示 deploy=true |
| search | string | no | - | 模糊搜尋 model name |
| sort_by | string | no | "name" | name, type, deploy, replica |
| sort_order | string | no | "asc" | asc, desc |
| page | integer | no | 1 | >= 1 |
| per_page | integer | no | 50 | 1-200 |

Response 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "model_component": {
        "id": "uuid",
        "name": "asr-general",
        "type": "ASR",
        "component_version": "1.2.0",
        "image": "registry.corp.ailabs.tw/fedgpt/asr-general:1.2.0"
      },
      "environment": {
        "id": "uuid",
        "name": "prod"
      },
      "edition": {
        "id": "uuid",
        "name": "pro"
      },
      "deploy": true,
      "gpu_list": ["A100"],
      "replica": 2,
      "gpu_memory_utilization": 0.85,
      "extra_settings": {},
      "updated_at": "ISO 8601"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 324,
    "total_pages": 7
  },
  "filters": {
    "available_types": ["LLM", "VLM", "ASR", "TTS"],
    "available_environments": [
      { "id": "uuid", "name": "dev" }
    ],
    "available_editions": [
      { "id": "uuid", "name": "std" }
    ]
  }
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | version_id 格式不正確或缺失 |
| 404 | NOT_FOUND | version_id 不存在 |

### `GET /api/v1/settings/:settingId`
Auth: 無

Response 200:
```json
{
  "id": "uuid",
  "model_component": { ... },
  "environment": { ... },
  "edition": { ... },
  "deploy": true,
  "gpu_list": ["A100"],
  "replica": 2,
  "gpu_memory_utilization": 0.85,
  "extra_settings": {},
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 404 | NOT_FOUND | setting 不存在 |

## UI 規格

### 頁面 1: 版本清單 (`/`)
- 卡片或表格列出所有版本
- 每張卡片顯示: 版本名稱、模型元件數量、建立時間
- 點擊進入該版本的設定表格

### 頁面 2: 設定表格 (`/versions/:versionId`)
- 頂部: 版本名稱 + 篩選列
  - Environment dropdown (多選)
  - Edition dropdown (多選)
  - Model Type dropdown (多選)
  - 搜尋框 (model name)
  - Toggle: 只顯示已部署
- 表格欄位:
  | Model Name | Type | Environment | Edition | Deploy | GPU List | Replica | GPU Mem Util |
  - Deploy 顯示為綠色/灰色圓點
  - GPU List 顯示為 tags
- 支援欄位排序（點擊表頭）
- 分頁控制

## Business Rules
1. 版本清單按 created_at 倒序排列（最新在最前）
2. 設定表格預設按 model name 字母排序
3. version_id 為必要參數，不能不選版本就看設定
4. 篩選條件為 AND 關係（多個篩選同時生效）

## Scenarios

### Happy Path

#### Scenario: 檢視版本清單
GIVEN 系統中有 version "3.0", "3.1", "3.2"
WHEN GET /api/v1/versions
THEN response status = 200
AND response body data 包含 3 筆版本
AND 按 created_at 倒序排列

#### Scenario: 檢視特定版本的所有設定
GIVEN version "3.2" 存在且有 54 個 model components
WHEN GET /api/v1/settings?version_id={3.2的id}
THEN response status = 200
AND response body data 包含 model settings
AND pagination.total > 0

#### Scenario: 依環境篩選設定
GIVEN version "3.2" 存在
WHEN GET /api/v1/settings?version_id={id}&environment_id={prod的id}
THEN response status = 200
AND 所有 data 項目的 environment.name = "prod"

#### Scenario: 依模型類型篩選
WHEN GET /api/v1/settings?version_id={id}&model_type=ASR
THEN response status = 200
AND 所有 data 項目的 model_component.type = "ASR"

#### Scenario: 只顯示已部署的 model
WHEN GET /api/v1/settings?version_id={id}&deploy_only=true
THEN response status = 200
AND 所有 data 項目的 deploy = true

#### Scenario: 搜尋 model 名稱
WHEN GET /api/v1/settings?version_id={id}&search=asr
THEN response status = 200
AND 所有 data 項目的 model_component.name 包含 "asr"（大小寫不敏感）

### Error Handling

#### Scenario: 缺少 version_id
WHEN GET /api/v1/settings
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: version_id 不存在
WHEN GET /api/v1/settings?version_id=nonexistent-uuid
THEN response status = 404
AND response body code = "NOT_FOUND"

### Edge Cases

#### Scenario: 版本無任何設定
GIVEN version "empty" 存在但未匯入任何設定
WHEN GET /api/v1/settings?version_id={empty的id}
THEN response status = 200
AND response body data = []
AND pagination.total = 0

#### Scenario: 多條件篩選無結果
WHEN GET /api/v1/settings?version_id={id}&model_type=ASR&edition_id={pro的id}&deploy_only=true
THEN response status = 200
AND response body data = []
AND pagination.total = 0

#### Scenario: 分頁邊界
GIVEN 總共 54 筆設定
WHEN GET /api/v1/settings?version_id={id}&page=2&per_page=50
THEN response status = 200
AND response body data 包含 4 筆
AND pagination.page = 2
AND pagination.total_pages = 2
