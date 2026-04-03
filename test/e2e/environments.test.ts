/**
 * F-003 (部分): Environments API E2E Tests
 *
 * 對應 specs/features/f003-settings-view.md — GET /api/v1/versions/:versionId/environments
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get, getFirstVersionId } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Environment {
  id: string;
  name: string;
}

interface EnvironmentsResponse {
  data: Environment[];
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let versionId: string | null = null;

beforeAll(async () => {
  versionId = await getFirstVersionId();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('F-003 Environments API', () => {
  it('WHEN GET /api/v1/versions/:versionId/environments THEN 回傳 200 且包含 data 陣列', async () => {
    if (!versionId) {
      console.warn('跳過：系統中尚無 version，無法測試 environments');
      return;
    }

    const res = await get<EnvironmentsResponse>(`/versions/${versionId}/environments`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('WHEN 有匯入資料 THEN environments 包含 dev, prod, dogfood 等已知環境', async () => {
    if (!versionId) return;

    const res = await get<EnvironmentsResponse>(`/versions/${versionId}/environments`);

    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const names = res.body.data.map((e) => e.name);
      // 至少應包含部分已知環境
      const knownEnvs = ['dev', 'prod', 'dogfood'];
      const matched = knownEnvs.filter((env) => names.includes(env));
      expect(matched.length).toBeGreaterThan(0);
    }
  });

  it('WHEN 每個 environment THEN 包含 id 和 name 欄位', async () => {
    if (!versionId) return;

    const res = await get<EnvironmentsResponse>(`/versions/${versionId}/environments`);

    expect(res.status).toBe(200);
    for (const env of res.body.data) {
      expect(env).toHaveProperty('id');
      expect(env).toHaveProperty('name');
      expect(typeof env.id).toBe('string');
      expect(typeof env.name).toBe('string');
      expect(env.id.length).toBeGreaterThan(0);
      expect(env.name.length).toBeGreaterThan(0);
    }
  });

  it('WHEN versionId 不存在 THEN 回傳 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await get<{ code: string }>(`/versions/${fakeId}/environments`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
