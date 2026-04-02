/**
 * F-003 (部分): Editions API E2E Tests
 *
 * 對應 specs/features/f003-settings-view.md — GET /api/v1/versions/:versionId/editions
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get, getFirstVersionId } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Edition {
  id: string;
  name: string;
}

interface EditionsResponse {
  data: Edition[];
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
describe('F-003 Editions API', () => {
  it('WHEN GET /api/v1/versions/:versionId/editions THEN 回傳 200 且包含 data 陣列', async () => {
    if (!versionId) {
      console.warn('跳過：系統中尚無 version，無法測試 editions');
      return;
    }

    const res = await get<EditionsResponse>(`/versions/${versionId}/editions`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('WHEN 有匯入資料 THEN editions 包含 std, pro 等已知 edition', async () => {
    if (!versionId) return;

    const res = await get<EditionsResponse>(`/versions/${versionId}/editions`);

    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const names = res.body.data.map((e) => e.name);
      const knownEditions = ['std', 'pro', '2026-pro'];
      const matched = knownEditions.filter((ed) => names.includes(ed));
      expect(matched.length).toBeGreaterThan(0);
    }
  });

  it('WHEN 每個 edition THEN 包含 id 和 name 欄位', async () => {
    if (!versionId) return;

    const res = await get<EditionsResponse>(`/versions/${versionId}/editions`);

    expect(res.status).toBe(200);
    for (const edition of res.body.data) {
      expect(edition).toHaveProperty('id');
      expect(edition).toHaveProperty('name');
      expect(typeof edition.id).toBe('string');
      expect(typeof edition.name).toBe('string');
      expect(edition.id.length).toBeGreaterThan(0);
      expect(edition.name.length).toBeGreaterThan(0);
    }
  });

  it('WHEN versionId 不存在 THEN 回傳 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await get<{ code: string }>(`/versions/${fakeId}/editions`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
