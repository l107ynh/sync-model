# F-004: Model 設定編輯

## Status: active
## Sprint: 2
## Priority: P0

## 使用者故事
As a PM, I want 在 Web UI 上直接編輯 model 的 GPU 設定（deploy, gpuList, replica, gpu_memory_utilization）, so that 我不需要透過 Jira 請 RD 手動修改。

## 範圍
- 單一 model setting 的編輯表單
- 批量編輯（選取多個 model 同時修改 deploy 狀態）
- 編輯前後的 diff 預覽
- 儲存時記錄到 ChangeHistory

## API Contract

### `PATCH /api/v1/settings/:settingId`
Auth: 無（Phase 1）

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| deploy | boolean | no | - |
| gpu_list | string[] | no | 每項 max 50 chars |
| replica | integer | no | >= 0 |
| gpu_memory_utilization | number | no | >= 0, <= 1, 小數點後最多 2 位 |
| extra_settings | object | no | 合法 JSON |
| reason | string | no | max 500 chars, 變更原因 |
| changed_by | string | yes | max 100 chars |

Request Example:
```json
{
  "deploy": true,
  "replica": 3,
  "gpu_memory_utilization": 0.9,
  "reason": "增加 prod 副本數以應對流量",
  "changed_by": "lynn.yang"
}
```

