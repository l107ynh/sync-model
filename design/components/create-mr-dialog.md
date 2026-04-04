# CreateMrDialog 元件規格

## 概述
建立 GitLab Merge Request 的多步驟對話框。引導使用者從選擇設定變更、預覽 codegen、填寫 MR 資訊到最終確認建立，共四個步驟。

## Props Interface

```typescript
interface CreateMrDialogProps {
  /** 是否開啟 */
  open: boolean;
  /** 關閉回呼 */
  onOpenChange: (open: boolean) => void;
  /** MR 建立成功回呼 */
  onSuccess?: (mr: MergeRequestResponse) => void;
  /** 預選的 change history ids（從 history 頁面帶入） */
  preselectedHistoryIds?: string[];
}

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
```

## 步驟流程

```
Step 1              Step 2              Step 3              Step 4
選擇變更設定  →  預覽 Codegen  →  填寫 MR 資訊  →  確認 & 建立
```

## Step 1: 選擇變更設定

```
┌─ 建立 Merge Request ──────────────────────────────── [X] ┐
│                                                           │
│  ● 選擇變更設定 ─ ○ 預覽 ─ ○ MR 資訊 ─ ○ 確認          │
│  ─────────────────────────────────────────────────────    │
│                                                           │
│  選擇要包含在此 MR 中的設定變更：                          │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ☑ asr-general (pro) — replica: 2 → 3               │ │
│  │     by lynn.yang · 2 分鐘前                          │ │
│  │ ☑ llm-main (pro) — deploy: false → true             │ │
│  │     by lynn.yang · 5 分鐘前                          │ │
│  │ ☐ whisper-large (std) — gpu_mem: 0.85 → 0.9        │ │
│  │     by admin · 1 小時前                              │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  已選擇 2 筆變更                                          │
│                                                           │
│                                    [取消]  [下一步 →]     │
└───────────────────────────────────────────────────────────┘
```

### 資料來源
- `GET /api/v1/history?change_type=UPDATE` 取得尚未建立 MR 的變更
- 每筆顯示：model name (edition) -- 變更摘要 -- 操作者 -- 時間
- Checkbox 多選，至少選 1 筆才能「下一步」
- 上限 50 筆（API 限制）

## Step 2: 預覽 Codegen

```
┌─ 建立 Merge Request ──────────────────────────────── [X] ┐
│                                                           │
│  ○ 選擇變更 ─ ● 預覽 Codegen ─ ○ MR 資訊 ─ ○ 確認      │
│  ─────────────────────────────────────────────────────    │
│                                                           │
│  ┌─ CodegenPreview ─────────────────────────────────────┐│
│  │ （嵌入 codegen-preview.md 定義的元件）                 ││
│  │ 📄 1 file changed  +3  -2                             ││
│  │                                                       ││
│  │ ▼ src/components/inferno/gpu/pro.ts  [modify]         ││
│  │   @@ -10,7 +10,7 @@                                  ││
│  │   -    replica: 2,                                    ││
│  │   +    replica: 3,                                    ││
│  └───────────────────────────────────────────────────────┘│
│                                                           │
│                              [← 上一步]  [下一步 →]       │
└───────────────────────────────────────────────────────────┘
```

### 行為
- 進入此步驟時呼叫 `POST /api/v1/codegen/preview` 取得 diff
- Loading 時顯示 skeleton
- 失敗時顯示錯誤訊息 + 重試按鈕

## Step 3: 填寫 MR 資訊

```
┌─ 建立 Merge Request ──────────────────────────────── [X] ┐
│                                                           │
│  ○ 選擇變更 ─ ○ 預覽 ─ ● MR 資訊 ─ ○ 確認              │
│  ─────────────────────────────────────────────────────    │
│                                                           │
│  MR 標題                                                  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ chore(sync-model): update asr-general settings      │ │
│  └─────────────────────────────────────────────────────┘ │
│  自動產生，可修改（最長 200 字元）                          │
│                                                           │
│  MR 描述（選填）                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 增加 prod 副本數以應對流量                             │ │
│  │                                                     │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│  最長 5000 字元                                           │
│                                                           │
│  操作者                                                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ lynn.yang                                (自動帶入) │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│                              [← 上一步]  [下一步 →]       │
└───────────────────────────────────────────────────────────┘
```

