/**
 * F-005: Change History API E2E Tests
 *
 * 對應 specs/features/f005-change-history.md — GET /api/v1/history
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get, patch, getFirstVersionId } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HistoryItem {
  id: string;
  model_setting?: {
    id: string;
    model_component: { name: string; type: string };
    environment: { name: string };
    edition: { name: string };
  };
  changed_by: string;
  change_type: string;
  diff: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  created_at: string;
}

interface HistoryListResponse {
  data: HistoryItem[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

interface Setting {
  id: string;
  deploy: boolean;
  replica: number;
  updated_at: string;
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
let settingId: string | null = null;
let versionId: string | null = null;

beforeAll(async () => {
  versionId = await getFirstVersionId();
  if (!versionId) return;

  const res = await get<SettingsResponse>(`/settings?version_id=${versionId}&per_page=1`);
  if (res.status === 200 && res.body.data?.length > 0) {
    settingId = res.body.data[0].id;
  }

  // 確保有至少一筆 history：修改一次 setting
  if (settingId) {
    await patch(`/settings/${settingId}`, {
      replica: 1,
      changed_by: 'e2e-history-seed',
      reason: 'seed history for test',
    });
  }
});

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------
describe('F-005 History API — Happy Path', () => {
  it('WHEN GET /history THEN returns change history list sorted by created_at desc', async () => {
    const res = await get<HistoryListResponse>('/history');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);

    // 驗證倒序
    if (res.body.data.length >= 2) {
      const dates = res.body.data.map((h) => new Date(h.created_at).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    }
  });

  it('WHEN GET /settings/:id/history THEN returns filtered history for that setting', async () => {
    if (!settingId) return;

    const res = await get<HistoryListResponse>(
      `/settings/${settingId}/history`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('WHEN GET /history?change_type=UPDATE THEN returns only UPDATE records', async () => {
    const res = await get<HistoryListResponse>('/history?change_type=UPDATE');

    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect(item.change_type).toBe('UPDATE');
    }
  });

  it('WHEN GET /history?from_date=...&to_date=... THEN returns date-range filtered', async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 24h ago
    const to = now.toISOString();

    const res = await get<HistoryListResponse>(
      `/history?from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}`,
    );

    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      const ts = new Date(item.created_at).getTime();
      expect(ts).toBeGreaterThanOrEqual(new Date(from).getTime());
      expect(ts).toBeLessThanOrEqual(new Date(to).getTime());
    }
  });

  it('WHEN GET /history/:id THEN returns single history with full diff', async () => {
    // 先拿一筆 history id
    const listRes = await get<HistoryListResponse>('/history?per_page=1');
    if (listRes.body.data.length === 0) {
      console.warn('跳過：系統中尚無 history');
      return;
    }

    const historyId = listRes.body.data[0].id;
    const res = await get<HistoryItem>(`/history/${historyId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', historyId);
    expect(res.body).toHaveProperty('changed_by');
    expect(res.body).toHaveProperty('change_type');
    expect(res.body).toHaveProperty('diff');
    expect(res.body).toHaveProperty('created_at');
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
describe('F-005 History API — Pagination', () => {
  it('WHEN GET /history?page=1&per_page=5 THEN pagination fields correct', async () => {
    const res = await get<HistoryListResponse>('/history?page=1&per_page=5');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.per_page).toBe(5);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(res.body.pagination.total_pages).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe('F-005 History API — Error Handling', () => {
  it('WHEN GET /settings/:id/history with nonexistent setting THEN returns 404', async () => {
    const res = await get<ErrorBody>(
      '/settings/00000000-0000-0000-0000-000000000000/history',
    );

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN GET /history/:id with nonexistent history THEN returns 404', async () => {
    const res = await get<ErrorBody>(
      '/history/00000000-0000-0000-0000-000000000000',
    );

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('F-005 History API — Edge Cases', () => {
  it('WHEN GET /history?changed_by=nonexistent THEN returns empty data', async () => {
    const res = await get<HistoryListResponse>(
      '/history?changed_by=nonexistent-user-xyz',
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });
});
