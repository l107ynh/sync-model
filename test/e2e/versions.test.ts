/**
 * F-003 (部分): Versions API E2E Tests
 *
 * 對應 specs/features/f003-settings-view.md — GET /api/v1/versions
 */
import { describe, it, expect } from 'vitest';
import { get } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Version {
  id: string;
  name: string;
  description?: string;
  model_components_count: number;
  created_at: string;
  updated_at: string;
}

interface VersionsResponse {
  data: Version[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------
describe('F-003 Versions API', () => {
  // TC-016
  it('WHEN GET /api/v1/versions THEN 回傳 200 且包含 data + pagination', async () => {
    const res = await get<VersionsResponse>('/versions');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('WHEN GET /api/v1/versions THEN 每個 version 包含 id, name, model_components_count, created_at', async () => {
    const res = await get<VersionsResponse>('/versions');

    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const v = res.body.data[0];
      expect(v).toHaveProperty('id');
      expect(v).toHaveProperty('name');
      expect(v).toHaveProperty('model_components_count');
      expect(v).toHaveProperty('created_at');
      expect(typeof v.id).toBe('string');
      expect(typeof v.name).toBe('string');
      expect(typeof v.model_components_count).toBe('number');
    }
  });

  it('WHEN GET /api/v1/versions THEN 按 created_at 倒序排列（最新在最前）', async () => {
    const res = await get<VersionsResponse>('/versions');

    expect(res.status).toBe(200);
    const dates = res.body.data.map((v) => new Date(v.created_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('WHEN GET /api/v1/versions?page=1&per_page=1 THEN 回傳 1 筆且 pagination 正確', async () => {
    const res = await get<VersionsResponse>('/versions?page=1&per_page=1');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.per_page).toBe(1);
  });

  it('WHEN GET /api/v1/versions THEN pagination.total 與 data 長度一致（單頁情境）', async () => {
    const res = await get<VersionsResponse>('/versions?per_page=100');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(res.body.pagination.total);
    expect(res.body.pagination.total_pages).toBe(1);
  });
});
