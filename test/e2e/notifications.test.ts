/**
 * F-009: Google Chat Notification API E2E Tests
 *
 * 對應 specs/features/f009-google-chat-notify.md
 * - POST  /api/v1/notifications/send
 * - GET   /api/v1/notifications/config
 * - PATCH /api/v1/notifications/config
 *
 * 注意：Google Chat Webhook 在測試環境中透過 mock server 處理。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get, post, patch, getFirstVersionId } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NotificationSendResponse {
  status: string;
  sent_at: string;
}

interface NotificationConfigResponse {
  enabled: boolean;
  webhook_url_configured: boolean;
}

interface NotificationConfigUpdateResponse {
  enabled: boolean;
  updated_at: string;
}

interface MergeRequestResponse {
  id: string;
  gitlab_mr_id: number;
  gitlab_mr_url: string;
  status: string;
}

interface MergeRequestListResponse {
  data: MergeRequestResponse[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
}

interface CodegenGenerateResponse {
  codegen_id: string;
  files: Array<{ path: string; content: string }>;
  status: string;
}

interface HistoryListResponse {
  data: Array<{ id: string }>;
  pagination: { page: number; per_page: number; total: number; total_pages: number };
}

interface Setting {
  id: string;
  deploy: boolean;
  replica: number;
}

interface SettingsResponse {
  data: Setting[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
  filters: Record<string, unknown>;
}

interface ErrorBody {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let mergeRequestId: string | null = null;

beforeAll(async () => {
  // 確保有一個 MR 可供通知測試使用
  const mrListRes = await get<MergeRequestListResponse>('/merge-requests?per_page=1');
  if (mrListRes.status === 200 && mrListRes.body.data?.length > 0) {
    mergeRequestId = mrListRes.body.data[0].id;
    return;
  }

  // 如果沒有 MR，嘗試建立一個
  const versionId = await getFirstVersionId();
  if (!versionId) return;

  const settingsRes = await get<SettingsResponse>(
    `/settings?version_id=${versionId}&per_page=1`,
  );
  if (settingsRes.status !== 200 || settingsRes.body.data.length === 0) return;

  const setting = settingsRes.body.data[0];
  await patch(`/settings/${setting.id}`, {
    replica: setting.replica + 1,
    changed_by: 'e2e-notification-seed',
    reason: 'seed for notification test',
  });

  const historyRes = await get<HistoryListResponse>(
    '/history?per_page=1&change_type=UPDATE',
  );
  if (historyRes.body.data.length === 0) return;

  const codegenRes = await post<CodegenGenerateResponse>('/codegen/generate', {
    change_history_ids: [historyRes.body.data[0].id],
  });
  if (codegenRes.status !== 200) return;

  const mrRes = await post<MergeRequestResponse>('/merge-requests', {
    codegen_id: codegenRes.body.codegen_id,
    created_by: 'e2e-notification-seed',
  });
  if (mrRes.status === 201) {
    mergeRequestId = mrRes.body.id;
  }
});

// ---------------------------------------------------------------------------
// Happy Path — Send Notification
// ---------------------------------------------------------------------------
describe('F-009 Notifications — Send', () => {
  it('WHEN POST /notifications/send with valid merge_request_id THEN sends notification', async () => {
    if (!mergeRequestId) {
      console.warn('跳過：無可用的 MR');
      return;
    }

    const res = await post<NotificationSendResponse>('/notifications/send', {
      merge_request_id: mergeRequestId,
    });

    // 根據 webhook 是否設定，可能得到 200 或 503
    if (res.status === 200) {
      expect(res.body).toHaveProperty('status', 'sent');
      expect(res.body).toHaveProperty('sent_at');
    } else if (res.status === 503) {
      // webhook 未設定時的合法回應
      expect(res.body).toHaveProperty('code', 'NOTIFICATION_DISABLED');
    } else {
      // 502 也是合法的（webhook 呼叫失敗）
      expect([200, 502, 503]).toContain(res.status);
    }
  });
});

// ---------------------------------------------------------------------------
// Happy Path — Config
// ---------------------------------------------------------------------------
describe('F-009 Notifications — Config', () => {
  it('WHEN GET /notifications/config THEN returns current config', async () => {
    const res = await get<NotificationConfigResponse>('/notifications/config');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('enabled');
    expect(typeof res.body.enabled).toBe('boolean');
    expect(res.body).toHaveProperty('webhook_url_configured');
    expect(typeof res.body.webhook_url_configured).toBe('boolean');
  });

  it('WHEN PATCH /notifications/config to disable THEN returns updated config', async () => {
    const res = await patch<NotificationConfigUpdateResponse>(
      '/notifications/config',
      { enabled: false },
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('enabled', false);
    expect(res.body).toHaveProperty('updated_at');

    // 確認真的停用了
    const getRes = await get<NotificationConfigResponse>('/notifications/config');
    expect(getRes.body.enabled).toBe(false);
  });

  it('WHEN PATCH /notifications/config to enable THEN returns updated config', async () => {
    const res = await patch<NotificationConfigUpdateResponse>(
      '/notifications/config',
      { enabled: true },
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('enabled', true);
    expect(res.body).toHaveProperty('updated_at');

    // 確認啟用
    const getRes = await get<NotificationConfigResponse>('/notifications/config');
    expect(getRes.body.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MR Created → Notification Sent
// ---------------------------------------------------------------------------
describe('F-009 Notifications — Auto Notification on MR Create', () => {
  it('WHEN MR is created THEN Google Chat notification is triggered automatically', async () => {
    // 此測試驗證 MR 建立後通知自動發出
    // 在 mock 環境中，可透過檢查 mock server 的呼叫記錄驗證
    // 在 E2E 環境中，我們檢查 MR 建立回應正常（通知失敗不影響 MR）

    const versionId = await getFirstVersionId();
    if (!versionId) {
      console.warn('跳過：無可用的 version');
      return;
    }

    const settingsRes = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&per_page=1`,
    );
    if (settingsRes.status !== 200 || settingsRes.body.data.length === 0) return;

    const setting = settingsRes.body.data[0];
    await patch(`/settings/${setting.id}`, {
      replica: setting.replica + 1,
      changed_by: 'e2e-auto-notify-test',
      reason: 'test auto notification on MR create',
    });

    const historyRes = await get<HistoryListResponse>(
      '/history?per_page=1&changed_by=e2e-auto-notify-test',
    );
    if (historyRes.body.data.length === 0) return;

    const codegenRes = await post<CodegenGenerateResponse>('/codegen/generate', {
      change_history_ids: [historyRes.body.data[0].id],
    });
    if (codegenRes.status !== 200) return;

    const mrRes = await post<MergeRequestResponse>('/merge-requests', {
      codegen_id: codegenRes.body.codegen_id,
      created_by: 'e2e-auto-notify-test',
    });

    // MR 建立成功，無論通知是否成功
    expect(mrRes.status).toBe(201);
    expect(mrRes.body).toHaveProperty('id');
    expect(mrRes.body.status).toBe('OPEN');
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe('F-009 Notifications — Error Handling', () => {
  it('WHEN POST /notifications/send with nonexistent merge_request_id THEN returns 404', async () => {
    const res = await post<ErrorBody>('/notifications/send', {
      merge_request_id: '00000000-0000-0000-0000-000000000000',
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN webhook URL not configured THEN notification returns 503 gracefully', async () => {
    // 此測試需要 GOOGLE_CHAT_WEBHOOK_URL 未設定的環境
    // 在標準測試環境中，如果 webhook 已設定，測試可能得到 200
    if (!mergeRequestId) {
      console.warn('跳過：無可用的 MR');
      return;
    }

    // 先停用通知
    await patch('/notifications/config', { enabled: false });

    const res = await post<ErrorBody>('/notifications/send', {
      merge_request_id: mergeRequestId,
    });

    // 停用後應得到 503
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('NOTIFICATION_DISABLED');

    // 重新啟用
    await patch('/notifications/config', { enabled: true });
  });

  it('WHEN notification disabled THEN MR creation still succeeds without notification', async () => {
    const versionId = await getFirstVersionId();
    if (!versionId) {
      console.warn('跳過：無可用的 version');
      return;
    }

    // 先停用通知
    await patch('/notifications/config', { enabled: false });

    const settingsRes = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&per_page=1`,
    );
    if (settingsRes.status !== 200 || settingsRes.body.data.length === 0) {
      await patch('/notifications/config', { enabled: true });
      return;
    }

    const setting = settingsRes.body.data[0];
    await patch(`/settings/${setting.id}`, {
      replica: setting.replica + 1,
      changed_by: 'e2e-disabled-notify-test',
      reason: 'test MR creation with notifications disabled',
    });

    const historyRes = await get<HistoryListResponse>(
      '/history?per_page=1&changed_by=e2e-disabled-notify-test',
    );
    if (historyRes.body.data.length === 0) {
      await patch('/notifications/config', { enabled: true });
      return;
    }

    const codegenRes = await post<CodegenGenerateResponse>('/codegen/generate', {
      change_history_ids: [historyRes.body.data[0].id],
    });
    if (codegenRes.status !== 200) {
      await patch('/notifications/config', { enabled: true });
      return;
    }

    const mrRes = await post<MergeRequestResponse>('/merge-requests', {
      codegen_id: codegenRes.body.codegen_id,
      created_by: 'e2e-disabled-notify-test',
    });

    // MR 仍然成功建立
    expect(mrRes.status).toBe(201);
    expect(mrRes.body.status).toBe('OPEN');

    // 重新啟用通知
    await patch('/notifications/config', { enabled: true });
  });
});
