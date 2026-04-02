# F-005: 變更歷史紀錄

## Status: active
## Sprint: 2
## Priority: P0

## 使用者故事
As a PM, I want 查看所有 model 設定的變更歷史（誰、何時、改了什麼）, so that 我可以追蹤每次變更的原因和內容。

## 範圍
- 全域變更歷史列表（所有 model 的變更）
- 單一 model setting 的變更歷史
- Diff view（每筆變更的前後差異）

## API Contract

### `GET /api/v1/history`
Auth: 無

Query Parameters:
| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| version_id | uuid | no | - | 篩選特定版本 |
| environment_id | uuid | no | - | 篩選特定環境 |
| edition_id | uuid | no | - | 篩選特定 edition |
| model_component_id | uuid | no | - | 篩選特定 model |
| changed_by | string | no | - | 篩選特定操作者 |
| change_type | string | no | - | CREATE, UPDATE, DELETE |
| from_date | string | no | - | ISO 8601, 起始時間 |
| to_date | string | no | - | ISO 8601, 結束時間 |
| page | integer | no | 1 | >= 1 |
| per_page | integer | no | 20 | 1-100 |

Response 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "model_setting": {
        "id": "uuid",
        "model_component": {
          "name": "asr-general",
          "type": "ASR"
        },
        "environment": { "name": "prod" },
        "edition": { "name": "pro" }
      },
      "changed_by": "lynn.yang",
      "change_type": "UPDATE",
      "diff": {
        "deploy": { "old": false, "new": true },
        "replica": { "old": 1, "new": 3 }
      },
      "reason": "增加 prod 副本數",
      "created_at": "2026-04-02T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### `GET /api/v1/settings/:settingId/history`
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
      "changed_by": "lynn.yang",
      "change_type": "UPDATE",
      "diff": {
        "replica": { "old": 1, "new": 3 }
      },
      "reason": "增加副本數",
      "created_at": "2026-04-02T10:30:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 404 | NOT_FOUND | settingId 不存在 |

### `GET /api/v1/history/:historyId`
Auth: 無

Response 200:
```json
{
  "id": "uuid",
  "model_setting": {
    "id": "uuid",
    "model_component": {
      "name": "asr-general",
      "type": "ASR",
      "component_version": "1.2.0"
    },
    "environment": { "id": "uuid", "name": "prod" },
    "edition": { "id": "uuid", "name": "pro" }
  },
  "changed_by": "lynn.yang",
  "change_type": "UPDATE",
  "diff": {
    "deploy": { "old": false, "new": true },
    "replica": { "old": 1, "new": 3 }
  },
  "reason": "增加 prod 副本數",
  "created_at": "2026-04-02T10:30:00.000Z"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 404 | NOT_FOUND | historyId 不存在 |

## UI 規格

### 全域歷史頁面 (`/history`)
- 時間軸式列表，最新在最前
- 每筆顯示: 時間、操作者、model 名稱、環境、edition、變更類型
- 展開可看 diff（舊值 vs 新值，以顏色標示）
- 篩選: 日期範圍、操作者、環境、model 類型

### Setting 歷史面板
- 在設定編輯 modal/panel 中的「歷史」tab
- 顯示該 setting 的所有變更歷史
- 可展開查看每筆 diff

### Diff 顯示格式
- 紅色背景: 舊值（被刪除/修改前）
- 綠色背景: 新值（新增/修改後）
- 例: `replica: 1 -> 3`

## Business Rules
1. 歷史記錄不可修改、不可刪除（immutable audit log）
2. 歷史記錄按 created_at 倒序排列
3. diff 只記錄實際有變更的欄位（未修改的欄位不出現在 diff 中）
4. CREATE 類型的 diff 中 old 值為 null
5. DELETE 類型的 diff 中 new 值為 null

## Scenarios

### Happy Path

#### Scenario: 查看全域變更歷史
GIVEN 系統中有多筆變更記錄
WHEN GET /api/v1/history
THEN response status = 200
AND response body data 按 created_at 倒序排列

#### Scenario: 依操作者篩選歷史
GIVEN 有 lynn.yang 和 john.doe 的變更記錄
WHEN GET /api/v1/history?changed_by=lynn.yang
THEN response status = 200
AND 所有 data 項目的 changed_by = "lynn.yang"

#### Scenario: 依日期範圍篩選
WHEN GET /api/v1/history?from_date=2026-04-01T00:00:00Z&to_date=2026-04-02T23:59:59Z
THEN response status = 200
AND 所有 data 項目的 created_at 在指定範圍內

#### Scenario: 查看單一 setting 的歷史
GIVEN setting #1 有 5 筆變更記錄
WHEN GET /api/v1/settings/{id}/history
THEN response status = 200
AND response body data 包含 5 筆記錄
AND 所有記錄的 model_setting.id 相同

#### Scenario: 查看歷史詳情含 diff
GIVEN 有一筆 UPDATE 記錄，replica 從 1 改為 3
WHEN GET /api/v1/history/{historyId}
THEN response status = 200
AND diff.replica.old = 1
AND diff.replica.new = 3

### Error Handling

#### Scenario: 查詢不存在的 setting 歷史
WHEN GET /api/v1/settings/nonexistent-uuid/history
THEN response status = 404
AND response body code = "NOT_FOUND"

#### Scenario: 查詢不存在的歷史記錄
WHEN GET /api/v1/history/nonexistent-uuid
THEN response status = 404
AND response body code = "NOT_FOUND"

### Edge Cases

#### Scenario: setting 無任何變更歷史
GIVEN setting #1 剛建立，只有 CREATE 記錄
WHEN GET /api/v1/settings/{id}/history
THEN response status = 200
AND response body data 包含 1 筆 CREATE 記錄
AND diff 中所有 old 值為 null

#### Scenario: 歷史分頁
GIVEN setting #1 有 50 筆變更記錄
WHEN GET /api/v1/settings/{id}/history?page=1&per_page=20
THEN response body pagination.total = 50
AND response body pagination.total_pages = 3
AND response body data 包含 20 筆