Response 200:
```json
{
  "id": "uuid",
  "model_component": { ... },
  "environment": { ... },
  "edition": { ... },
  "deploy": true,
  "gpu_list": ["A100"],
  "replica": 3,
  "gpu_memory_utilization": 0.9,
  "extra_settings": {},
  "updated_at": "ISO 8601",
  "change_history_id": "uuid"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | 欄位驗證失敗（replica < 0, gpu_mem > 1 等）|
| 404 | NOT_FOUND | settingId 不存在 |

### `PATCH /api/v1/settings/batch`
Auth: 無（Phase 1）

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| setting_ids | uuid[] | yes | 1-100 個 |
| changes | object | yes | 同單一編輯的可修改欄位 |
| reason | string | no | max 500 chars |
| changed_by | string | yes | max 100 chars |

Request Example:
```json
{
  "setting_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "changes": {
    "deploy": false
  },
  "reason": "批量關閉 dev 環境的 VLM 模型",
  "changed_by": "lynn.yang"
}
```

Response 200:
```json
{
  "updated_count": 3,
  "results": [
    { "id": "uuid-1", "status": "updated", "change_history_id": "uuid" },
    { "id": "uuid-2", "status": "updated", "change_history_id": "uuid" },
    { "id": "uuid-3", "status": "updated", "change_history_id": "uuid" }
  ]
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | setting_ids 為空、超過 100 個、或 changes 為空 |
| 404 | NOT_FOUND | 任一 setting_id 不存在（全部不執行）|

### `GET /api/v1/settings/:settingId/preview`
Auth: 無

用途: 取得目前設定值，供前端 diff 預覽使用

Response 200:
```json
{
  "current": {
    "deploy": true,
    "gpu_list": ["A100"],
    "replica": 2,
    "gpu_memory_utilization": 0.85
  }
}
```

## UI 規格

### 編輯模式
- 在設定表格中，點擊某一行進入編輯模式（側面板或 modal）
- 表單欄位:
  - Deploy: Toggle switch
  - GPU List: Tag input（可新增/移除 GPU 型號）
  - Replica: Number input (min=0)
  - GPU Memory Utilization: Slider (0-1) + number input
  - Reason: Text input (選填)
  - Changed By: Text input (必填，Phase 2 改為自動帶入登入使用者)
- 儲存前顯示 diff 預覽（舊值 vs 新值）
- 確認按鈕 + 取消按鈕

### 批量編輯
- 表格每行有 checkbox
- 選取多行後，上方出現「批量編輯」按鈕
- 批量編輯只支援修改 deploy 狀態
- 顯示即將影響的 model 清單

## Business Rules
1. 至少修改一個欄位才能送出（不允許空修改）
2. changed_by 為必填（Phase 1 手動輸入，Phase 2 自動帶入）
3. 每次修改自動建立 ChangeHistory 記錄
4. 批量編輯為原子操作: 任一 setting 不存在則全部不執行
5. gpu_memory_utilization 四捨五入到小數點後 2 位
6. replica = 0 且 deploy = true 視為合法（可能在部署前先設定）

## Scenarios

### Happy Path

#### Scenario: 修改單一設定
GIVEN setting #1 存在，deploy=false, replica=1
WHEN PATCH /api/v1/settings/{id} with { "deploy": true, "replica": 3, "changed_by": "lynn.yang", "reason": "上線 prod" }
THEN response status = 200
AND response body deploy = true
AND response body replica = 3
AND ChangeHistory 記錄包含 { "deploy": { "old": false, "new": true }, "replica": { "old": 1, "new": 3 } }

#### Scenario: 批量關閉部署
GIVEN settings #1, #2, #3 存在，deploy=true
WHEN PATCH /api/v1/settings/batch with { "setting_ids": [id1, id2, id3], "changes": { "deploy": false }, "changed_by": "lynn.yang" }
THEN response status = 200
AND updated_count = 3
AND 3 筆 ChangeHistory 記錄被建立

#### Scenario: 修改 GPU 設定
GIVEN setting #1 存在，gpu_list=["A100"], gpu_memory_utilization=0.85
WHEN PATCH /api/v1/settings/{id} with { "gpu_list": ["A100", "H100"], "gpu_memory_utilization": 0.95, "changed_by": "lynn.yang" }
THEN response status = 200
AND gpu_list = ["A100", "H100"]
AND gpu_memory_utilization = 0.95

### Error Handling

#### Scenario: replica 為負數
WHEN PATCH /api/v1/settings/{id} with { "replica": -1, "changed_by": "lynn.yang" }
THEN response status = 400
AND response body code = "INVALID_INPUT"
AND response body message 包含 "replica"

#### Scenario: gpu_memory_utilization 超過 1
WHEN PATCH /api/v1/settings/{id} with { "gpu_memory_utilization": 1.5, "changed_by": "lynn.yang" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: 缺少 changed_by
WHEN PATCH /api/v1/settings/{id} with { "deploy": true }
THEN response status = 400
AND response body code = "INVALID_INPUT"
AND response body message 包含 "changed_by"

#### Scenario: setting 不存在
WHEN PATCH /api/v1/settings/nonexistent-uuid with { "deploy": true, "changed_by": "lynn.yang" }
THEN response status = 404
AND response body code = "NOT_FOUND"

#### Scenario: 批量編輯中有不存在的 setting
GIVEN setting #1 存在，setting #999 不存在
WHEN PATCH /api/v1/settings/batch with { "setting_ids": [id1, "nonexistent"], "changes": { "deploy": false }, "changed_by": "lynn.yang" }
THEN response status = 404
AND response body code = "NOT_FOUND"
AND setting #1 的值未被修改（原子操作）

#### Scenario: 空修改
GIVEN setting #1 存在，deploy=true
WHEN PATCH /api/v1/settings/{id} with { "deploy": true, "changed_by": "lynn.yang" }
THEN response status = 400
AND response body code = "INVALID_INPUT"
AND response body message 包含 "no changes"

### Edge Cases

#### Scenario: gpu_memory_utilization 精度處理
WHEN PATCH /api/v1/settings/{id} with { "gpu_memory_utilization": 0.8567, "changed_by": "lynn.yang" }
THEN response status = 200
AND gpu_memory_utilization = 0.86 (四捨五入到小數點後 2 位)

#### Scenario: 清空 gpu_list
WHEN PATCH /api/v1/settings/{id} with { "gpu_list": [], "changed_by": "lynn.yang" }
THEN response status = 200
AND gpu_list = []

#### Scenario: 批量編輯上限
WHEN PATCH /api/v1/settings/batch with { "setting_ids": [101 個 uuid], "changes": { "deploy": false }, "changed_by": "lynn.yang" }
THEN response status = 400
AND response body code = "INVALID_INPUT"
AND response body message 包含 "maximum 100"
