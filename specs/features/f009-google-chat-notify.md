# F-009: Google Chat Webhook 通知

## Status: active
## Sprint: 3
## Priority: P1

## 使用者故事
As a PM, I want MR 建立後自動透過 Google Chat 通知 RD, so that RD 能即時知道有新的設定變更需要 review。

## 範圍
- MR 建立成功後自動發送 Google Chat 通知
- 通知包含 MR 連結、變更摘要、操作者
- 支援啟用/停用通知
- 手動重發通知

## API Contract

### `POST /api/v1/notifications/send`
Auth: 無

用途: 手動觸發通知（MR 建立時自動呼叫，也可手動重發）

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| merge_request_id | uuid | yes | 必須存在 |

Response 200:
```json
{
  "status": "sent",
  "sent_at": "ISO 8601"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 404 | NOT_FOUND | merge_request_id 不存在 |
| 502 | WEBHOOK_ERROR | Google Chat Webhook 呼叫失敗 |
| 503 | NOTIFICATION_DISABLED | 通知功能已停用 |

### `GET /api/v1/notifications/config`
Auth: 無

Response 200:
```json
{
  "enabled": true,
  "webhook_url_configured": true
}
```

### `PATCH /api/v1/notifications/config`
Auth: 無

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| enabled | boolean | yes | - |

Response 200:
```json
{
  "enabled": false,
  "updated_at": "ISO 8601"
}
```

## Google Chat Message 格式

```json
{
  "cards": [
    {
      "header": {
        "title": "Sync Model GP - 新設定變更 MR",
        "subtitle": "by lynn.yang"
      },
      "sections": [
        {
          "widgets": [
            {
              "textParagraph": {
                "text": "<b>變更摘要</b><br>- asr-general (pro): replica 2 → 3<br>- llm-main (pro): deploy false → true"
              }
            },
            {
              "buttons": [
                {
                  "textButton": {
                    "text": "Review MR",
                    "onClick": {
                      "openLink": {
                        "url": "https://gitlab.corp.ailabs.tw/..."
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Business Rules
1. Webhook URL 從環境變數 `GOOGLE_CHAT_WEBHOOK_URL` 讀取
2. 若 webhook URL 未設定，通知功能自動停用（不報錯）
3. 通知失敗不影響 MR 建立（MR 仍然成功，只是通知失敗記錄 warning）
4. 手動重發不做次數限制

## Scenarios

### Happy Path

#### Scenario: MR 建立後自動通知
GIVEN Google Chat Webhook 已設定且啟用
AND MR #1 剛建立成功
WHEN 系統自動發送通知
THEN Google Chat 收到訊息
AND 訊息包含 MR URL 和變更摘要

#### Scenario: 手動重發通知
GIVEN MR #1 存在
WHEN POST /api/v1/notifications/send with { "merge_request_id": "#1" }
THEN response status = 200
AND Google Chat 收到訊息

#### Scenario: 停用通知
WHEN PATCH /api/v1/notifications/config with { "enabled": false }
THEN response status = 200
AND 後續 MR 建立不會發送通知

### Error Handling

#### Scenario: Webhook URL 未設定
GIVEN GOOGLE_CHAT_WEBHOOK_URL 環境變數為空
WHEN POST /api/v1/notifications/send with { "merge_request_id": "#1" }
THEN response status = 503
AND response body code = "NOTIFICATION_DISABLED"

#### Scenario: Webhook 呼叫失敗
GIVEN Webhook URL 已設定但 Google Chat API 回傳錯誤
WHEN 嘗試發送通知
THEN response status = 502
AND response body code = "WEBHOOK_ERROR"
AND MR 狀態不受影響

### Edge Cases

#### Scenario: 通知停用時建立 MR
GIVEN 通知已停用
WHEN 建立新 MR
THEN MR 建立成功
AND 不嘗試發送通知
AND MR response 中不包含通知錯誤
