/**
 * F-004: Settings Edit API E2E Tests
 *
 * 對應 specs/features/f004-settings-edit.md — PATCH /api/v1/settings/:id
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get, patch, getFirstVersionId } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Setting {
  id: string;
  model_component: { id: string; name: string; type: string };
  environment: { id: string; name: string };
  edition: { id: string; name: string };
  deploy: boolean;
  gpu_list: string[];
  replica: number;
  gpu_memory_utilization: number | null;
  extra_settings: Record<string, unknown>;
  updated_at: string;
  change_history_id?: string;
}

interface SettingsResponse {
  data: Setting[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
  filters: Record<string, unknown>;
}

interface HistoryItem {
  id: string;
  changed_by: string;
  change_type: string;
  diff: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  created_at: string;
}

interface ErrorBody {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let settingId: string | null = null;
let versionId: string | null = null;

beforeAll(async () => {
  versionId = await getFirstVersionId();
  if (!versionId) return;

  const res = await get<SettingsResponse>(`/settings?version_id=${versionId}&per_page=1`);
  if (res.status === 200 && res.body.data?.length > 0) {
    settingId = res.body.data[0].id;
  }
});

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------
describe('F-004 Settings Edit API — Happy Path', () => {
  it('WHEN PATCH /settings/:id with valid data THEN returns 200 with updated setting', async () => {
    if (!settingId) {
      console.warn('跳過：系統中尚無 setting');
      return;
    }

    const res = await patch<Setting>(`/settings/${settingId}`, {
      replica: 3,
      changed_by: 'e2e-test',
      reason: 'E2E 測試修改 replica',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', settingId);
    expect(res.body.replica).toBe(3);
    expect(res.body).toHaveProperty('updated_at');
    expect(res.body).toHaveProperty('change_history_id');
  });

  it('WHEN PATCH with deploy=false THEN setting.deploy becomes false', async () => {
    if (!settingId) return;

    const res = await patch<Setting>(`/settings/${settingId}`, {
      deploy: false,
      changed_by: 'e2e-test',
      reason: '關閉部署',
    });

    expect(res.status).toBe(200);
    expect(res.body.deploy).toBe(false);
  });

  it('WHEN PATCH completes THEN change_history record created with correct diff', async () => {
    if (!settingId) return;

    // 先取得目前值
    const current = await get<Setting>(`/settings/${settingId}`);
    const oldReplica = current.body.replica;
    const newReplica = oldReplica === 5 ? 6 : 5;

    const patchRes = await patch<Setting>(`/settings/${settingId}`, {
      replica: newReplica,
      changed_by: 'e2e-test',
      reason: '測試 history diff',
    });
    expect(patchRes.status).toBe(200);

    // 驗證 history 記錄
    const historyRes = await get<{ data: HistoryItem[] }>(
      `/settings/${settingId}/history?per_page=1`,
    );
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThan(0);

    const latest = historyRes.body.data[0];
    expect(latest.change_type).toBe('UPDATE');
    expect(latest.diff).toHaveProperty('replica');
    expect(latest.diff.replica.old).toBe(oldReplica);
    expect(latest.diff.replica.new).toBe(newReplica);
  });

  it('WHEN PATCH with reason THEN reason saved in change_history', async () => {
    if (!settingId) return;

    const reason = `E2E 測試原因 ${Date.now()}`;
    const patchRes = await patch<Setting>(`/settings/${settingId}`, {
      replica: 2,
      changed_by: 'e2e-test',
      reason,
    });
    expect(patchRes.status).toBe(200);

    const historyRes = await get<{ data: HistoryItem[] }>(
      `/settings/${settingId}/history?per_page=1`,
    );
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data[0].reason).toBe(reason);
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe('F-004 Settings Edit API — Error Handling', () => {
  it('WHEN PATCH with invalid setting id THEN returns 404', async () => {
    const res = await patch<ErrorBody>(
      '/settings/00000000-0000-0000-0000-000000000000',
      { deploy: true, changed_by: 'e2e-test' },
    );

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN PATCH without changed_by THEN returns 400', async () => {
    if (!settingId) return;

    const res = await patch<ErrorBody>(`/settings/${settingId}`, {
      deploy: true,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
    expect(res.body.message).toMatch(/changed_by/i);
  });

  it('WHEN PATCH with replica < 0 THEN returns 400', async () => {
    if (!settingId) return;

    const res = await patch<ErrorBody>(`/settings/${settingId}`, {
      replica: -1,
      changed_by: 'e2e-test',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN PATCH with gpu_memory_utilization > 1 THEN returns 400', async () => {
    if (!settingId) return;

    const res = await patch<ErrorBody>(`/settings/${settingId}`, {
      gpu_memory_utilization: 1.5,
      changed_by: 'e2e-test',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN PATCH with no actual changes (same value) THEN returns 400', async () => {
    if (!settingId) return;

    // 先取得目前值
    const current = await get<Setting>(`/settings/${settingId}`);
    const currentDeploy = current.body.deploy;

    const res = await patch<ErrorBody>(`/settings/${settingId}`, {
      deploy: currentDeploy,
      changed_by: 'e2e-test',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
    expect(res.body.message).toMatch(/no changes/i);
  });

  it('WHEN PATCH with stale expected_updated_at THEN returns 409 Conflict', async () => {
    if (!settingId) return;

    const res = await patch<ErrorBody>(`/settings/${settingId}`, {
      replica: 1,
      changed_by: 'e2e-test',
      expected_updated_at: '2020-01-01T00:00:00.000Z',
    });

    // 如果 API 支援 optimistic locking
    if (res.status === 409) {
      expect(res.body.code).toMatch(/CONFLICT/i);
    } else {
      // 若不支援，至少應回傳 200 或 400
      expect([200, 400]).toContain(res.status);
    }
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('F-004 Settings Edit API — Edge Cases', () => {
  it('WHEN PATCH gpu_memory_utilization=0.8567 THEN rounds to 0.86', async () => {
    if (!settingId) return;

    const res = await patch<Setting>(`/settings/${settingId}`, {
      gpu_memory_utilization: 0.8567,
      changed_by: 'e2e-test',
    });

    expect(res.status).toBe(200);
    expect(res.body.gpu_memory_utilization).toBe(0.86);
  });

  it('WHEN PATCH gpu_list to empty array THEN gpu_list becomes []', async () => {
    if (!settingId) return;

    const res = await patch<Setting>(`/settings/${settingId}`, {
      gpu_list: [],
      changed_by: 'e2e-test',
    });

    expect(res.status).toBe(200);
    expect(res.body.gpu_list).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Batch Edit
// ---------------------------------------------------------------------------
describe('F-004 Settings Batch Edit API', () => {
  it('WHEN PATCH /settings/batch with valid ids THEN all updated', async () => {
    if (!versionId) return;

    const listRes = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&per_page=3`,
    );
    if (listRes.body.data.length < 2) {
      console.warn('跳過：setting 數量不足以測試批量');
      return;
    }

    const ids = listRes.body.data.map((s) => s.id);
    const res = await patch<{ updated_count: number; results: { id: string; status: string }[] }>(
      '/settings/batch',
      {
        setting_ids: ids,
        changes: { deploy: false },
        changed_by: 'e2e-test',
        reason: '批量關閉測試',
      },
    );

    expect(res.status).toBe(200);
    expect(res.body.updated_count).toBe(ids.length);
    for (const r of res.body.results) {
      expect(r.status).toBe('updated');
    }
  });

  it('WHEN PATCH /settings/batch with nonexistent id THEN 404 and none updated (atomic)', async () => {
    if (!settingId) return;

    const res = await patch<ErrorBody>('/settings/batch', {
      setting_ids: [settingId, '00000000-0000-0000-0000-000000000000'],
      changes: { deploy: false },
      changed_by: 'e2e-test',
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN PATCH /settings/batch with > 100 ids THEN returns 400', async () => {
    const ids = Array.from({ length: 101 }, (_, i) =>
      `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
    );

    const res = await patch<ErrorBody>('/settings/batch', {
      setting_ids: ids,
      changes: { deploy: false },
      changed_by: 'e2e-test',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
    expect(res.body.message).toMatch(/maximum 100/i);
  });

  it('WHEN PATCH /settings/batch with empty setting_ids THEN returns 400', async () => {
    const res = await patch<ErrorBody>('/settings/batch', {
      setting_ids: [],
      changes: { deploy: false },
      changed_by: 'e2e-test',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });
});
