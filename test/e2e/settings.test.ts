/**
 * F-003: Settings API E2E Tests
 *
 * 對應 specs/features/f003-settings-view.md — GET /api/v1/settings
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get, getFirstVersionId } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ModelComponent {
  id: string;
  name: string;
  type: string;
  component_version: string;
  image: string;
}

interface Setting {
  id: string;
  model_component: ModelComponent;
  environment: { id: string; name: string };
  edition: { id: string; name: string };
  deploy: boolean;
  gpu_list: string[];
  replica: number;
  gpu_memory_utilization: number | null;
  extra_settings: Record<string, unknown>;
  updated_at: string;
}

interface SettingsResponse {
  data: Setting[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  filters: {
    available_types: string[];
    available_environments: { id: string; name: string }[];
    available_editions: { id: string; name: string }[];
  };
}

interface ErrorBody {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let versionId: string | null = null;

beforeAll(async () => {
  versionId = await getFirstVersionId();
});

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------
describe('F-003 Settings API — Happy Path', () => {
  it('WHEN GET /settings?version_id={id} THEN 回傳 200 且包含 data, pagination, filters', async () => {
    if (!versionId) {
      console.warn('跳過：系統中尚無 version');
      return;
    }

    const res = await get<SettingsResponse>(`/settings?version_id=${versionId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body).toHaveProperty('filters');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('WHEN GET /settings?version_id={id} THEN 每筆 setting 包含完整欄位', async () => {
    if (!versionId) return;

    const res = await get<SettingsResponse>(`/settings?version_id=${versionId}`);

    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const s = res.body.data[0];
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('model_component');
      expect(s).toHaveProperty('environment');
      expect(s).toHaveProperty('edition');
      expect(s).toHaveProperty('deploy');
      expect(s).toHaveProperty('gpu_list');
      expect(s).toHaveProperty('replica');
      expect(s).toHaveProperty('gpu_memory_utilization');

      // model_component 結構
      expect(s.model_component).toHaveProperty('id');
      expect(s.model_component).toHaveProperty('name');
      expect(s.model_component).toHaveProperty('type');
    }
  });

  it('WHEN GET /settings?version_id={id}&model_type=ASR THEN 所有結果的 type 為 ASR', async () => {
    if (!versionId) return;

    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&model_type=ASR`,
    );

    expect(res.status).toBe(200);
    for (const s of res.body.data) {
      expect(s.model_component.type).toBe('ASR');
    }
  });

  it('WHEN GET /settings?version_id={id}&deploy_only=true THEN 所有結果的 deploy 為 true', async () => {
    if (!versionId) return;

    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&deploy_only=true`,
    );

    expect(res.status).toBe(200);
    for (const s of res.body.data) {
      expect(s.deploy).toBe(true);
    }
  });

  it('WHEN GET /settings?version_id={id}&search=asr THEN 所有結果的 model name 包含 asr（不分大小寫）', async () => {
    if (!versionId) return;

    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&search=asr`,
    );

    expect(res.status).toBe(200);
    for (const s of res.body.data) {
      expect(s.model_component.name.toLowerCase()).toContain('asr');
    }
  });

  it('WHEN GET /settings?version_id={id}&sort_by=name&sort_order=asc THEN 按 name 升序排列', async () => {
    if (!versionId) return;

    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&sort_by=name&sort_order=asc`,
    );

    expect(res.status).toBe(200);
    const names = res.body.data.map((s) => s.model_component.name.toLowerCase());
    for (let i = 1; i < names.length; i++) {
      expect(names[i - 1].localeCompare(names[i])).toBeLessThanOrEqual(0);
    }
  });

  it('WHEN GET /settings?version_id={id}&sort_by=name&sort_order=desc THEN 按 name 降序排列', async () => {
    if (!versionId) return;

    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&sort_by=name&sort_order=desc`,
    );

    expect(res.status).toBe(200);
    const names = res.body.data.map((s) => s.model_component.name.toLowerCase());
    for (let i = 1; i < names.length; i++) {
      expect(names[i - 1].localeCompare(names[i])).toBeGreaterThanOrEqual(0);
    }
  });

  it('WHEN GET /settings?version_id={id}&environment_id={envId} THEN 只回傳該環境的設定', async () => {
    if (!versionId) return;

    // 先取得環境清單
    const envsRes = await get<{ data: { id: string; name: string }[] }>(
      `/versions/${versionId}/environments`,
    );
    if (envsRes.body.data.length === 0) return;

    const envId = envsRes.body.data[0].id;
    const envName = envsRes.body.data[0].name;

    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&environment_id=${envId}`,
    );

    expect(res.status).toBe(200);
    for (const s of res.body.data) {
      expect(s.environment.name).toBe(envName);
    }
  });

  it('WHEN GET /settings?version_id={id}&edition_id={edId} THEN 只回傳該 edition 的設定', async () => {
    if (!versionId) return;

    const edsRes = await get<{ data: { id: string; name: string }[] }>(
      `/versions/${versionId}/editions`,
    );
    if (edsRes.body.data.length === 0) return;

    const edId = edsRes.body.data[0].id;
    const edName = edsRes.body.data[0].name;

    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&edition_id=${edId}`,
    );

    expect(res.status).toBe(200);
    for (const s of res.body.data) {
      expect(s.edition.name).toBe(edName);
    }
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
describe('F-003 Settings API — Pagination', () => {
  it('WHEN GET /settings?version_id={id}&page=1&per_page=5 THEN 最多回傳 5 筆且 pagination 正確', async () => {
    if (!versionId) return;

    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&page=1&per_page=5`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.per_page).toBe(5);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(res.body.pagination.total_pages).toBeGreaterThanOrEqual(0);
  });

  // TC-033: 分頁邊界
  it('WHEN 第二頁資料不足 per_page THEN data.length < per_page 且 pagination 正確', async () => {
    if (!versionId) return;

    // 先查總數
    const allRes = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&per_page=200`,
    );
    const total = allRes.body.pagination.total;
    if (total <= 5) return; // 資料不夠測分頁

    const perPage = Math.ceil(total / 2);
    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&page=2&per_page=${perPage}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(total - perPage);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.total_pages).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Filters metadata
// ---------------------------------------------------------------------------
describe('F-003 Settings API — Filters Metadata', () => {
  it('WHEN GET /settings?version_id={id} THEN filters 包含 available_types, available_environments, available_editions', async () => {
    if (!versionId) return;

    const res = await get<SettingsResponse>(`/settings?version_id=${versionId}`);

    expect(res.status).toBe(200);
    expect(res.body.filters).toHaveProperty('available_types');
    expect(res.body.filters).toHaveProperty('available_environments');
    expect(res.body.filters).toHaveProperty('available_editions');
    expect(Array.isArray(res.body.filters.available_types)).toBe(true);
    expect(Array.isArray(res.body.filters.available_environments)).toBe(true);
    expect(Array.isArray(res.body.filters.available_editions)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe('F-003 Settings API — Error Handling', () => {
  // TC-028: 缺少 version_id
  it('WHEN GET /settings 缺少 version_id THEN 回傳 400 INVALID_INPUT', async () => {
    const res = await get<ErrorBody>('/settings');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  // TC-029: version_id 不存在
  it('WHEN GET /settings?version_id=不存在的UUID THEN 回傳 404 NOT_FOUND', async () => {
    const res = await get<ErrorBody>(
      '/settings?version_id=00000000-0000-0000-0000-000000000000',
    );

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN GET /settings?version_id=invalid-format THEN 回傳 400 INVALID_INPUT', async () => {
    const res = await get<ErrorBody>('/settings?version_id=not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('F-003 Settings API — Edge Cases', () => {
  // TC-032: 多條件篩選無結果
  it('WHEN 多條件篩選組合無匹配結果 THEN 回傳空 data 且 pagination.total=0', async () => {
    if (!versionId) return;

    // 用一個不存在的 model_type 來確保無結果
    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&model_type=NONEXISTENT_TYPE`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  // TC-031: 搜尋無匹配
  it('WHEN search 無匹配 THEN 回傳空 data', async () => {
    if (!versionId) return;

    const res = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&search=zzzznonexistent`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  // Setting detail
  it('WHEN GET /settings/:settingId 不存在 THEN 回傳 404 NOT_FOUND', async () => {
    const res = await get<ErrorBody>(
      '/settings/00000000-0000-0000-0000-000000000000',
    );

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
