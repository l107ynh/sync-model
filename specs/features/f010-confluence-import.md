# F-010: Confluence 匯入

## Status: active
## Sprint: 4
## Priority: P0

## 使用者故事
As a PM, I want 從 Confluence 頁面匯入既有的 model 設定記錄, so that 我可以將歷史資料遷移到新系統中。

## 範圍
- 上傳 Confluence 匯出的 PDF 或透過 Confluence API 讀取頁面
- 解析 Confluence 表格結構（Component, ID, Model, Images, Settings, Resource）
- 映射到系統的 data model
- Dry run 預覽 + 確認匯入

## API Contract

### `POST /api/v1/import/confluence`
Auth: 無

Request Body (multipart/form-data):
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| file | file | yes* | PDF 或 HTML, max 50MB |
| confluence_page_id | string | no* | Confluence page ID（與 file 二擇一）|
| version_name | string | yes | max 50 chars |
| dry_run | boolean | no | default false |

*file 和 confluence_page_id 至少提供一個

Response 200:
```json
{
  "status": "success",
  "version": {
    "id": "uuid",
    "name": "3.0"
  },
  "summary": {
    "model_components_count": 30,
    "parsed_tables": 3,
    "skipped_rows": 2,
    "warnings": [
      "Row 5: Component 'unknown-model' 無法匹配到已知的 model type"
    ]
  },
  "parsed_data": [
    {
      "component": "ASR core",
      "id": "asr-general-1.2.0",
      "model": "asr-general",
      "model_type": "ASR",
      "component_version": "1.2.0",
      "image": "registry.corp.ailabs.tw/fedgpt/asr-general:1.2.0",
      "settings": { ... },
      "resource": { ... },
      "status": "matched"
    }
  ]
}
```

Response 200 (dry_run = true):
```json
{
  "status": "dry_run",
  "summary": { ... },
  "parsed_data": [ ... ]
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | 未提供 file 或 confluence_page_id |
| 400 | INVALID_INPUT | version_name 為空 |
| 400 | INVALID_FILE | 檔案格式不支援或無法解析 |
| 409 | DUPLICATE | version_name 已存在且 dry_run = false |
| 502 | CONFLUENCE_ERROR | Confluence API 呼叫失敗 |
| 422 | PARSE_ERROR | 無法解析表格結構 |

## Confluence 表格結構

### 預期格式（每個版本一張表）
| Component | ID | Model | Images | Settings | Resource |
|-----------|-----|-------|--------|----------|----------|
| ASR core | asr-general-1.2.0 | asr-general | registry.../asr-general:1.2.0 | {...} | GPU: A100 x2 |
| TTS core | tts-general-1.3.3 | tts-general | registry.../tts-general:1.3.3 | {...} | GPU: A100 x1 |

### 解析映射規則
- Component -> model_type (ASR core -> ASR, TTS core -> TTS, Visual -> ObjectDetection/ObjectRecognition/Face)
- ID -> model name + component_version（e.g. "asr-general-1.2.0" -> name="asr-general", version="1.2.0"）
- Model -> model_component.name
- Images -> model_component.image
- Resource -> 解析 GPU 型號和數量

### Component 到 Model Type 映射表
| Confluence Component | System Model Type |
|---------------------|-------------------|
| ASR core | ASR |
| TTS core | TTS |
| LLM | LLM |
| VLM | VLM |
| Retriever | Retriever |
| Reranker | Reranker |
| Visual (object-detection) | ObjectDetection |
| Visual (object-recognition) | ObjectRecognition |
| Visual (face-recognition) | Face |
| Guardian | Guardian |

## Business Rules
1. Confluence 匯入為補充資料來源，不覆蓋已存在的設定
2. 匯入時若 version_name 已存在，回傳 409
3. 無法映射的 Component 記錄到 warnings，不阻止匯入
4. PDF 解析可能不精確，務必提供 dry_run 讓使用者確認
5. Confluence API token 從環境變數 `CONFLUENCE_TOKEN` 讀取（如使用 API 模式）
6. 檔案大小上限 50MB

## Scenarios

### Happy Path

#### Scenario: 上傳 PDF 匯入成功
GIVEN PDF 包含版本 3.0 的 model 設定表格
AND version "3.0" 不存在
WHEN POST /api/v1/import/confluence with file=3.0.pdf, version_name="3.0"
THEN response status = 200
AND summary.model_components_count > 0

#### Scenario: Dry run 預覽
WHEN POST /api/v1/import/confluence with file=3.0.pdf, version_name="3.0", dry_run=true
THEN response status = 200
AND status = "dry_run"
AND parsed_data 包含解析出的 model 資料
AND database 中不存在 version "3.0"

#### Scenario: 透過 Confluence API 匯入
GIVEN Confluence page ID 有效
WHEN POST /api/v1/import/confluence with confluence_page_id="12345", version_name="3.1"
THEN response status = 200
AND 從 Confluence API 讀取頁面內容並解析

### Error Handling

#### Scenario: 版本已存在
GIVEN version "3.0" 已存在
WHEN POST /api/v1/import/confluence with version_name="3.0"
THEN response status = 409
AND response body code = "DUPLICATE"

#### Scenario: 不支援的檔案格式
WHEN POST /api/v1/import/confluence with file=data.xlsx, version_name="3.0"
THEN response status = 400
AND response body code = "INVALID_FILE"

#### Scenario: PDF 無法解析表格
GIVEN PDF 內容不含有效表格
WHEN POST /api/v1/import/confluence with file=no-table.pdf, version_name="3.0"
THEN response status = 422
AND response body code = "PARSE_ERROR"

### Edge Cases

#### Scenario: 部分列無法映射
GIVEN PDF 表格中有一列 Component = "Unknown Service"
WHEN 匯入此 PDF
THEN response status = 200
AND summary.warnings 包含該列的警告
AND 其他可映射的列成功匯入

#### Scenario: 空表格
GIVEN PDF 包含表格但所有列都是表頭或空白
WHEN 匯入此 PDF
THEN response status = 200
AND summary.model_components_count = 0
AND warnings 提示「未找到有效的 model 設定資料」