### 表單規則
- Title：自動從 codegen 變更摘要產生，使用者可修改，max 200 chars
- Description：選填，max 5000 chars，textarea
- Created by：自動帶入登入使用者名稱，可修改

## Step 4: 確認 & 建立

```
┌─ 建立 Merge Request ──────────────────────────────── [X] ┐
│                                                           │
│  ○ 選擇變更 ─ ○ 預覽 ─ ○ MR 資訊 ─ ● 確認              │
│  ─────────────────────────────────────────────────────    │
│                                                           │
│  確認以下資訊後將建立 GitLab Merge Request：               │
│                                                           │
│  標題：chore(sync-model): update asr-general settings     │
│  操作者：lynn.yang                                        │
│  變更數：2 筆設定變更                                      │
│  影響檔案：1 個檔案                                       │
│  目標 Branch：main                                        │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ⚠ MR 建立後將推送至 GitLab，RD 將收到通知。         │ │
│  │   此操作無法撤回。                                    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│                        [← 上一步]  [確認建立 MR]          │
└───────────────────────────────────────────────────────────┘
```

### 建立中狀態

```
┌─ 建立 Merge Request ──────────────────────────────── [X] ┐
│                                                           │
│                                                           │
│              ⏳ 正在建立 Merge Request...                  │
│                                                           │
│              1. ✅ 產生程式碼                              │
│              2. ✅ 建立 Branch                             │
│              3. ⏳ 提交檔案變更                            │
│              4. ○ 建立 MR                                  │
│              5. ○ 發送通知                                 │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 成功狀態

```
┌─ Merge Request 已建立 ──────────────────────────── [X] ┐
│                                                         │
│              ✅ MR 建立成功！                             │
│                                                         │
│              MR #123                                     │
│              chore(sync-model): update asr-general       │
│                                                         │
│              [在 GitLab 查看 ↗]    [關閉]               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 步驟指示器 (Stepper)

```tsx
interface Step {
  label: string;
  status: "pending" | "current" | "completed";
}

const steps: Step[] = [
  { label: "選擇變更", status: "completed" },
  { label: "預覽", status: "current" },
  { label: "MR 資訊", status: "pending" },
  { label: "確認", status: "pending" },
];
```

- `completed`：圓形填色 + 勾號
- `current`：圓形填色 + 數字
- `pending`：圓形空心 + 數字
- 步驟間以線條連接，completed 段為填色線

## 依賴元件

| 元件 | 來源 | 用途 |
|------|------|------|
| `Dialog` | shadcn/ui | 對話框容器 |
| `Checkbox` | shadcn/ui | Step 1 變更選擇 |
| `Input` | shadcn/ui | Step 3 標題 |
| `Textarea` | shadcn/ui | Step 3 描述 |
| `Button` | shadcn/ui | 上一步/下一步/確認 |
| `Alert` | shadcn/ui | 警告提示 |
| `CodegenPreview` | `codegen-preview.md` | Step 2 程式碼預覽 |

## 對話框尺寸

| 斷點 | 寬度 | 高度 |
|------|------|------|
| < 768px | 100vw | 100vh（全螢幕） |
| >= 768px | 720px | max 85vh |
| >= 1024px | 840px | max 80vh |

## Accessibility

- 使用 `role="dialog"` 和 `aria-modal="true"`
- 步驟指示器使用 `aria-current="step"` 標記當前步驟
- 鍵盤導航：Tab 切換焦點、Enter/Space 觸發按鈕
- ESC 關閉對話框（建立進行中時不可關閉）
- Focus trap 限制在對話框內
