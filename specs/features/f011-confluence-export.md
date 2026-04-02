# F-011: Confluence 匯出

## Status: active
## Sprint: 4
## Priority: P1

## 使用者故事
As a PM, I want 從系統匯出 model 設定為 Confluence 格式的表格, so that 我可以更新 Confluence 文件或分享給沒有系統權限的人。

## 範圍
- 匯出指定版本的 model 設定為 Confluence Storage Format (HTML)
- 匯出為 PDF
- 可指定環境和 edition 篩選匯出範圍
- 透過 Confluence API 直接更新頁面（選配）

## API Contract

### `POST /api/v1/export/confluence`
Auth: 無

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| version_id | uuid | yes | 必須存在 |
| format | string | yes | "html", "pdf", "confluence_api" |
| environment_ids | uuid[] | no | 篩選特定環境，空=全部 |
| edition_ids | uuid[] | no | 篩選特定 edition，空=全部 |
| confluence_page_id | string | no | 僅 format="confluence_api" 時需要 |

Request Example (匯出 HTML):
```json
{
  "version_id": "uuid",
  "format": "html"
}
```

Request Example (更新 Confluence 頁面):
```json
{
  "version_id": "uuid",
  "format": "confluence_api",
  "confluence_page_id": "12345"
}
```

Response 200 (format = "html"):
```json
{
  "format": "html",
  "content": "<table><tr><th>Component</th><th>ID</th>...",
  "version": { "id": "uuid", "name": "3.2" },
  "generated_at": "ISO 8601"
}
```

Response 200 (format = "pdf"):
Headers: Content-Type: application/pdf, Content-Disposition: attachment; filename="sync-model-3.2.pdf"
Body: PDF binary

Response 200 (format = "confluence_api"):
```json
{
  "status": "updated",
  "confluence_page_id": "12345",
  "confluence_page_url": "https://confluence.corp.ailabs.tw/pages/viewpage.action?pageId=12345",
  "updated_at": "ISO 8601"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | version_id 缺失或 format 不正確 |
| 400 | INVALID_INPUT | format=confluence_api 但缺少 confluence_page_id |
| 404 | NOT_FOUND | version_id 不存在 |
| 502 | CONFLUENCE_ERROR | Confluence API 呼叫失敗 |

## 匯出表格格式

與 Confluence 既有格式一致:
| Component | ID | Model | Images | Settings | Resource |
|-----------|-----|-------|--------|----------|----------|
| ASR core | asr-general-1.2.0 | asr-general | registry.../asr-general:1.2.0 | deploy: true | GPU: A100 x2, mem: 0.85 |

### 欄位映射（系統 -> Confluence）
- model_component.type -> Component（使用 F-010 映射表的反向對應）
- model_component.name + component_version -> ID
- model_component.name -> Model
- model_component.image -> Images
- deploy + extra_settings -> Settings
- gpu_list + replica + gpu_memory_utilization -> Resource

## Business Rules
1. 匯出的表格按 model_type 分組，組內按 name 字母排序
2. 若指定 environment/edition 篩選，只匯出符合條件的設定
3. 未篩選時匯出該版本的所有設定（可能很大）
4. PDF 格式使用橫向排版以容納所有欄位
5. Confluence API 更新為覆蓋頁面內容（先取得最新版本號再更新）

## Scenarios

### Happy Path

#### Scenario: 匯出為 HTML
GIVEN version "3.2" 存在且有 model 設定
WHEN POST /api/v1/export/confluence with { "version_id": "{id}", "format": "html" }
THEN response status = 200
AND content 包含有效的 HTML table
AND table 包含所有 model 設定

#### Scenario: 匯出為 PDF
WHEN POST /api/v1/export/confluence with { "version_id": "{id}", "format": "pdf" }
THEN response status = 200
AND Content-Type = "application/pdf"
AND 檔案可正常開啟

#### Scenario: 篩選特定環境匯出
WHEN POST /api/v1/export/confluence with { "version_id": "{id}", "format": "html", "environment_ids": ["{prod_id}"] }
THEN response status = 200
AND 匯出的表格只包含 prod 環境的設定

#### Scenario: 直接更新 Confluence 頁面
GIVEN Confluence page 12345 存在且有寫入權限
WHEN POST /api/v1/export/confluence with { "version_id": "{id}", "format": "confluence_api", "confluence_page_id": "12345" }
THEN response status = 200
AND Confluence 頁面內容已更新

### Error Handling

#### Scenario: 版本不存在
WHEN POST /api/v1/export/confluence with { "version_id": "nonexistent", "format": "html" }
THEN response status = 404
AND response body code = "NOT_FOUND"

#### Scenario: Confluence API 失敗
GIVEN Confluence API 不可達
WHEN POST /api/v1/export/confluence with { "format": "confluence_api", "confluence_page_id": "12345", "version_id": "{id}" }
THEN response status = 502
AND response body code = "CONFLUENCE_ERROR"

#### Scenario: 缺少 confluence_page_id
WHEN POST /api/v1/export/confluence with { "version_id": "{id}", "format": "confluence_api" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

### Edge Cases

#### Scenario: 版本無任何設定
GIVEN version "empty" 存在但無設定
WHEN POST /api/v1/export/confluence with { "version_id": "{empty_id}", "format": "html" }
THEN response status = 200
AND content 包含空表格（只有表頭）

#### Scenario: 大量設定匯出
GIVEN version "3.2" 有 300+ 筆設定
WHEN 匯出為 PDF
THEN PDF 正常產生（可能多頁）
AND 回應時間 < 30 秒
