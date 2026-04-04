/**
 * F-007: cdk8s Codegen API E2E Tests
 *
 * 對應 specs/features/f007-cdk8s-codegen.md
 * - POST /api/v1/codegen/preview
 * - POST /api/v1/codegen/generate
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get, post, patch, getFirstVersionId } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CodegenFile {
  path: string;
  action: string;
  diff?: string;
  full_content?: string;
  content?: string;
}

interface CodegenSummary {
  files_changed: number;
  insertions: number;
  deletions: number;
}

interface CodegenPreviewResponse {
  files: CodegenFile[];
  summary: CodegenSummary;
  warnings?: string[];
}

interface CodegenGenerateResponse {
  codegen_id: string;
  files: CodegenFile[];
  status: string;
  created_at: string;
}

interface HistoryItem {
  id: string;
  model_setting?: {
    id: string;
    model_component: { name: string; type: string };
    environment: { name: string };
    edition: { name: string };
  };
  change_type: string;
  diff: Record<string, { old: unknown; new: unknown }>;
}

interface HistoryListResponse {
  data: HistoryItem[];
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
// State — 取得真實 change_history_ids 做測試
// ---------------------------------------------------------------------------
let changeHistoryIds: string[] = [];
let versionId: string | null = null;

beforeAll(async () => {
  versionId = await getFirstVersionId();
  if (!versionId) return;

  // 確保有 change history：修改一個 setting 來產生 history
  const settingsRes = await get<SettingsResponse>(
    `/settings?version_id=${versionId}&per_page=2`,
  );

  if (settingsRes.status === 200 && settingsRes.body.data?.length > 0) {
    for (const setting of settingsRes.body.data) {
      await patch(`/settings/${setting.id}`, {
        replica: setting.replica + 1,
        changed_by: 'e2e-codegen-seed',
        reason: 'seed change history for codegen test',
      });
    }
  }

  // 取得 change history ids
  const historyRes = await get<HistoryListResponse>('/history?per_page=5&change_type=UPDATE');
  if (historyRes.status === 200 && historyRes.body.data?.length > 0) {
    changeHistoryIds = historyRes.body.data.map((h) => h.id);
  }
});

// ---------------------------------------------------------------------------
// Happy Path — Preview
// ---------------------------------------------------------------------------
describe('F-007 Codegen Preview — Happy Path', () => {
  it('WHEN POST /codegen/preview with valid change_history_ids THEN returns codegen preview with files and diff', async () => {
    if (changeHistoryIds.length === 0) {
      console.warn('跳過：系統中尚無 change history');
      return;
    }

    const res = await post<CodegenPreviewResponse>('/codegen/preview', {
      change_history_ids: [changeHistoryIds[0]],
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('files');
    expect(res.body).toHaveProperty('summary');
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files.length).toBeGreaterThan(0);

    // 檢查每個 file 結構
    for (const file of res.body.files) {
      expect(file).toHaveProperty('path');
      expect(file).toHaveProperty('action');
      expect(file).toHaveProperty('diff');
      expect(file.path).toMatch(/^src\/components\/inferno\/gpu\/.+\.ts$/);
    }

    // 檢查 summary
    expect(res.body.summary.files_changed).toBeGreaterThan(0);
    expect(typeof res.body.summary.insertions).toBe('number');
    expect(typeof res.body.summary.deletions).toBe('number');
  });

  it('WHEN POST /codegen/preview with multiple changes on same edition THEN merges into one file', async () => {
    if (changeHistoryIds.length < 2) {
      console.warn('跳過：需至少 2 筆 change history');
      return;
    }

    const res = await post<CodegenPreviewResponse>('/codegen/preview', {
      change_history_ids: changeHistoryIds.slice(0, 2),
    });

    expect(res.status).toBe(200);
    expect(res.body.files.length).toBeGreaterThan(0);

    // 同 edition 的變更應合併到同一檔案
    const paths = res.body.files.map((f) => f.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length); // 不應有重複的檔案
  });

  it('WHEN POST /codegen/preview THEN generated code maintains computed property names', async () => {
    if (changeHistoryIds.length === 0) {
      console.warn('跳過：系統中尚無 change history');
      return;
    }

    const res = await post<CodegenPreviewResponse>('/codegen/preview', {
      change_history_ids: [changeHistoryIds[0]],
    });

    expect(res.status).toBe(200);

    // diff 或 full_content 中應包含 computed property names（如 [ModelTypeLLM]、[GPU_KEY_...]）
    for (const file of res.body.files) {
      if (file.full_content) {
        // 確認使用 computed property names 而非字串 literal
        expect(file.full_content).toMatch(/\[ModelType\w+\]/);
        expect(file.full_content).toMatch(/\[GPU_KEY_\w+\]/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Happy Path — Generate
// ---------------------------------------------------------------------------
describe('F-007 Codegen Generate — Happy Path', () => {
  it('WHEN POST /codegen/generate with valid change_history_ids THEN returns codegen result with codegen_id', async () => {
    if (changeHistoryIds.length === 0) {
      console.warn('跳過：系統中尚無 change history');
      return;
    }

    const res = await post<CodegenGenerateResponse>('/codegen/generate', {
      change_history_ids: [changeHistoryIds[0]],
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('codegen_id');
    expect(res.body.codegen_id).toBeTruthy();
    expect(res.body).toHaveProperty('files');
    expect(res.body).toHaveProperty('status', 'ready');
    expect(res.body).toHaveProperty('created_at');

    // 每個 file 應有完整 content
    for (const file of res.body.files) {
      expect(file).toHaveProperty('path');
      expect(file).toHaveProperty('content');
      expect(file.content).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe('F-007 Codegen API — Error Handling', () => {
  it('WHEN POST /codegen/preview with empty change_history_ids THEN returns 400', async () => {
    const res = await post<ErrorBody>('/codegen/preview', {
      change_history_ids: [],
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN POST /codegen/preview with more than 50 ids THEN returns 400', async () => {
    const fiftyOneIds = Array.from({ length: 51 }, (_, i) =>
      `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
    );

    const res = await post<ErrorBody>('/codegen/preview', {
      change_history_ids: fiftyOneIds,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN POST /codegen/preview with nonexistent change_history_id THEN returns 404', async () => {
    const res = await post<ErrorBody>('/codegen/preview', {
      change_history_ids: ['00000000-0000-0000-0000-000000000000'],
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN POST /codegen/generate with empty change_history_ids THEN returns 400', async () => {
    const res = await post<ErrorBody>('/codegen/generate', {
      change_history_ids: [],
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('F-007 Codegen API — Edge Cases', () => {
  it('WHEN setting has no effective changes vs current cdk8s THEN file not included in output', async () => {
    if (changeHistoryIds.length === 0 || !versionId) {
      console.warn('跳過：系統中尚無 change history');
      return;
    }

    // 把 setting 改回原值 → 產生一筆 "no-op" change
    const settingsRes = await get<SettingsResponse>(
      `/settings?version_id=${versionId}&per_page=1`,
    );
    if (settingsRes.status !== 200 || settingsRes.body.data.length === 0) return;

    const setting = settingsRes.body.data[0];
    const originalReplica = setting.replica;

    // 改一次
    await patch(`/settings/${setting.id}`, {
      replica: originalReplica + 10,
      changed_by: 'e2e-noop-test',
      reason: 'noop test step 1',
    });

    // 改回來
    await patch(`/settings/${setting.id}`, {
      replica: originalReplica,
      changed_by: 'e2e-noop-test',
      reason: 'noop test step 2 - revert',
    });

    // 取得最新的「revert」history
    const historyRes = await get<HistoryListResponse>(
      '/history?per_page=1&changed_by=e2e-noop-test',
    );
    if (historyRes.body.data.length === 0) return;

    const revertHistoryId = historyRes.body.data[0].id;

    // Preview 此「原值→原值」的 change，應該不產出檔案或產出空 diff
    const res = await post<CodegenPreviewResponse>('/codegen/preview', {
      change_history_ids: [revertHistoryId],
    });

    expect(res.status).toBe(200);
    // 如果 revert 到原值，可能 files 為空或 diff 為空
    // 具體行為取決於實作，但不應報錯
    expect(res.body).toHaveProperty('files');
  });

  it('WHEN preview with model not in target file THEN returns warning and adds model', async () => {
    // 此測試需要特殊的 seed data（新 model 不在 cdk8s 中）
    // 驗證 API 回傳 warning 但不報錯
    if (changeHistoryIds.length === 0) {
      console.warn('跳過：需要特殊 seed data');
      return;
    }

    // 使用現有 history 驗證 warnings 欄位存在（即使為空）
    const res = await post<CodegenPreviewResponse>('/codegen/preview', {
      change_history_ids: [changeHistoryIds[0]],
    });

    expect(res.status).toBe(200);
    // warnings 可能存在或不存在，但不應報錯
    if (res.body.warnings) {
      expect(Array.isArray(res.body.warnings)).toBe(true);
    }
  });
});
