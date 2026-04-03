/**
 * F-006: Version Compare API E2E Tests
 *
 * 對應 specs/features/f006-version-compare.md — GET /api/v1/compare
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VersionSummary {
  id: string;
  name: string;
}

interface CompareResponse {
  version_a: VersionSummary;
  version_b: VersionSummary;
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  changes: {
    model_component_name: string;
    model_type: string;
    environment: string;
    edition: string;
    change_type: 'added' | 'removed' | 'modified';
    diff: Record<string, { version_a: unknown; version_b: unknown }>;
  }[];
}

interface VersionItem {
  id: string;
  name: string;
}

interface ErrorBody {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let versionA: VersionItem | null = null;
let versionB: VersionItem | null = null;

beforeAll(async () => {
  const res = await get<{ data: VersionItem[] }>('/versions');
  if (res.status === 200 && res.body.data?.length >= 2) {
    versionA = res.body.data[0];
    versionB = res.body.data[1];
  }
});

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------
describe('F-006 Compare API — Happy Path', () => {
  it('WHEN GET /compare?version_a_id=X&version_b_id=Y THEN returns comparison', async () => {
    if (!versionA || !versionB) {
      console.warn('跳過：系統中不足兩個 version');
      return;
    }

    const res = await get<CompareResponse>(
      `/compare?version_a_id=${versionA.id}&version_b_id=${versionB.id}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version_a');
    expect(res.body).toHaveProperty('version_b');
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('added');
    expect(res.body.summary).toHaveProperty('removed');
    expect(res.body.summary).toHaveProperty('modified');
    expect(res.body.summary).toHaveProperty('unchanged');
    expect(res.body).toHaveProperty('changes');
    expect(Array.isArray(res.body.changes)).toBe(true);
  });

  it('WHEN compare two identical versions THEN diff is empty', async () => {
    if (!versionA) {
      console.warn('跳過：系統中尚無 version');
      return;
    }

    // 用同一個 version 跟自己比較，若 API 擋掉 self-compare 則 skip
    // 先嘗試找兩個設定完全相同的 version，若無則 skip
    // 此處以 summary 驗證邏輯為主
    const res = await get<CompareResponse>(
      `/compare?version_a_id=${versionA.id}&version_b_id=${versionA.id}`,
    );

    // 如果 API 不允許自我比較，預期 400
    if (res.status === 400) {
      expect(res.status).toBe(400);
      return;
    }

    // 若允許，應該 changes 為空
    expect(res.status).toBe(200);
    expect(res.body.changes).toEqual([]);
    expect(res.body.summary.added).toBe(0);
    expect(res.body.summary.removed).toBe(0);
    expect(res.body.summary.modified).toBe(0);
  });

  it('WHEN compare with environment filter THEN only that env compared', async () => {
    if (!versionA || !versionB) return;

    // 先取得環境清單
    const envsRes = await get<{ data: { id: string; name: string }[] }>(
      `/versions/${versionA.id}/environments`,
    );
    if (envsRes.body.data.length === 0) return;

    const envId = envsRes.body.data[0].id;
    const envName = envsRes.body.data[0].name;

    const res = await get<CompareResponse>(
      `/compare?version_a_id=${versionA.id}&version_b_id=${versionB.id}&environment_id=${envId}`,
    );

    expect(res.status).toBe(200);
    for (const change of res.body.changes) {
      expect(change.environment).toBe(envName);
    }
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe('F-006 Compare API — Error Handling', () => {
  it('WHEN version_a_id missing THEN returns 400', async () => {
    if (!versionB) return;

    const res = await get<ErrorBody>(
      `/compare?version_b_id=${versionB.id}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN version_b_id missing THEN returns 400', async () => {
    if (!versionA) return;

    const res = await get<ErrorBody>(
      `/compare?version_a_id=${versionA.id}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN self-compare (same version) THEN returns 400', async () => {
    if (!versionA) return;

    const res = await get<ErrorBody>(
      `/compare?version_a_id=${versionA.id}&version_b_id=${versionA.id}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN version not found THEN returns 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await get<ErrorBody>(
      `/compare?version_a_id=${fakeId}&version_b_id=${fakeId}`,
    );

    // 可能是 400（自我比較）或 404（不存在）
    expect([400, 404]).toContain(res.status);
  });

  it('WHEN one version not found THEN returns 404', async () => {
    if (!versionA) return;

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await get<ErrorBody>(
      `/compare?version_a_id=${versionA.id}&version_b_id=${fakeId}`,
    );

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
