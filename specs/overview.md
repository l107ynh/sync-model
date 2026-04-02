# Sync Model GP -- Model 設定管理平台

## Status: active
## Created: 2026-04-02

## 專案概述

### 目標
取代 PM 透過 Confluence 手動記錄 FEDGPT 各版本/環境/edition model 設定的流程。
提供 Web UI 讓 PM 直接檢視與編輯設定，修改後自動產生 cdk8s repo 的 GitLab MR，並透過 Google Chat 通知 RD review。

### 目標使用者
- PM：檢視/編輯 model 設定，追蹤變更歷史
- RD：收到 MR 通知後 review 並 merge

### 核心價值主張
- 消除 Confluence 手動記錄的不一致風險
- 縮短「改設定 -> 開 Jira -> RD 手動改 cdk8s」的流程為「UI 改設定 -> 自動發 MR」
- 完整的變更歷史追蹤與 diff 比較

## 技術架構

### 技術偏好（使用者確認）
- **前端**: React + Next.js
- **後端**: Next.js API Routes（全端整合）
- **資料庫**: PostgreSQL（JSONB 存放半結構化 model 設定）
- **部署**: Docker Compose
- **通知**: Google Chat Webhook
- **VCS 整合**: GitLab API（自動建立 MR）

### 技術選型待 Tech Lead Survey
- Next.js 版本（App Router vs Pages Router）
- ORM 選擇（Prisma / Drizzle / TypeORM）
- UI Component Library（shadcn/ui / Ant Design / MUI）
- TypeScript AST 解析工具（ts-morph / @babel/parser / 自寫 parser）
- Confluence API 版本與 SDK
- Migration 工具

### 外部依賴
- **GitLab Corp**: https://gitlab.corp.ailabs.tw/yating/fedgpt/deploy/cdk8s (branch: main)
- **Google Chat Webhook**: 由 RD 提供 webhook URL（設定為環境變數）
- **Confluence**: 公司內部 Confluence 站點（匯入/匯出用）

## 目標 cdk8s Repo 結構

```
cdk8s/
├── src/cfgs/                    # 環境設定
│   ├── dev.cfg.ts
│   ├── prod.cfg.ts
│   ├── dogfood.cfg.ts
│   ├── on-prem.cfg.ts
│   └── stg{1-3}vm{1-3}.cfg.ts
├── src/components/inferno/
│   ├── gpu/                     # GPU 設定（按 edition 分檔）
│   │   ├── std.ts
│   │   ├── pro.ts
│   │   ├── pro2026.ts
│   │   ├── 2026-starter.ts
│   │   ├── 2026-std.ts
│   │   └── 2026-pro.ts
│   └── *.ts                     # ~54 個模型元件
```

### 環境 (Environments)
dev, prod, dogfood, on-prem, stg1vm1 ~ stg3vm3

### Edition
std, pro, pro2026, 2026-starter, 2026-std, 2026-pro

### Model 類型
LLM, VLM, ASR, TTS, Retriever, Reranker, ObjectDetection, ObjectRecognition, Face, Guardian

### GPU 設定欄位（每個 model per edition）
- `deploy`: boolean -- 是否部署
- `gpuList`: string[] -- GPU 型號清單
- `replica`: number -- 副本數
- `gpu_memory_utilization`: number -- GPU 記憶體使用率 (0-1)

## Data Model（概念層）

