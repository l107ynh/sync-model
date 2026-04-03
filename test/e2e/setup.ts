/**
 * E2E Test Setup
 *
 * 提供 BASE_URL、apiClient helper、seed / cleanup helpers。
 * 所有 E2E test 共用此 setup。
 */

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
export const API_PREFIX = `${BASE_URL}/api/v1`;

// ---------------------------------------------------------------------------
// Generic API Client
// ---------------------------------------------------------------------------
interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers: Headers;
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = path.startsWith('http') ? path : `${API_PREFIX}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    ...options,
  });
  const text = await res.text();
  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    body = text as unknown as T;
  }
  return { status: res.status, body, headers: res.headers };
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------
export function get<T = unknown>(path: string) {
  return apiClient<T>(path, { method: 'GET' });
}

export function post<T = unknown>(path: string, data?: unknown) {
  return apiClient<T>(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function patch<T = unknown>(path: string, data?: unknown) {
  return apiClient<T>(path, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function del<T = unknown>(path: string) {
  return apiClient<T>(path, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Seed & Cleanup helpers
// ---------------------------------------------------------------------------

/** 匯入一個測試用 version，回傳 version id */
export async function seedVersion(versionName: string, branch = 'main') {
  const res = await post<{
    status: string;
    version: { id: string; name: string };
    summary: Record<string, unknown>;
  }>('/import/cdk8s', { version_name: versionName, branch });
  return res;
}

/** 取得第一個 version id（用於 settings 測試） */
export async function getFirstVersionId(): Promise<string | null> {
  const res = await get<{ data: { id: string }[] }>('/versions');
  if (res.status === 200 && res.body.data?.length > 0) {
    return res.body.data[0].id;
  }
  return null;
}

/**
 * 等待 health check 通過（最多重試 retries 次）
 */
export async function waitForHealthy(retries = 20, intervalMs = 3000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await get<{ status: string }>('/health');
      if (res.status === 200 && res.body.status === 'ok') return true;
    } catch {
      // 連線失敗，繼續重試
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

// ---------------------------------------------------------------------------
// Global Setup — 確認服務可用
// ---------------------------------------------------------------------------
beforeAll(async () => {
  const healthy = await waitForHealthy();
  if (!healthy) {
    throw new Error(
      `服務不可用：無法連線 ${API_PREFIX}/health。請先啟動 docker compose up -d。`,
    );
  }
});
