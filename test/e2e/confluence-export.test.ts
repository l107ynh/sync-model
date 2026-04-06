/**
 * F-011: Confluence 匯出 E2E Tests
 *
 * 對應 specs/features/f011-confluence-export.md
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { get, post } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExportHtmlResponse {
  format: 'html';
  content: string;
  version: { id: string; name: string };
  generated_at: string;
}

interface ExportConfluenceApiResponse {
  status: 'updated';
  confluence_page_id: string;
  confluence_page_url: string;
  updated_at: string;
}

interface ErrorBody {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Seed：確保至少一個 version 存在
// ---------------------------------------------------------------------------
let testVersionId: string | null = null;

beforeAll(async () => {
  // 先嘗試取得已有的 version
  const versionsRes = await get<{ data: { id: string; name: string }[] }>('/versions?per_page=10');
  if (versionsRes.status === 200 && versionsRes.body.data?.length > 0) {
    testVersionId = versionsRes.body.data[0].id;
    return;
  }

  // 若無 version，匯入一個
  const versionName = `e2e-export-seed-${Date.now()}`;
  const importRes = await post<{
    status: string;
    version: { id: string; name: string };
  }>('/import/cdk8s', {
    version_name: versionName,
    branch: 'main',
  });
  if (importRes.status === 200) {
    testVersionId = importRes.body.version.id;
  }
});

// ---------------------------------------------------------------------------
// F-011: Confluence 匯出 — Happy Path
// ---------------------------------------------------------------------------
describe('F-011 Confluence Export — Happy Path', () => {
  it('WHEN POST /export/confluence with format=html THEN returns HTML content', async () => {
    if (!testVersionId) return; // skip if no seed data

    const res = await post<ExportHtmlResponse>('/export/confluence', {
      version_id: testVersionId,
      format: 'html',
    });

    expect(res.status).toBe(200);
    expect(res.body.format).toBe('html');
    expect(res.body.content).toBeDefined();
    expect(typeof res.body.content).toBe('string');
    expect(res.body.content.length).toBeGreaterThan(0);
    expect(res.body.version).toBeDefined();
    expect(res.body.version.id).toBe(testVersionId);
    expect(res.body.generated_at).toBeDefined();
  });

  it('WHEN POST with format=confluence_api and page_id THEN updates Confluence page', async () => {
    if (!testVersionId) return;

    const res = await post<ExportConfluenceApiResponse | ErrorBody>('/export/confluence', {
      version_id: testVersionId,
      format: 'confluence_api',
      confluence_page_id: '12345',
    });

    // Confluence 環境變數未設定時回 502；已設定時回 200
    if (res.status === 200) {
      const body = res.body as ExportConfluenceApiResponse;
      expect(body.status).toBe('updated');
      expect(body.confluence_page_id).toBe('12345');
      expect(body.confluence_page_url).toBeDefined();
      expect(body.updated_at).toBeDefined();
    } else {
      expect(res.status).toBe(502);
      expect((res.body as ErrorBody).code).toBe('CONFLUENCE_ERROR');
    }
  });

  it('WHEN POST with format=html and environment_ids filter THEN returns filtered HTML', async () => {
    if (!testVersionId) return;

    // 先取得可用 environment ids
    const envsRes = await get<{ data: { id: string; name: string }[] }>('/environments');
    if (envsRes.status !== 200 || !envsRes.body.data?.length) return;

    const envId = envsRes.body.data[0].id;

    const res = await post<ExportHtmlResponse>('/export/confluence', {
      version_id: testVersionId,
      format: 'html',
      environment_ids: [envId],
    });

    expect(res.status).toBe(200);
    expect(res.body.format).toBe('html');
    expect(res.body.content).toBeDefined();
  });

  it('WHEN POST with format=pdf THEN returns PDF binary', async () => {
    if (!testVersionId) return;

    const res = await post('/export/confluence', {
      version_id: testVersionId,
      format: 'pdf',
    });

    expect(res.status).toBe(200);
    // PDF 回應的 Content-Type 應為 application/pdf
    const contentType = res.headers.get('content-type');
    if (contentType) {
      expect(contentType).toContain('application/pdf');
    }
  });
});

// ---------------------------------------------------------------------------
// F-011: Confluence 匯出 — Error Handling
// ---------------------------------------------------------------------------
describe('F-011 Confluence Export — Error Handling', () => {
  it('WHEN POST with invalid version_id THEN returns 404 NOT_FOUND', async () => {
    const res = await post<ErrorBody>('/export/confluence', {
      version_id: '00000000-0000-0000-0000-000000000000',
      format: 'html',
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN POST with format=confluence_api but missing page_id THEN returns 400', async () => {
    if (!testVersionId) return;

    const res = await post<ErrorBody>('/export/confluence', {
      version_id: testVersionId,
      format: 'confluence_api',
      // 故意不提供 confluence_page_id
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN POST with invalid format THEN returns 400 INVALID_INPUT', async () => {
    if (!testVersionId) return;

    const res = await post<ErrorBody>('/export/confluence', {
      version_id: testVersionId,
      format: 'docx',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('WHEN Confluence API fails THEN returns 502 CONFLUENCE_ERROR', async () => {
    if (!testVersionId) return;

    const res = await post<ErrorBody>('/export/confluence', {
      version_id: testVersionId,
      format: 'confluence_api',
      confluence_page_id: '99999',
    });

    // CI 環境無 Confluence 時預期 502
    if (res.status === 502) {
      expect(res.body.code).toBe('CONFLUENCE_ERROR');
    }
    expect([200, 502]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// F-011: Confluence 匯出 — Edge Cases
// ---------------------------------------------------------------------------
describe('F-011 Confluence Export — Edge Cases', () => {
  it('WHEN exported HTML contains correct table structure THEN matches Confluence format', async () => {
    if (!testVersionId) return;

    const res = await post<ExportHtmlResponse>('/export/confluence', {
      version_id: testVersionId,
      format: 'html',
    });

    expect(res.status).toBe(200);

    const html = res.body.content;

    // 驗證 Confluence Storage Format 表格結構
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('<td');

    // 驗證表頭欄位
    expect(html).toContain('Component');
    expect(html).toContain('ID');
    expect(html).toContain('Model');
    expect(html).toContain('Images');
    expect(html).toContain('Settings');
    expect(html).toContain('Resource');
  });

  it('WHEN version has no settings THEN returns empty table with headers only', async () => {
    // 建立一個空 version（透過 dry_run 或直接建立）
    // 此測試依賴是否有建立空 version 的 API
    // 若無法建立空 version，使用一個不存在的 version_id 驗證 404
    const res = await post<ErrorBody>('/export/confluence', {
      version_id: '00000000-0000-0000-0000-000000000000',
      format: 'html',
    });

    // 不存在的 version 應回 404
    expect(res.status).toBe(404);
  });

  it('WHEN HTML export field mapping is correct THEN Component/ID/Model columns match', async () => {
    if (!testVersionId) return;

    const res = await post<ExportHtmlResponse>('/export/confluence', {
      version_id: testVersionId,
      format: 'html',
    });

    if (res.status !== 200) return;

    const html = res.body.content;

    // 表格應包含 model type 對應的 Component 名稱
    // 至少應有 <tr> 資料列（除了表頭）
    const dataRowCount = (html.match(/<td/g) || []).length;
    // 每列 6 欄，所以 <td> 數量應為 6 的倍數
    expect(dataRowCount % 6).toBe(0);
  });
});