```
Version (版本)
  id: UUID PK
  name: VARCHAR(50) NOT NULL UNIQUE   -- e.g. "3.0", "3.1", "3.2"
  description: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP

Environment (環境)
  id: UUID PK
  name: VARCHAR(50) NOT NULL UNIQUE   -- e.g. "dev", "prod", "dogfood"
  created_at: TIMESTAMP

Edition (版本方案)
  id: UUID PK
  name: VARCHAR(50) NOT NULL UNIQUE   -- e.g. "std", "pro", "2026-pro"
  created_at: TIMESTAMP

ModelComponent (模型元件)
  id: UUID PK
  name: VARCHAR(100) NOT NULL         -- e.g. "asr-general"
  type: ENUM(LLM, VLM, ASR, TTS, Retriever, Reranker, ObjectDetection, ObjectRecognition, Face, Guardian)
  version_id: FK -> Version
  component_version: VARCHAR(50)      -- e.g. "1.2.0"
  image: VARCHAR(500)                 -- container image URL
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  UNIQUE(name, version_id)

ModelSetting (模型設定 -- 核心表)
  id: UUID PK
  model_component_id: FK -> ModelComponent
  environment_id: FK -> Environment
  edition_id: FK -> Edition
  deploy: BOOLEAN DEFAULT false
  gpu_list: JSONB DEFAULT '[]'        -- ["A100", "H100"]
  replica: INTEGER DEFAULT 1 CHECK(replica >= 0)
  gpu_memory_utilization: DECIMAL(3,2) CHECK(0 <= val <= 1)
  extra_settings: JSONB DEFAULT '{}'  -- 其他半結構化設定
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  UNIQUE(model_component_id, environment_id, edition_id)

ChangeHistory (變更歷史)
  id: UUID PK
  model_setting_id: FK -> ModelSetting
  changed_by: VARCHAR(100) NOT NULL   -- 操作者（Phase 2 改為 FK -> User）
  change_type: ENUM(CREATE, UPDATE, DELETE)
  diff: JSONB NOT NULL                -- { field: { old: x, new: y } }
  reason: TEXT                        -- 變更原因（選填）
  created_at: TIMESTAMP

MergeRequest (MR 紀錄)
  id: UUID PK
  gitlab_mr_id: INTEGER
  gitlab_mr_url: VARCHAR(500)
  source_branch: VARCHAR(200)
  target_branch: VARCHAR(200) DEFAULT 'main'
  status: ENUM(PENDING, OPEN, MERGED, CLOSED)
  change_history_ids: JSONB           -- 關聯的 ChangeHistory IDs
  created_by: VARCHAR(100)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
```

## 範圍邊界

### 在此次範圍內
- Model 設定的 CRUD + 表格檢視
- 變更歷史追蹤 + diff view
- 自動產生 cdk8s TypeScript 變更 + GitLab MR
- Google Chat Webhook 通知
- Confluence 匯入/匯出

### 不在此次範圍（Phase 2）
- RBAC 權限管理
- 使用者登入/註冊
- 審批流程（多人簽核）
- 自動 rollback

## 功能需求索引

| 編號 | 名稱 | Sprint | 優先級 |
|------|------|--------|--------|
| F-001 | 專案初始化與基礎架構 | Sprint 1 | P0 |
| F-002 | cdk8s 設定檔解析與匯入 | Sprint 1 | P0 |
| F-003 | Model 設定表格檢視 | Sprint 1 | P0 |
| F-004 | Model 設定編輯 | Sprint 2 | P0 |
| F-005 | 變更歷史紀錄 | Sprint 2 | P0 |
| F-006 | 設定版本比較 | Sprint 2 | P1 |
| F-007 | 自動產生 cdk8s 變更 | Sprint 3 | P0 |
| F-008 | GitLab MR 自動建立 | Sprint 3 | P0 |
| F-009 | Google Chat Webhook 通知 | Sprint 3 | P1 |
| F-010 | Confluence 匯入 | Sprint 4 | P0 |
| F-011 | Confluence 匯出 | Sprint 4 | P1 |

## Sprint 規劃

### Sprint 1: 基礎建設 + 設定讀取顯示
- F-001: 專案初始化與基礎架構
- F-002: cdk8s 設定檔解析與匯入
- F-003: Model 設定表格檢視

### Sprint 2: 設定編輯 + History
- F-004: Model 設定編輯
- F-005: 變更歷史紀錄
- F-006: 設定版本比較

### Sprint 3: GitLab MR + 通知
- F-007: 自動產生 cdk8s 變更
- F-008: GitLab MR 自動建立
- F-009: Google Chat Webhook 通知

### Sprint 4: Confluence 整合
- F-010: Confluence 匯入
- F-011: Confluence 匯出

## 非功能需求
- 回應時間: API < 500ms (P95)
- 資料庫備份: Docker volume，使用者自行管理
- 日誌: stdout/stderr，Docker Compose logs 可查閱
- 安全性: Phase 1 無 auth（內網使用），Phase 2 加 RBAC
