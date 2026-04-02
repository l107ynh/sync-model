# F-006: 設定版本比較

## Status: active
## Sprint: 2
## Priority: P1

## 使用者故事
As a PM, I want 比較兩個版本之間的 model 設定差異, so that 我可以快速了解版本升級時有哪些設定變更。

## 範圍
- 選擇兩個版本（Version A vs Version B）進行 diff
- 可指定 environment 和 edition 範圍
- 顯示新增/刪除/修改的 model 設定

## API Contract

### `GET /api/v1/compare`
Auth: 無

Query Parameters:
| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| version_a_id | uuid | yes | - | 基準版本 |
| version_b_id | uuid | yes | - | 比較版本 |
| environment_id | uuid | no | - | 篩選特定環境 |
| edition_id | uuid | no | - | 篩選特定 edition |

Response 200:
```json
{
  "version_a": { "id": "uuid", "name": "3.1" },
  "version_b": { "id": "uuid", "name": "3.2" },
  "summary": {
    "added": 5,
    "removed": 2,
    "modified": 10,
    "unchanged": 37
  },
  "changes": [
    {
      "model_component_name": "asr-general",
      "model_type": "ASR",
      "environment": "prod",
      "edition": "pro",
      "change_type": "modified",
      "diff": {
        "replica": { "version_a": 2, "version_b": 3 },
        "gpu_memory_utilization": { "version_a": 0.85, "version_b": 0.9 }
      }
    },
    {
      "model_component_name": "vlm-new-model",
      "model_type": "VLM",
      "environment": "prod",
      "edition": "pro",
      "change_type": "added",
      "diff": {
        "deploy": { "version_a": null, "version_b": true },
        "replica": { "version_a": null, "version_b": 2 }
      }
    },
    {
      "model_component_name": "legacy-tts",
      "model_type": "TTS",
      "environment": "prod",
      "edition": "pro",
      "change_type": "removed",
      "diff": {
        "deploy": { "version_a": true, "version_b": null }
      }
    }
  ]
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | 缺少 version_a_id 或 version_b_id |
| 400 | INVALID_INPUT | version_a_id == version_b_id |
| 404 | NOT_FOUND | 任一 version 不存在 |

## 比較邏輯
- 匹配 key: model_component.name + environment.name + edition.name
- 在 A 有但 B 沒有 = removed
- 在 B 有但 A 沒有 = added
- 兩邊都有但設定值不同 = modified
- 兩邊都有且設定值相同 = unchanged（不列入 changes）

## UI 規格

### 比較頁面 (`/compare`)
- 頂部: Version A dropdown + Version B dropdown + 比較按鈕
- 可選篩選: Environment, Edition
- 摘要卡片: Added (綠), Removed (紅), Modified (黃), Unchanged (灰)
- 差異列表:
  - 按 change_type 分組（Added / Removed / Modified）
  - Modified 展開顯示欄位級 diff
  - 顏色標示: 綠=新增, 紅=移除, 黃=修改

## Business Rules
1. 不允許同一版本自我比較
2. 比較結果不持久化（即時計算）
3. unchanged 的設定不出現在 changes 陣列中
4. 比較以 model name + env + edition 為匹配 key

## Scenarios

### Happy Path

#### Scenario: 比較兩個版本
GIVEN version "3.1" 和 "3.2" 都存在
WHEN GET /api/v1/compare?version_a_id={3.1的id}&version_b_id={3.2的id}
THEN response status = 200
AND summary 包含 added, removed, modified, unchanged 計數
AND changes 列出所有差異

#### Scenario: 篩選特定環境比較
WHEN GET /api/v1/compare?version_a_id={id}&version_b_id={id}&environment_id={prod的id}
THEN response status = 200
AND changes 只包含 environment = "prod" 的差異

#### Scenario: 版本 B 新增了 model
GIVEN version "3.1" 沒有 model "vlm-new"，version "3.2" 有
WHEN 比較 3.1 vs 3.2
THEN changes 包含 { model_component_name: "vlm-new", change_type: "added" }

### Error Handling

#### Scenario: 自我比較
WHEN GET /api/v1/compare?version_a_id={id}&version_b_id={same_id}
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: 版本不存在
WHEN GET /api/v1/compare?version_a_id=nonexistent&version_b_id={id}
THEN response status = 404
AND response body code = "NOT_FOUND"

### Edge Cases

#### Scenario: 兩個版本完全相同
GIVEN version "3.1-a" 和 "3.1-b" 設定完全相同
WHEN 比較兩者
THEN summary.added = 0, summary.removed = 0, summary.modified = 0
AND changes = []

#### Scenario: 版本 A 為空
GIVEN version "empty" 沒有任何設定
WHEN 比較 "empty" vs "3.2"
THEN 所有 "3.2" 的設定都標記為 added
