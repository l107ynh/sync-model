/**
 * F-008: GitLab Merge Request API E2E Tests
 *
 * 對應 specs/features/f008-gitlab-mr.md
 * - POST /api/v1/merge-requests
 * - GET  /api/v1/merge-requests
 * - GET  /api/v1/merge-requests/:mrId
 * - POST /api/v1/merge-requests/:mrId/sync-status
 *
 * 注意：E2E 測試依賴 mock GitLab API 或真實 GitLab 測試環境。
 * GitLab API 呼叫在測試環境中透過 MSW 或環境變數指向 mock server。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get, post, patch, getFirstVersionId } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MergeRequestResponse {
  id: string;
  gitlab_mr_id: number;
  gitlab_mr_url: string;
  source_branch: string;
  target_branch: string;
  status: string;
  title: string;
  created_by: string;
  created_at: string;
}

interface MergeRequestDetail extends MergeRequestResponse {
  change_history_ids: string[];
  files_changed: Array<{ path: string; action: string }>;
  updated_at: string;
}

interface MergeRequestListResponse {
  data: MergeRequestResponse[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

interface CodegenGenerateResponse {
  codegen_id: string;
  files: Array<{ path: string; content: string }>;
  status: string;
  created_at: string;
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

interface SyncStatusResponse {
  id: string;
  status: string;
  synced_at: string;
}

interface ErrorBody {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let codegenId: string | null = null;
let createdMrId: string | null = null;

beforeAll(async () => {
  const versionId = await getFirstVersionId();
  if (!versionId) return;

  // Seed: 確保有 change history
  const settingsRes = await get<SettingsResponse>(
    `/settings?version_id=${versionId}&per_page=1`,
  );
  if (settingsRes.status === 200 && settingsRes.body.data?.length > 0) {
    const setting = settingsRes.body.data[0];
    await patch(`/settings/${setting.id}`, {
      replica: setting.replica + 1,
      changed_by: 'e2e-mr-seed',
      reason: 'seed for MR test',
    });
  }

  // 取得 change history
  const historyRes = await get<HistoryListResponse>(
    '/history?per_page=1&change_type=UPDATE',
  );
  if (historyRes.status !== 200 || historyRes.body.data.length === 0) return;

  const changeHistoryId = historyRes.body.data[0].id;

  // 產生 codegen result
  const codegenRes = await post<CodegenGenerateResponse>('/codegen/generate', {
    change_history_ids: [changeHistoryId],
  });

  if (codegenRes.status === 200) {
    codegenId = codegenRes.body.codegen_id;
  }
});

// ---------------------------------------------------------------------------
// Happy Path — Create MR
// ---------------------------------------------------------------------------
describe('F-008 Merge Requests — Create', () => {
  it('WHEN POST /merge-requests with valid codegen_id THEN returns MR info with status OPEN', async () => {
    if (!codegenId) {
      console.warn('跳過：無法取得 codegen_id');
      return;
    }

    const res = await post<MergeRequestResponse>('/merge-requests', {
      codegen_id: codegenId,
      created_by: 'e2e-test-user',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('gitlab_mr_id');
    expect(res.body).toHaveProperty('gitlab_mr_url');
    expect(res.body.gitlab_mr_url).toMatch(/^https?:\/\//);
    expect(res.body).toHaveProperty('source_branch');
    expect(res.body.source_branch).toMatch(/^sync-model\//);
    expect(res.body).toHaveProperty('target_branch', 'main');
    expect(res.body).toHaveProperty('status', 'OPEN');
    expect(res.body).toHaveProperty('created_by', 'e2e-test-user');
    expect(res.body).toHaveProperty('created_at');

    createdMrId = res.body.id;
  });

  it('WHEN POST /merge-requests with custom title THEN MR uses that title', async () => {
    if (!codegenId) {
      console.warn('跳過：無法取得 codegen_id');
      return;
    }

    // 需要新的 codegen_id（同一個不能建兩次 MR）
    const historyRes = await get<HistoryListResponse>(
      '/history?per_page=1&change_type=UPDATE',
    );
    if (historyRes.body.data.length === 0) return;

    const newCodegenRes = await post<CodegenGenerateResponse>('/codegen/generate', {
      change_history_ids: [historyRes.body.data[0].id],
    });
    if (newCodegenRes.status !== 200) return;

    const res = await post<MergeRequestResponse>('/merge-requests', {
      codegen_id: newCodegenRes.body.codegen_id,
      title: 'chore: e2e test custom MR title',
      created_by: 'e2e-test-user',
    });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('chore: e2e test custom MR title');
  });
});

// ---------------------------------------------------------------------------
// Happy Path — List & Detail
// ---------------------------------------------------------------------------
describe('F-008 Merge Requests — List & Detail', () => {
  it('WHEN GET /merge-requests THEN returns MR list with pagination', async () => {
    const res = await get<MergeRequestListResponse>('/merge-requests');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const mr = res.body.data[0];
      expect(mr).toHaveProperty('id');
      expect(mr).toHaveProperty('status');
      expect(mr).toHaveProperty('title');
      expect(mr).toHaveProperty('created_by');
    }
  });

  it('WHEN GET /merge-requests?status=OPEN THEN returns only OPEN MRs', async () => {
    const res = await get<MergeRequestListResponse>('/merge-requests?status=OPEN');

    expect(res.status).toBe(200);
    for (const mr of res.body.data) {
      expect(mr.status).toBe('OPEN');
    }
  });

  it('WHEN GET /merge-requests?created_by=e2e-test-user THEN returns filtered results', async () => {
    const res = await get<MergeRequestListResponse>(
      '/merge-requests?created_by=e2e-test-user',
    );

    expect(res.status).toBe(200);
    for (const mr of res.body.data) {
      expect(mr.created_by).toBe('e2e-test-user');
    }
  });

  it('WHEN GET /merge-requests/:id THEN returns MR detail with files_changed', async () => {
    if (!createdMrId) {
      console.warn('跳過：無已建立的 MR');
      return;
    }

    const res = await get<MergeRequestDetail>(`/merge-requests/${createdMrId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdMrId);
    expect(res.body).toHaveProperty('change_history_ids');
    expect(Array.isArray(res.body.change_history_ids)).toBe(true);
    expect(res.body).toHaveProperty('files_changed');
    expect(Array.isArray(res.body.files_changed)).toBe(true);

    for (const file of res.body.files_changed) {
      expect(file).toHaveProperty('path');
      expect(file).toHaveProperty('action');
    }
  });

  it('WHEN GET /merge-requests with pagination THEN respects page and per_page', async () => {
    const res = await get<MergeRequestListResponse>(
      '/merge-requests?page=1&per_page=5',
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.per_page).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Sync Status
// ---------------------------------------------------------------------------
describe('F-008 Merge Requests — Sync Status', () => {
  it('WHEN POST /merge-requests/:id/sync-status THEN returns synced status', async () => {
    if (!createdMrId) {
      console.warn('跳過：無已建立的 MR');
      return;
    }

    const res = await post<SyncStatusResponse>(
      `/merge-requests/${createdMrId}/sync-status`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('status');
    expect(['PENDING', 'OPEN', 'MERGED', 'CLOSED']).toContain(res.body.status);
    expect(res.body).toHaveProperty('synced_at');
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe('F-008 Merge Requests — Error Handling', () => {
  it('WHEN POST /merge-requests with missing codegen_id THEN returns 400', async () => {
    const res = await post<ErrorBody>('/merge-requests', {
      created_by: 'e2e-test-user',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN POST /merge-requests with missing created_by THEN returns 400', async () => {
    const res = await post<ErrorBody>('/merge-requests', {
      codegen_id: '00000000-0000-0000-0000-000000000000',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN POST /merge-requests with nonexistent codegen_id THEN returns 404', async () => {
    const res = await post<ErrorBody>('/merge-requests', {
      codegen_id: '00000000-0000-0000-0000-000000000000',
      created_by: 'e2e-test-user',
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN POST /merge-requests with duplicate codegen_id THEN returns 409', async () => {
    if (!codegenId) {
      console.warn('跳過：無法取得 codegen_id');
      return;
    }

    // codegenId 在 beforeAll 中已用於建立 MR，再次嘗試應得 409
    const res = await post<ErrorBody>('/merge-requests', {
      codegen_id: codegenId,
      created_by: 'e2e-test-user',
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE');
  });

  it('WHEN GET /merge-requests/:id with nonexistent id THEN returns 404', async () => {
    const res = await get<ErrorBody>(
      '/merge-requests/00000000-0000-0000-0000-000000000000',
    );

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN GitLab API fails THEN returns 502 GITLAB_ERROR', async () => {
    // 此測試需要 mock server 模擬 GitLab 失敗
    // 若測試環境的 GitLab mock 未設定失敗場景，此測試可跳過
    // 實際做法：透過環境變數 GITLAB_MOCK_FAIL=true 觸發 mock 回傳錯誤
    if (!process.env.GITLAB_MOCK_FAIL) {
      console.warn('跳過：需設定 GITLAB_MOCK_FAIL=true 環境變數');
      return;
    }

    const historyRes = await get<HistoryListResponse>(
      '/history?per_page=1&change_type=UPDATE',
    );
    if (historyRes.body.data.length === 0) return;

    const codegenRes = await post<CodegenGenerateResponse>('/codegen/generate', {
      change_history_ids: [historyRes.body.data[0].id],
    });
    if (codegenRes.status !== 200) return;

    const res = await post<ErrorBody>('/merge-requests', {
      codegen_id: codegenRes.body.codegen_id,
      created_by: 'e2e-test-user',
    });

    expect(res.status).toBe(502);
    expect(res.body.code).toBe('GITLAB_ERROR');
  });
});
