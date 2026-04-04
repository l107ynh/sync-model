/**
 * 通知入口
 *
 * 在 MR 建立成功後非同步觸發，不阻塞 MR 建立流程。
 */

import { db } from "@/db";
import { mergeRequests, codegenResults, notificationConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  sendGoogleChatNotification,
  NotificationError,
} from "./google-chat";
import type { CodegenFile } from "@/db/schema/codegen-result";

export { NotificationError } from "./google-chat";

/**
 * 查詢通知設定
 */
export async function getNotificationConfig(): Promise<{
  enabled: boolean;
  webhookUrlConfigured: boolean;
}> {
  const { getEnv } = await import("@/lib/env");
  const env = getEnv();
  const webhookConfigured = !!env.GOOGLE_CHAT_WEBHOOK_URL;

  const [config] = await db
    .select()
    .from(notificationConfig)
    .limit(1);

  return {
    enabled: config?.enabled ?? true,
    webhookUrlConfigured: webhookConfigured,
  };
}

/**
 * 更新通知設定
 */
export async function updateNotificationConfig(
  enabled: boolean
): Promise<{ enabled: boolean; updatedAt: string }> {
  const [existing] = await db.select().from(notificationConfig).limit(1);

  if (existing) {
    const [updated] = await db
      .update(notificationConfig)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(notificationConfig.id, existing.id))
      .returning();
    return {
      enabled: updated.enabled,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  const [created] = await db
    .insert(notificationConfig)
    .values({ enabled })
    .returning();
  return {
    enabled: created.enabled,
    updatedAt: created.updatedAt.toISOString(),
  };
}

/**
 * 發送 MR 通知
 * 此函式設計為非同步呼叫，不阻塞 MR 建立。
 */
export async function sendMrNotification(mergeRequestId: string): Promise<void> {
  // 檢查通知是否啟用
  const config = await getNotificationConfig();
  if (!config.enabled || !config.webhookUrlConfigured) {
    console.info("通知已停用或 webhook 未設定，跳過發送");
    return;
  }

  // 查詢 MR 資訊
  const [mr] = await db
    .select()
    .from(mergeRequests)
    .where(eq(mergeRequests.id, mergeRequestId))
    .limit(1);

  if (!mr) {
    console.warn(`MR ${mergeRequestId} 不存在，跳過通知`);
    return;
  }

  // 查詢 codegen 取得變更檔案列表
  let changeSummary = "設定變更已套用";
  if (mr.codegenId) {
    const [codegen] = await db
      .select()
      .from(codegenResults)
      .where(eq(codegenResults.id, mr.codegenId))
      .limit(1);

    if (codegen?.files) {
      const files = codegen.files as CodegenFile[];
      changeSummary = files
        .map((f) => `- <code>${f.path}</code> (${f.action})`)
        .join("\n");
    }
  }

  await sendGoogleChatNotification({
    title: "Sync Model GP - 新設定變更 MR",
    subtitle: `by ${mr.createdBy ?? "unknown"}`,
    changeSummary,
    mrUrl: mr.gitlabMrUrl ?? "",
  });
}
