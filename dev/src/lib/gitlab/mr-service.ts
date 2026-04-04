/**
 * MR 建立服務
 *
 * 1. 取得 codegen 結果
 * 2. GitLab: create branch
 * 3. GitLab: commit files
 * 4. GitLab: create MR
 * 5. 儲存 DB 記錄
 * 6. 非同步觸發通知
 */

import { db } from "@/db";
import { codegenResults, mergeRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import {
  createBranch,
  commitFiles,
  createMergeRequest,
  GitLabApiError,
} from "./client";
import type { GitLabCommitAction } from "./types";
import type { CodegenFile } from "@/db/schema/codegen-result";
import { sendMrNotification } from "../notifications";

export interface CreateMrParams {
  codegenId: string;
  title?: string;
  description?: string;
  createdBy: string;
}

export interface CreateMrResult {
  id: string;
  gitlabMrId: number;
  gitlabMrUrl: string;
  sourceBranch: string;
  targetBranch: string;
  status: string;
  title: string;
  createdBy: string;
  createdAt: string;
}

/**
 * 建立 MR 完整流程
 */
export async function createMr(params: CreateMrParams): Promise<CreateMrResult> {
  // 1. 取得 codegen 結果
  const [codegen] = await db
    .select()
    .from(codegenResults)
    .where(eq(codegenResults.id, params.codegenId))
    .limit(1);

  if (!codegen) {
    throw new MrServiceError("NOT_FOUND", `Codegen ${params.codegenId} 不存在`);
  }

  // 檢查是否已建立過 MR
  const [existingMr] = await db
    .select({ id: mergeRequests.id })
    .from(mergeRequests)
    .where(eq(mergeRequests.codegenId, params.codegenId))
    .limit(1);

  if (existingMr) {
    throw new MrServiceError(
      "DUPLICATE",
      `Codegen ${params.codegenId} 已經建立過 MR`
    );
  }

  const files = codegen.files as CodegenFile[];
  if (!files || files.length === 0) {
    throw new MrServiceError("INVALID_INPUT", "Codegen 沒有產出任何檔案變更");
  }

  // 2. 建立 branch（with retry for name collision）
  const branchName = await createBranchWithRetry();

  try {
    // 3. Commit files
    const actions: GitLabCommitAction[] = files.map((f) => ({
      action: "update" as const,
      file_path: f.path,
      content: f.content,
      encoding: "text" as const,
    }));

    const mrTitle =
      params.title ?? generateMrTitle(files);

    await commitFiles(
      branchName,
      `chore(sync-model): ${mrTitle}`,
      actions
    );

    // 4. 建立 MR
    const mrDescription =
      params.description ?? generateMrDescription(files, params.createdBy);

    const gitlabMr = await createMergeRequest({
      sourceBranch: branchName,
      targetBranch: "main",
      title: mrTitle,
      description: mrDescription,
      removeSourceBranch: true,
    });

    // 5. 儲存到 DB
    const filesChanged = files.map((f) => ({
      path: f.path,
      action: f.action,
    }));

    const [mrRecord] = await db
      .insert(mergeRequests)
      .values({
        codegenId: params.codegenId,
        gitlabMrId: gitlabMr.iid,
        gitlabMrUrl: gitlabMr.web_url,
        sourceBranch: branchName,
        targetBranch: "main",
        title: mrTitle,
        status: "OPEN",
        changeHistoryIds: codegen.changeHistoryIds as string[],
        filesChanged,
        createdBy: params.createdBy,
      })
      .returning();

    // 6. 更新 codegen status
    await db
      .update(codegenResults)
      .set({
        status: "used",
        mergeRequestId: mrRecord.id,
      })
      .where(eq(codegenResults.id, params.codegenId));

    // 7. 非同步通知（不阻塞 MR 建立）
    sendMrNotification(mrRecord.id).catch((err) => {
      console.warn("MR 通知發送失敗（不影響 MR 建立）:", err);
    });

    return {
      id: mrRecord.id,
      gitlabMrId: gitlabMr.iid,
      gitlabMrUrl: gitlabMr.web_url,
      sourceBranch: branchName,
      targetBranch: "main",
      status: "OPEN",
      title: mrTitle,
      createdBy: params.createdBy,
      createdAt: mrRecord.createdAt.toISOString(),
    };
  } catch (error) {
    // GitLab API 失敗 → rollback（不建立 DB 記錄）
    if (error instanceof GitLabApiError) {
      throw new MrServiceError(
        "GITLAB_ERROR",
        `GitLab API 失敗: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * 建立 branch，如名稱衝突自動 retry（最多 3 次）
 */
async function createBranchWithRetry(maxRetries = 3): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const hash = crypto.randomBytes(3).toString("hex");
    const date = new Date().toISOString().split("T")[0];
    const branchName = `sync-model/${date}-${hash}`;

    try {
      await createBranch(branchName, "main");
      return branchName;
    } catch (error) {
      if (
        error instanceof GitLabApiError &&
        error.status === 400 &&
        attempt < maxRetries - 1
      ) {
        // Branch name conflict, retry
        continue;
      }
      throw error;
    }
  }

  throw new MrServiceError("GITLAB_ERROR", "無法建立 branch（重試 3 次仍失敗）");
}

/**
 * 自動產生 MR title
 */
function generateMrTitle(files: CodegenFile[]): string {
  const editions = files
    .map((f) => {
      const match = f.path.match(/gpu\/(.+)\.ts$/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  if (editions.length === 1) {
    return `update ${editions[0]} gpu settings`;
  }
  return `update gpu settings (${editions.join(", ")})`;
}

/**
 * 自動產生 MR description
 */
function generateMrDescription(
  files: CodegenFile[],
  createdBy: string
): string {
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  const fileList = files
    .map((f) => `- \`${f.path}\` (${f.action})`)
    .join("\n");

  return `## Sync Model GP - 自動產生的設定變更

**操作者**: ${createdBy}
**時間**: ${now} UTC

### 變更檔案
${fileList}

---
*This MR was auto-generated by [Sync Model GP]*`;
}

export class MrServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}
