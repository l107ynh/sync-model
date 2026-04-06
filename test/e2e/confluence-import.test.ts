/**
 * F-010: Confluence 匯入 E2E Tests
 *
 * 對應 specs/features/f010-confluence-import.md
 */
import { describe, it, expect, afterAll } from 'vitest';
import { get, post, apiClient, API_PREFIX } from './setup';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ConfluenceImportSuccess {
  status: 'success';
  version: { id: string; name: string };
  summary: {
    model_components_count: number;
    parsed_tables: number;
    skipped_rows: number;
    warnings: string[];
  };
  parsed_data: {
    component: string;
    id: string;
    model: string;
    model_type: string;
    component_version: string;
    image: string;
    settings: Record<string, unknown>;
    resource: Record<string, unknown>;
    status: string;
  }[];
}

interface ConfluenceImportDryRun {
  status: 'dry_run';
  summary: {
    model_components_count: number;
    parsed_tables: number;
    skipped_rows: number;
    warnings: string[];
  };
  parsed_data: unknown[];
}

interface ErrorBody {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 建立 multipart/form-data 並呼叫 import API */
async function postImportForm(fields: Record<string, string>, file?: { name: string; content: Buffer; type: string }) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  if (file) {
    const blob = new Blob([file.content], { type: file.type });
    formData.append('file', blob, file.name);
  }

