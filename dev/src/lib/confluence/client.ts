/**
 * Confluence REST API Client
 *
 * 支援 Cloud v2 和 Data Center v1，由環境變數 CONFLUENCE_API_VERSION 決定。
 * 認證方式：Basic Auth (username + API token)
 */

import { ApiError } from "@/lib/api-error";

interface ConfluenceConfig {
  baseUrl: string;
  username: string;
  token: string;
  apiVersion: "v1" | "v2";
}

function getConfig(): ConfluenceConfig {
  const baseUrl = process.env.CONFLUENCE_BASE_URL;
  const username = process.env.CONFLUENCE_USERNAME;
  const token = process.env.CONFLUENCE_TOKEN;
  const apiVersion = (process.env.CONFLUENCE_API_VERSION as "v1" | "v2") || "v2";

  if (!baseUrl || !username || !token) {
    throw new ApiError(
      "CONFLUENCE_ERROR",
      "Confluence 環境變數未設定 (CONFLUENCE_BASE_URL, CONFLUENCE_USERNAME, CONFLUENCE_TOKEN)"
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), username, token, apiVersion };
}

function authHeader(config: ConfluenceConfig): string {
  return `Basic ${Buffer.from(`${config.username}:${config.token}`).toString("base64")}`;
}

async function confluenceFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const config = getConfig();
  const headers: Record<string, string> = {
    Authorization: authHeader(config),
    Accept: "application/json",
    ...(init.headers as Record<string, string> ?? {}),
  };

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(
      "CONFLUENCE_ERROR",
      `Confluence API 回傳 ${response.status}: ${text.slice(0, 500)}`
    );
  }

  return response;
}

// ── 頁面讀取 ──

export async function getPage(pageId: string): Promise<{ title: string; storageContent: string; versionNumber: number }> {
  const config = getConfig();

  let url: string;
  if (config.apiVersion === "v2") {
    url = `${config.baseUrl}/wiki/api/v2/pages/${pageId}?body-format=storage`;
  } else {
    url = `${config.baseUrl}/rest/api/content/${pageId}?expand=body.storage,version`;
  }

  const response = await confluenceFetch(url);
  const data = await response.json();

  if (config.apiVersion === "v2") {
    return {
      title: data.title,
      storageContent: data.body?.storage?.value ?? "",
      versionNumber: data.version?.number ?? 1,
    };
  } else {
    return {
      title: data.title,
      storageContent: data.body?.storage?.value ?? "",
      versionNumber: data.version?.number ?? 1,
    };
  }
}

export async function getPageByTitle(
  spaceKey: string,
  title: string
): Promise<{ id: string; title: string; storageContent: string; versionNumber: number } | null> {
  const config = getConfig();

  let url: string;
  if (config.apiVersion === "v2") {
    url = `${config.baseUrl}/wiki/api/v2/spaces/${spaceKey}/pages?title=${encodeURIComponent(title)}&body-format=storage`;
  } else {
    url = `${config.baseUrl}/rest/api/content?spaceKey=${encodeURIComponent(spaceKey)}&title=${encodeURIComponent(title)}&expand=body.storage,version`;
  }

  const response = await confluenceFetch(url);
  const data = await response.json();

  const results = config.apiVersion === "v2" ? data.results : data.results;
  if (!results || results.length === 0) return null;

  const page = results[0];
  return {
    id: page.id,
    title: page.title,
    storageContent: page.body?.storage?.value ?? "",
    versionNumber: page.version?.number ?? 1,
  };
}

export async function searchPages(query: string): Promise<Array<{ id: string; title: string }>> {
  const config = getConfig();

  let url: string;
  if (config.apiVersion === "v2") {
    url = `${config.baseUrl}/wiki/api/v2/pages?title=${encodeURIComponent(query)}&limit=10`;
  } else {
    url = `${config.baseUrl}/rest/api/content/search?cql=${encodeURIComponent(`title~"${query}"`)}`;
  }

  const response = await confluenceFetch(url);
  const data = await response.json();
  const results = data.results ?? [];

  return results.map((r: { id: string; title: string }) => ({
    id: r.id,
    title: r.title,
  }));
}

// ── 頁面更新 ──

export async function updatePage(
  pageId: string,
  title: string,
  htmlContent: string,
  currentVersionNumber: number
): Promise<{ pageUrl: string; updatedAt: string }> {
  const config = getConfig();

  let url: string;
  let body: unknown;

  if (config.apiVersion === "v2") {
    url = `${config.baseUrl}/wiki/api/v2/pages/${pageId}`;
    body = {
      id: pageId,
      status: "current",
      title,
      body: {
        representation: "storage",
        value: htmlContent,
      },
      version: {
        number: currentVersionNumber + 1,
        message: "Updated by sync-model",
      },
    };
  } else {
    url = `${config.baseUrl}/rest/api/content/${pageId}`;
    body = {
      type: "page",
      title,
      body: {
        storage: {
          value: htmlContent,
          representation: "storage",
        },
      },
      version: {
        number: currentVersionNumber + 1,
        message: "Updated by sync-model",
      },
    };
  }

  await confluenceFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const pageUrl = config.apiVersion === "v2"
    ? `${config.baseUrl}/wiki/pages/viewpage.action?pageId=${pageId}`
    : `${config.baseUrl}/pages/viewpage.action?pageId=${pageId}`;

  return {
    pageUrl,
    updatedAt: new Date().toISOString(),
  };
}

// ── 頁面建立 ──

export async function createPage(
  spaceKey: string,
  title: string,
  htmlContent: string
): Promise<{ pageId: string; pageUrl: string }> {
  const config = getConfig();

  let url: string;
  let body: unknown;

  if (config.apiVersion === "v2") {
    url = `${config.baseUrl}/wiki/api/v2/pages`;
    body = {
      spaceId: spaceKey,
      status: "current",
      title,
      body: {
        representation: "storage",
        value: htmlContent,
      },
    };
  } else {
    url = `${config.baseUrl}/rest/api/content`;
    body = {
      type: "page",
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: htmlContent,
          representation: "storage",
        },
      },
    };
  }

  const response = await confluenceFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  const pageId = data.id;

  const pageUrl = config.apiVersion === "v2"
    ? `${config.baseUrl}/wiki/pages/viewpage.action?pageId=${pageId}`
    : `${config.baseUrl}/pages/viewpage.action?pageId=${pageId}`;

  return { pageId, pageUrl };
}
