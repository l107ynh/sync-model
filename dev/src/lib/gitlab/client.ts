/**
 * GitLab API v4 Client
 *
 * 使用 fetch 實作，不需額外 library。
 * 環境變數：GITLAB_URL, GITLAB_TOKEN, GITLAB_PROJECT_ID
 */

import { getEnv } from "@/lib/env";
import type {
  GitLabBranch,
  GitLabCommit,
  GitLabCommitAction,
  GitLabMergeRequest,
} from "./types";

class GitLabApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(
      `GitLab API error: ${status} — ${typeof body === "string" ? body : JSON.stringify(body)}`
    );
  }
}

function getConfig() {
  const env = getEnv();
  const gitlabUrl = env.GITLAB_URL;
  const gitlabToken = env.GITLAB_TOKEN;
  const projectId = env.GITLAB_PROJECT_ID;

  if (!gitlabUrl || !gitlabToken || !projectId) {
    throw new Error(
      "GitLab 環境變數未設定（GITLAB_URL, GITLAB_TOKEN, GITLAB_PROJECT_ID）"
    );
  }

  return {
    baseUrl: `${gitlabUrl}/api/v4`,
    token: gitlabToken,
    projectId,
  };
}

async function gitlabFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 2
): Promise<T> {
  const { baseUrl, token } = getConfig();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "PRIVATE-TOKEN": token,
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    // Retry on 502/503/504
    if (retries > 0 && [502, 503, 504].includes(response.status)) {
      await new Promise((r) => setTimeout(r, 1000));
      return gitlabFetch(path, options, retries - 1);
    }

    const body = await response.json().catch(() => response.statusText);
    throw new GitLabApiError(response.status, body);
  }

  return response.json() as Promise<T>;
}

/**
 * 建立新 branch
 */
export async function createBranch(
  branchName: string,
  ref = "main"
): Promise<GitLabBranch> {
  const { projectId } = getConfig();
  return gitlabFetch<GitLabBranch>(
    `/projects/${encodeURIComponent(projectId)}/repository/branches`,
    {
      method: "POST",
      body: JSON.stringify({
        branch: branchName,
        ref,
      }),
    }
  );
}

/**
 * 提交檔案到指定 branch（多檔案一次提交）
 */
export async function commitFiles(
  branch: string,
  commitMessage: string,
  actions: GitLabCommitAction[]
): Promise<GitLabCommit> {
  const { projectId } = getConfig();
  return gitlabFetch<GitLabCommit>(
    `/projects/${encodeURIComponent(projectId)}/repository/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        branch,
        commit_message: commitMessage,
        actions,
      }),
    }
  );
}

/**
 * 建立 Merge Request
 */
export async function createMergeRequest(params: {
  sourceBranch: string;
  targetBranch?: string;
  title: string;
  description?: string;
  removeSourceBranch?: boolean;
}): Promise<GitLabMergeRequest> {
  const { projectId } = getConfig();
  return gitlabFetch<GitLabMergeRequest>(
    `/projects/${encodeURIComponent(projectId)}/merge_requests`,
    {
      method: "POST",
      body: JSON.stringify({
        source_branch: params.sourceBranch,
        target_branch: params.targetBranch ?? "main",
        title: params.title,
        description: params.description ?? "",
        remove_source_branch: params.removeSourceBranch ?? true,
      }),
    }
  );
}

/**
 * 取得 MR 狀態
 */
export async function getMergeRequest(
  mrIid: number
): Promise<GitLabMergeRequest> {
  const { projectId } = getConfig();
  return gitlabFetch<GitLabMergeRequest>(
    `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`
  );
}

export { GitLabApiError };