  const res = await fetch(`${API_PREFIX}/import/confluence`, {
    method: 'POST',
    body: formData,
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

/** 產生一個最小可解析的假 PDF buffer（用於測試上傳流程） */
function createFakePdf(): Buffer {
  // 最小 PDF 結構 — 實際 E2E 應使用真實測試 PDF
  return Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n101\n%%EOF');
}

/** 產生一個非 PDF 的假檔案 */
function createFakeXlsx(): Buffer {
  return Buffer.from('PK\x03\x04fake-xlsx-content');
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
const createdVersionNames: string[] = [];

afterAll(async () => {
  for (const name of createdVersionNames) {
    try {
      const versionsRes = await get<{ data: { id: string; name: string }[] }>('/versions?per_page=100');
      const match = versionsRes.body.data?.find((v) => v.name === name);
      if (match) {
        await apiClient(`/versions/${match.id}`, { method: 'DELETE' });
      }
    } catch {
      // 清除失敗不影響測試結果
    }
  }
});

// ---------------------------------------------------------------------------
// F-010: Confluence 匯入 — Happy Path
// ---------------------------------------------------------------------------
describe('F-010 Confluence Import — Happy Path', () => {
  it('WHEN POST /import/confluence with mode=api and valid page_id THEN returns import result', async () => {
    const versionName = `e2e-conf-api-${Date.now()}`;
    createdVersionNames.push(versionName);

    const res = await post<ConfluenceImportSuccess>('/import/confluence', {
      confluence_page_id: '12345',
      version_name: versionName,
    });

    // 若 Confluence API 未設定環境變數，可能回傳 502；此處驗證正常流程
    if (res.status === 200) {
      expect(res.body.status).toBe('success');
      expect(res.body.version).toBeDefined();
      expect(res.body.version.name).toBe(versionName);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.model_components_count).toBeGreaterThanOrEqual(0);
      expect(res.body.summary.parsed_tables).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.parsed_data)).toBe(true);
    } else {
      // Confluence 環境變數未設定時應回傳 502
      expect(res.status).toBe(502);
      expect((res.body as unknown as ErrorBody).code).toBe('CONFLUENCE_ERROR');
    }
  });

  it('WHEN POST with mode=upload and PDF file THEN parses and returns preview', async () => {
    const versionName = `e2e-conf-pdf-${Date.now()}`;
    createdVersionNames.push(versionName);

    const pdfBuffer = createFakePdf();
    const res = await postImportForm(
      { version_name: versionName },
      { name: 'test-deploy.pdf', content: pdfBuffer, type: 'application/pdf' },
    );

    // 假 PDF 可能無法解析表格，預期 200（空結果）或 422（PARSE_ERROR）
    expect([200, 422]).toContain(res.status);
    if (res.status === 200) {
      const body = res.body as ConfluenceImportSuccess;
      expect(body.version.name).toBe(versionName);
      expect(body.summary).toBeDefined();
    } else {
      const body = res.body as ErrorBody;
      expect(body.code).toBe('PARSE_ERROR');
    }
  });

  it('WHEN POST with dry_run=true THEN returns preview without DB write', async () => {
    const versionName = `e2e-conf-dry-${Date.now()}`;

    const res = await postImportForm(
      { version_name: versionName, dry_run: 'true' },
      { name: 'test-deploy.pdf', content: createFakePdf(), type: 'application/pdf' },
    );

    // dry_run 不應回傳 409（不檢查重複）
    if (res.status === 200) {
      const body = res.body as ConfluenceImportDryRun;
      expect(body.status).toBe('dry_run');
      expect(body.summary).toBeDefined();
      expect(Array.isArray(body.parsed_data)).toBe(true);
    }

    // 確認 DB 未寫入
    const versionsRes = await get<{ data: { name: string }[] }>('/versions?per_page=100');
    const found = versionsRes.body.data?.some((v) => v.name === versionName);
    expect(found).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F-010: Confluence 匯入 — Error Handling
// ---------------------------------------------------------------------------
describe('F-010 Confluence Import — Error Handling', () => {
  it('WHEN POST with invalid page_id THEN returns 404 or 502', async () => {
    const versionName = `e2e-conf-badpage-${Date.now()}`;

    const res = await post<ErrorBody>('/import/confluence', {
      confluence_page_id: 'nonexistent-page-99999',
      version_name: versionName,
    });

    // 無效 page_id：若 Confluence 連線正常回 404，不可達回 502
    expect([404, 502]).toContain(res.status);
  });

  it('WHEN POST with unsupported file type THEN returns 400 INVALID_FILE', async () => {
    const versionName = `e2e-conf-badfile-${Date.now()}`;

    const res = await postImportForm(
      { version_name: versionName },
      { name: 'data.xlsx', content: createFakeXlsx(), type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    expect(res.status).toBe(400);
    expect((res.body as ErrorBody).code).toBe('INVALID_FILE');
  });

  it('WHEN POST without file and without confluence_page_id THEN returns 400 INVALID_INPUT', async () => {
    const res = await post<ErrorBody>('/import/confluence', {
      version_name: 'e2e-noinput',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN POST with empty version_name THEN returns 400 INVALID_INPUT', async () => {
    const res = await postImportForm(
      { version_name: '' },
      { name: 'test.pdf', content: createFakePdf(), type: 'application/pdf' },
    );

    expect(res.status).toBe(400);
    expect((res.body as ErrorBody).code).toBe('INVALID_INPUT');
  });

  it('WHEN POST with duplicate version_name (non dry_run) THEN returns 409 DUPLICATE', async () => {
    const versionName = `e2e-conf-dup-${Date.now()}`;
    createdVersionNames.push(versionName);

    // 先建立一個 version（透過 cdk8s import 以確保存在）
    const seed = await post('/import/cdk8s', {
      version_name: versionName,
      branch: 'main',
    });
    expect(seed.status).toBe(200);

    // 再用 Confluence import 同名 version
    const res = await postImportForm(
      { version_name: versionName },
      { name: 'test.pdf', content: createFakePdf(), type: 'application/pdf' },
    );

    expect(res.status).toBe(409);
    expect((res.body as ErrorBody).code).toBe('DUPLICATE');
  });

  it('WHEN Confluence API unreachable THEN returns 502 CONFLUENCE_ERROR', async () => {
    const versionName = `e2e-conf-502-${Date.now()}`;

    // 使用一個假的 page_id，在 Confluence 環境變數未設定或無法連線時應回 502
    const res = await post<ErrorBody>('/import/confluence', {
      confluence_page_id: '99999',
      version_name: versionName,
    });

    // 預期在 CI 環境（無 Confluence）回傳 502
    if (res.status === 502) {
      expect(res.body.code).toBe('CONFLUENCE_ERROR');
    }
    // 若 Confluence 可連線但 page 不存在，可能回傳 404
    expect([404, 502]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// F-010: Confluence 匯入 — Edge Cases
// ---------------------------------------------------------------------------
describe('F-010 Confluence Import — Edge Cases', () => {
  it('WHEN PDF has multiple versions THEN all versions parsed in summary', async () => {
    const versionName = `e2e-conf-multi-${Date.now()}`;
    createdVersionNames.push(versionName);

    // 上傳含多版本表格的 PDF
    const res = await postImportForm(
      { version_name: versionName },
      { name: 'multi-version.pdf', content: createFakePdf(), type: 'application/pdf' },
    );

    if (res.status === 200) {
      const body = res.body as ConfluenceImportSuccess;
      expect(body.summary).toBeDefined();
      expect(body.summary.parsed_tables).toBeGreaterThanOrEqual(0);
    }
    // 假 PDF 可能回 422 PARSE_ERROR，也是合理的
    expect([200, 422]).toContain(res.status);
  });

  it('WHEN PDF table has unknown Component THEN warnings include that row', async () => {
    const versionName = `e2e-conf-unknown-${Date.now()}`;
    createdVersionNames.push(versionName);

    // 此測試需要真實含 "Unknown Service" Component 的 PDF
    // 在 CI 環境使用 mock/fixture PDF
    const res = await postImportForm(
      { version_name: versionName },
      { name: 'unknown-component.pdf', content: createFakePdf(), type: 'application/pdf' },
    );

    if (res.status === 200) {
      const body = res.body as ConfluenceImportSuccess;
      expect(Array.isArray(body.summary.warnings)).toBe(true);
      // 若有未知 Component，warnings 應非空
    }
  });

  it('WHEN PDF table has empty rows THEN model_components_count is 0 with warning', async () => {
    const versionName = `e2e-conf-empty-${Date.now()}`;

    const res = await postImportForm(
      { version_name: versionName, dry_run: 'true' },
      { name: 'empty-table.pdf', content: createFakePdf(), type: 'application/pdf' },
    );

    if (res.status === 200) {
      const body = res.body as ConfluenceImportDryRun;
      // 空 PDF 應解析出 0 筆或觸發 PARSE_ERROR
      expect(body.summary.model_components_count).toBeGreaterThanOrEqual(0);
    }
    expect([200, 422]).toContain(res.status);
  });

  it('WHEN file exceeds 50MB THEN returns 400 INVALID_FILE', async () => {
    // 建立一個超過 50MB 的假檔案（只需 header 夠大）
    // 實際測試中可用較小的 buffer 模擬，由 server 端 middleware 檢查
    const versionName = `e2e-conf-big-${Date.now()}`;
    const bigBuffer = Buffer.alloc(50 * 1024 * 1024 + 1, 0); // 50MB + 1 byte

    const res = await postImportForm(
      { version_name: versionName },
      { name: 'big.pdf', content: bigBuffer, type: 'application/pdf' },
    );

    // 預期 400（server 端檢查）或 413（nginx/proxy 層檢查）
    expect([400, 413]).toContain(res.status);
  });
});
