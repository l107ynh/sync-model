/**
 * Google Chat Webhook Client
 *
 * 使用 cardsV2 格式發送通知卡片。
 * 環境變數：GOOGLE_CHAT_WEBHOOK_URL
 */

import { getEnv } from "@/lib/env";

export interface ChatNotificationPayload {
  title: string;
  subtitle: string;
  changeSummary: string;
  mrUrl: string;
}

/**
 * 發送 Google Chat 通知
 */
export async function sendGoogleChatNotification(
  payload: ChatNotificationPayload
): Promise<void> {
  const env = getEnv();
  const webhookUrl = env.GOOGLE_CHAT_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new NotificationError(
      "NOTIFICATION_DISABLED",
      "GOOGLE_CHAT_WEBHOOK_URL 未設定"
    );
  }

  const body = buildCardsV2Message(payload);

  // 嘗試發送（retry 一次）
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) return;

      if (attempt === 0) {
        // 第一次失敗，等 5 秒後重試
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      const errorBody = await response
        .text()
        .catch(() => "unknown error");
      throw new NotificationError(
        "WEBHOOK_ERROR",
        `Google Chat webhook 回傳 ${response.status}: ${errorBody}`
      );
    } catch (error) {
      if (error instanceof NotificationError) throw error;
      if (attempt === 1) {
        throw new NotificationError(
          "WEBHOOK_ERROR",
          `Google Chat webhook 呼叫失敗: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

/**
 * 組裝 cardsV2 訊息格式
 */
function buildCardsV2Message(payload: ChatNotificationPayload) {
  return {
    cardsV2: [
      {
        cardId: "sync-model-notification",
        card: {
          header: {
            title: payload.title,
            subtitle: payload.subtitle,
            imageUrl: "https://gitlab.corp.ailabs.tw/favicon.ico",
            imageType: "CIRCLE",
          },
          sections: [
            {
              header: "變更摘要",
              widgets: [
                {
                  textParagraph: {
                    text: payload.changeSummary,
                  },
                },
              ],
            },
            {
              widgets: [
                {
                  buttonList: {
                    buttons: [
                      {
                        text: "Review MR",
                        onClick: {
                          openLink: {
                            url: payload.mrUrl,
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

export class NotificationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}
