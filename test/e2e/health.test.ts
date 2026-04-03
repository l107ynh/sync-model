/**
 * F-001: 健康檢查 E2E Tests
 *
 * 對應 specs/features/f001-project-init.md
 */
import { describe, it, expect } from 'vitest';
import { get, API_PREFIX } from './setup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HealthOk {
  status: 'ok';
  version: string;
  timestamp: string;
  database: string;
}

interface HealthError {
  status: 'error';
  message: string;
}

interface ErrorBody {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------
describe('F-001 Health Check', () => {
  // TC-001
  it('WHEN GET /api/v1/health THEN 回傳 200 且 status=ok, database=connected', async () => {
    const res = await get<HealthOk>('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });

  it('WHEN GET /api/v1/health THEN version 為 semver 格式', async () => {
    const res = await get<HealthOk>('/health');

    expect(res.status).toBe(200);
    expect(res.body.version).toBeDefined();
    // semver: x.y.z
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('WHEN GET /api/v1/health THEN timestamp 為 ISO 8601 格式', async () => {
    const res = await get<HealthOk>('/health');

    expect(res.status).toBe(200);
    expect(res.body.timestamp).toBeDefined();
    const parsed = new Date(res.body.timestamp);
    expect(parsed.toISOString()).toBe(res.body.timestamp);
  });

  // TC-004
  it('WHEN GET /api/v1/nonexistent THEN 回傳 404 且 code=NOT_FOUND', async () => {
    const res = await get<ErrorBody>('/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('WHEN 回應為錯誤 THEN 使用統一 Error Response 格式 (code + message)', async () => {
    const res = await get<ErrorBody>('/nonexistent');

    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.code).toBe('string');
    expect(typeof res.body.message).toBe('string');
  });
});
