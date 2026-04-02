# F-001: 專案初始化與基礎架構

## Status: active
## Sprint: 1
## Priority: P0

## 使用者故事
As a 開發團隊, I want 一個完整的專案骨架（Next.js + PostgreSQL + Docker Compose）, so that 後續功能開發有統一的基礎架構。

## 範圍
- Next.js 專案建立（App Router or Pages Router 由 Tech Lead 決定）
- PostgreSQL 資料庫 schema migration
- Docker Compose 設定（app + db）
- 基礎 API 架構（error handling, response format）
- 健康檢查 endpoint

## API Contract

### `GET /api/v1/health`
Auth: 無

Response 200:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-04-02T00:00:00.000Z",
  "database": "connected"
}
```

Response 503:
```json
{
  "status": "error",
  "message": "Database connection failed"
}
```

### 統一 Error Response 格式

所有 API 錯誤回傳統一格式:
```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

Error Codes 定義:
| Code | HTTP Status | 說明 |
|------|-------------|------|
| INVALID_INPUT | 400 | 請求參數驗證失敗 |
| NOT_FOUND | 404 | 資源不存在 |
| DUPLICATE | 409 | 資源已存在（唯一性衝突）|
| INTERNAL_ERROR | 500 | 伺服器內部錯誤 |
| DB_CONNECTION_ERROR | 503 | 資料庫連線失敗 |

## Data Model

完整 schema 見 `specs/overview.md` Data Model 區塊。
此 feature 負責建立所有 table 的 migration。

## Docker Compose

```yaml
services:
  app:
    build: ./dev
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/sync_model
      - GITLAB_URL=https://gitlab.corp.ailabs.tw
      - GITLAB_TOKEN=${GITLAB_TOKEN}
      - GITLAB_PROJECT_ID=${GITLAB_PROJECT_ID}
      - GOOGLE_CHAT_WEBHOOK_URL=${GOOGLE_CHAT_WEBHOOK_URL}
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=sync_model
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d sync_model"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Business Rules
1. App 啟動時自動執行 migration
2. 所有 API response 使用統一 JSON 格式
3. 所有 timestamp 使用 ISO 8601 UTC
4. UUID v4 作為所有 entity 的 primary key

## Scenarios

### Happy Path

#### Scenario: 健康檢查成功
WHEN GET /api/v1/health
THEN response status = 200
AND response body status = "ok"
AND response body database = "connected"

#### Scenario: Docker Compose 啟動成功
GIVEN docker compose 設定檔存在
WHEN docker compose up -d
THEN app container 啟動在 port 3000
AND db container 啟動在 port 5432
AND GET http://localhost:3000/api/v1/health returns 200

### Error Handling

#### Scenario: 資料庫未連線時健康檢查失敗
GIVEN database container 未啟動
WHEN GET /api/v1/health
THEN response status = 503
AND response body status = "error"

#### Scenario: 不存在的 API path
WHEN GET /api/v1/nonexistent
THEN response status = 404
AND response body code = "NOT_FOUND"

### Edge Cases

#### Scenario: 重複執行 migration
GIVEN migration 已執行過
WHEN app 重新啟動
THEN migration 不會重複建立已存在的 table
AND app 正常啟動
