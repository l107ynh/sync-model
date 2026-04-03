/**
 * F-002: cdk8s 設定檔解析與匯入 E2E Tests
 *
 * 對應 specs/features/f002-cdk8s-parser.md
 */
import { describe, it, expect, afterAll } from 'vitest';
import { get, post, del } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ImportSuccess {
  status: 'success';
  version: { id: string; name: string };
  summary: {
    environments_count: number;
    editions_count: number;
    model_components_count: number;
    model_settings_count: number;
    environments: string[];
    editions: string[];
    model_types: Record<string, number>;
  };
  warnings: string[];
}

interface ImportDryRun {
  status: 'dry_run';
  summary: {
    environments_count: number;
    editions_count: number;
    model_components_count: number;
    model_settings_count: number;
    environments: string[];
    editions: string[];
    model_types: Record<string, number>;
  };
  warnings: string[];
}

interface ErrorBody {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Cleanup：測試結束後清除測試資料
// ---------------------------------------------------------------------------
const createdVersionNames: string[] = [];

afterAll(async () => {
  // 嘗試清除測試用 versions（如果有 DELETE API 可用）
  for (const name of createdVersionNames) {
    try {
      // 先找到 version id
      const versionsRes = await get<{ data: { id: string; name: string }[] }>('/versions?per_page=100');
      const match = versionsRes.body.data?.find((v) => v.name === name);
      if (match) {
        await del(`/versions/${match.id}`);
      }
    } catch {
      // 清除失敗不影響測試結果
    }
  }
});

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------
describe('F-002 Import cdk8s', () => {
  // TC-007: Dry run 先跑，不會汙染資料庫
  it('WHEN POST /import/cdk8s with dry_run=true THEN 回傳 dry_run 且不寫入 DB', async () => {
    const res = await post<ImportDryRun>('/import/cdk8s', {
      version_name: 'e2e-dry-run',
      dry_run: true,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dry_run');
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.environments_count).toBeGreaterThanOrEqual(0);
    expect(res.body.summary.editions_count).toBeGreaterThanOrEqual(0);

    // 確認沒有寫入 DB
    const versionsRes = await get<{ data: { name: string }[] }>('/versions?per_page=100');
    const found = versionsRes.body.data?.some((v) => v.name === 'e2e-dry-run');
    expect(found).toBe(false);
  });

  // TC-006: 成功匯入
  it('WHEN POST /import/cdk8s with valid version_name THEN 回傳 success 且 summary 完整', async () => {
    const versionName = `e2e-import-${Date.now()}`;
    createdVersionNames.push(versionName);

    const res = await post<ImportSuccess>('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.version).toBeDefined();
    expect(res.body.version.id).toBeDefined();
    expect(res.body.version.name).toBe(versionName);

    // Summary 檢查
    const s = res.body.summary;
    expect(s.environments_count).toBeGreaterThan(0);
    expect(s.editions_count).toBeGreaterThan(0);
    expect(s.model_components_count).toBeGreaterThan(0);
    expect(s.model_settings_count).toBeGreaterThan(0);
    expect(Array.isArray(s.environments)).toBe(true);
    expect(Array.isArray(s.editions)).toBe(true);
    expect(typeof s.model_types).toBe('object');
  });

  // TC-008: 指定 branch
  it('WHEN POST /import/cdk8s with branch=main THEN 從指定 branch 匯入成功', async () => {
    const versionName = `e2e-branch-${Date.now()}`;
    createdVersionNames.push(versionName);

    const res = await post<ImportSuccess>('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  // TC-006 補充：匯入後 environments 包含已知環境
  it('WHEN 匯入成功 THEN summary.environments 包含 dev, prod, dogfood', async () => {
    const versionName = `e2e-envcheck-${Date.now()}`;
    createdVersionNames.push(versionName);

    const res = await post<ImportSuccess>('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });

    expect(res.status).toBe(200);
    const envs = res.body.summary.environments;
    expect(envs).toContain('dev');
    expect(envs).toContain('prod');
    expect(envs).toContain('dogfood');
  });

  // TC-006 補充：匯入後 editions 包含已知 edition
  it('WHEN 匯入成功 THEN summary.editions 包含 std, pro', async () => {
    const versionName = `e2e-edcheck-${Date.now()}`;
    createdVersionNames.push(versionName);

    const res = await post<ImportSuccess>('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });

    expect(res.status).toBe(200);
    const editions = res.body.summary.editions;
    expect(editions).toContain('std');
    expect(editions).toContain('pro');
  });

  // TC-006 補充：匯入後 model_types 包含已知類型
  it('WHEN 匯入成功 THEN summary.model_types 包含 LLM, ASR, VLM', async () => {
    const versionName = `e2e-typecheck-${Date.now()}`;
    createdVersionNames.push(versionName);

    const res = await post<ImportSuccess>('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });

    expect(res.status).toBe(200);
    const types = res.body.summary.model_types;
    expect(types).toHaveProperty('LLM');
    expect(types).toHaveProperty('ASR');
    expect(types).toHaveProperty('VLM');
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe('F-002 Import cdk8s — Error Handling', () => {
  // TC-009: Duplicate version_name
  it('WHEN POST /import/cdk8s with 已存在的 version_name THEN 回傳 409 DUPLICATE', async () => {
    const versionName = `e2e-dup-${Date.now()}`;
    createdVersionNames.push(versionName);

    // 先匯入一次
    const first = await post<ImportSuccess>('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });
    expect(first.status).toBe(200);

    // 再匯入同一 version_name
    const second = await post<ErrorBody>('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('DUPLICATE');
  });

  // TC-010: version_name 為空
  it('WHEN POST /import/cdk8s with version_name="" THEN 回傳 400 INVALID_INPUT', async () => {
    const res = await post<ErrorBody>('/import/cdk8s', {
      version_name: '',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  // TC-011: version_name 缺失
  it('WHEN POST /import/cdk8s without version_name THEN 回傳 400 INVALID_INPUT', async () => {
    const res = await post<ErrorBody>('/import/cdk8s', {});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  // TC-010 補充：version_name 過長
  it('WHEN POST /import/cdk8s with version_name 超過 50 字元 THEN 回傳 400 INVALID_INPUT', async () => {
    const longName = 'a'.repeat(51);
    const res = await post<ErrorBody>('/import/cdk8s', {
      version_name: longName,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('F-002 Import cdk8s — Edge Cases', () => {
  // TC-013: 部分解析失敗
  it('WHEN 匯入成功 THEN warnings 為陣列（可能有解析警告）', async () => {
    const versionName = `e2e-warn-${Date.now()}`;
    createdVersionNames.push(versionName);

    const res = await post<ImportSuccess>('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.warnings)).toBe(true);
  });

  // TC-014: 匯入後資料完整性
  it('WHEN 匯入成功 THEN 透過 settings API 可查到完整資料', async () => {
    const versionName = `e2e-integrity-${Date.now()}`;
    createdVersionNames.push(versionName);

    const importRes = await post<ImportSuccess>('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });
    expect(importRes.status).toBe(200);

    const versionId = importRes.body.version.id;
    const settingsRes = await get<{
      data: {
        model_component: { id: string; name: string; type: string };
        environment: { id: string; name: string };
        edition: { id: string; name: string };
        deploy: boolean;
        replica: number;
        gpu_memory_utilization: number | null;
      }[];
      pagination: { total: number };
    }>(`/settings?version_id=${versionId}`);

    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.pagination.total).toBeGreaterThan(0);

    // 驗證每筆 setting 資料完整
    for (const setting of settingsRes.body.data) {
      expect(setting.model_component).toBeDefined();
      expect(setting.model_component.id).toBeDefined();
      expect(setting.model_component.name).toBeDefined();
      expect(setting.model_component.type).toBeDefined();
      expect(setting.environment).toBeDefined();
      expect(setting.environment.id).toBeDefined();
      expect(setting.edition).toBeDefined();
      expect(setting.edition.id).toBeDefined();
      expect(typeof setting.deploy).toBe('boolean');
      expect(typeof setting.replica).toBe('number');
      expect(setting.replica).toBeGreaterThanOrEqual(0);
      if (setting.gpu_memory_utilization !== null) {
        expect(setting.gpu_memory_utilization).toBeGreaterThanOrEqual(0);
        expect(setting.gpu_memory_utilization).toBeLessThanOrEqual(1);
      }
    }
  });
});
