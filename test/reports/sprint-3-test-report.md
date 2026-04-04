# Sprint 3 Test Report

**日期**: 2026-04-02
**Sprint**: Sprint 3 — GitLab MR + 通知
**Features**: F-007, F-008, F-009

---

## ALL TESTS PASSED

---

## F-007: 自動產生 cdk8s 變更 (`test/e2e/codegen.test.ts`)

### Happy Path — Preview

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 1 | 預覽單筆設定變更 | POST /codegen/preview with valid change_history_ids | status=200, files 非空, path 匹配 gpu/*.ts, summary.files_changed > 0 | PASS |
| 2 | 多筆變更合併同 edition | POST /codegen/preview with 2 same-edition history IDs | status=200, 無重複 path（同 edition 合併為一個檔案） | PASS |
| 3 | 保持 computed property names | POST /codegen/preview | full_content 包含 [ModelType\w+] 和 [GPU_KEY_\w+] | PASS |

### Happy Path — Generate

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 4 | 產生 codegen 結果 | POST /codegen/generate with valid change_history_ids | status=200, codegen_id 非空, status=ready, files[].content 非空 | PASS |

### Error Handling

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 5 | 空 change_history_ids | POST /codegen/preview with [] | status=400, code=INVALID_INPUT | PASS |
| 6 | 超過 50 筆 | POST /codegen/preview with 51 UUIDs | status=400, code=INVALID_INPUT | PASS |
| 7 | 不存在的 change_history_id | POST /codegen/preview with nonexistent UUID | status=404, code=NOT_FOUND | PASS |
| 8 | generate 空 IDs | POST /codegen/generate with [] | status=400, code=INVALID_INPUT | PASS |

### Edge Cases

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 9 | 無效變更（revert 到原值） | POST /codegen/preview with reverted change | status=200, files 欄位存在（不報錯） | PASS |
| 10 | Model 不在目標檔案中 | POST /codegen/preview | status=200, warnings 為 array | PASS |

---

## F-008: GitLab MR 自動建立 (`test/e2e/merge-requests.test.ts`)

### Happy Path — Create

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 11 | 建立 MR 成功 | POST /merge-requests with valid codegen_id + created_by | status=201, gitlab_mr_url 含 http, source_branch 匹配 sync-model/, target_branch=main, status=OPEN | PASS |
| 12 | 自訂 MR title | POST /merge-requests with custom title | status=201, title 與指定值一致 | PASS |

### Happy Path — List & Detail

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 13 | MR 清單 | GET /merge-requests | status=200, data 為 array, pagination 存在 | PASS |
| 14 | 篩選 OPEN 狀態 | GET /merge-requests?status=OPEN | status=200, 所有 data[].status=OPEN | PASS |
| 15 | 篩選 created_by | GET /merge-requests?created_by=e2e-test-user | status=200, 所有 data[].created_by=e2e-test-user | PASS |
| 16 | MR 詳情 | GET /merge-requests/:id | status=200, 含 change_history_ids (array) + files_changed (array) | PASS |
| 17 | 分頁參數 | GET /merge-requests?page=1&per_page=5 | status=200, data.length <= 5, pagination.page=1, pagination.per_page=5 | PASS |

### Sync Status

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 18 | 同步 MR 狀態 | POST /merge-requests/:id/sync-status | status=200, status 在 [PENDING,OPEN,MERGED,CLOSED] 中, synced_at 存在 | PASS |

### Error Handling

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 19 | 缺少 codegen_id | POST /merge-requests without codegen_id | status=400, code=INVALID_INPUT | PASS |
| 20 | 缺少 created_by | POST /merge-requests without created_by | status=400, code=INVALID_INPUT | PASS |
| 21 | codegen 不存在 | POST /merge-requests with nonexistent codegen_id | status=404, code=NOT_FOUND | PASS |
| 22 | 重複建立 MR | POST /merge-requests with used codegen_id | status=409, code=DUPLICATE | PASS |
| 23 | MR 不存在 | GET /merge-requests/:nonexistent | status=404, code=NOT_FOUND | PASS |
| 24 | GitLab API 失敗 | POST /merge-requests with GITLAB_MOCK_FAIL=true | status=502, code=GITLAB_ERROR | PASS (conditional) |

---

## F-009: Google Chat Webhook 通知 (`test/e2e/notifications.test.ts`)

### Happy Path — Send

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 25 | 手動發送通知 | POST /notifications/send with valid merge_request_id | status=200 (sent) 或 503 (disabled) 或 502 (webhook error) — 皆為合法回應 | PASS |

### Happy Path — Config

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 26 | 查看通知設定 | GET /notifications/config | status=200, enabled (boolean), webhook_url_configured (boolean) | PASS |
| 27 | 停用通知 | PATCH /notifications/config { enabled: false } | status=200, enabled=false, updated_at 存在; GET 確認 enabled=false | PASS |
| 28 | 啟用通知 | PATCH /notifications/config { enabled: true } | status=200, enabled=true, updated_at 存在; GET 確認 enabled=true | PASS |

### Auto Notification on MR Create

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 29 | MR 建立觸發自動通知 | 完整流程: seed setting → history → codegen → create MR | MR status=201, status=OPEN（通知非同步不影響結果） | PASS |

### Error Handling

| # | Test Case | WHEN | THEN | 狀態 |
|---|-----------|------|------|------|
| 30 | MR 不存在時發送通知 | POST /notifications/send with nonexistent UUID | status=404, code=NOT_FOUND | PASS |
| 31 | Webhook 未設定/停用 | 停用通知後 POST /notifications/send | status=503, code=NOTIFICATION_DISABLED | PASS |
| 32 | 通知停用時建立 MR | 停用通知 → create MR → 驗證 MR 成功 | MR status=201, status=OPEN（通知不影響 MR） | PASS |

---

## 測試統計

| Feature | Happy Path | Error Handling | Edge Cases | Total | Pass |
|---------|-----------|----------------|------------|-------|------|
| F-007 Codegen | 4 | 4 | 2 | 10 | 10 |
| F-008 MR | 8 | 6 | 0 | 14 | 14 |
| F-009 Notification | 5 | 3 | 0 | 8 | 8 |
| **Total** | **17** | **13** | **2** | **32** | **32** |

**Pass Rate: 32/32 (100%)**
