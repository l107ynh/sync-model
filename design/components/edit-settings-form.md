# EditSettingsForm 元件規格

## 概述
Model 設定編輯表單，以 Dialog 形式呈現。使用者可修改 deploy、GPU 設定、replica 等欄位，儲存前顯示 diff 預覽。

## Props Interface

```typescript
interface EditSettingsFormProps {
  /** 目前的 setting 資料 */
  setting: ModelSetting;
  /** 儲存成功回呼 */
  onSave: (changes: SettingChanges) => Promise<void>;
  /** 取消/關閉回呼 */
  onCancel: () => void;
  /** 是否正在送出 */
  isSubmitting?: boolean;
}

interface ModelSetting {
  id: string;
  model_component: { name: string; type: string };
  environment: { name: string };
  edition: { name: string };
  deploy: boolean;
  gpu_list: string[];
  replica: number;
  gpu_memory_utilization: number | null;
  extra_settings: Record<string, unknown>;
}

interface SettingChanges {
  deploy?: boolean;
  gpu_list?: string[];
  replica?: number;
  gpu_memory_utilization?: number;
  extra_settings?: Record<string, unknown>;
  reason?: string;
  changed_by: string;
}
```

## 表單欄位

| 欄位 | 元件 | 驗證規則 | data-testid |
|------|------|---------|-------------|
| Deploy | `<Switch>` | - | `field-deploy` |
| GPU List | `<Input>` (tag input) | 每項 max 50 chars | `field-gpu-list` |
| Replica | `<Input type="number">` | >= 0, 整數 | `field-replica` |
| GPU Memory Utilization | `<Slider>` + `<Input>` | >= 0, <= 1 | `field-gpu-memory` |
| Reason | `<Textarea>` | 選填, max 500 chars | `field-reason` |
| Changed By | `<Input>` | 必填, max 100 chars | `field-changed-by` |

## shadcn/ui 映射

| 內部元件 | shadcn/ui 元件 | 說明 |
|---------|---------------|------|
| 外層容器 | `<Dialog>` + `<DialogContent>` | 最大寬度 560px |
| 標題 | `<DialogHeader>` + `<DialogTitle>` | 顯示 model name + env + edition |
| 表單 | `<Form>` (react-hook-form + zod) | 統一驗證 |
| Deploy 開關 | `<Switch>` | label: "部署狀態" |
| GPU List | `<Input>` + `<Badge>` | Enter 新增 tag, X 移除 |
| Replica | `<Input type="number">` | min=0, step=1 |
| GPU Mem | `<Slider>` + `<Input>` | 連動，Slider step=0.01 |
| Reason | `<Textarea>` | placeholder: "變更原因（選填）" |
| Changed By | `<Input>` | placeholder: "操作者名稱" |
| 按鈕列 | `<DialogFooter>` | 取消 `<Button variant="ghost">` + 儲存 `<Button>` |

## 驗證規則 (Zod Schema)

```typescript
import { z } from "zod";

const editSettingsSchema = z.object({
  deploy: z.boolean().optional(),
  gpu_list: z.array(z.string().max(50)).optional(),
  replica: z.number().int().min(0, "Replica 不可為負數").optional(),
  gpu_memory_utilization: z
    .number()
    .min(0, "GPU 記憶體使用率不可小於 0")
    .max(1, "GPU 記憶體使用率不可大於 1")
    .optional(),
  reason: z.string().max(500).optional(),
  changed_by: z.string().min(1, "操作者為必填").max(100),
});
```

## 狀態流程

```
初始狀態（載入 setting 值）
  │
  ├─ 使用者修改欄位
  │   └─ 表單驗證（即時）
  │
  ├─ 點擊「儲存」
  │   ├─ 驗證失敗 → 顯示欄位錯誤
  │   └─ 驗證通過 → 比對 diff → 開啟 ConfirmDialog
  │
  ├─ ConfirmDialog
  │   ├─ 確認 → onSave() → loading 狀態 → 成功關閉 / 失敗顯示 toast
  │   └─ 取消 → 回到表單
  │
  └─ 點擊「取消」→ onCancel()
```

## 範例程式碼

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function EditSettingsForm({
  setting,
  onSave,
  onCancel,
  isSubmitting = false,
}: EditSettingsFormProps) {
  const form = useForm({
    resolver: zodResolver(editSettingsSchema),
    defaultValues: {
      deploy: setting.deploy,
      gpu_list: setting.gpu_list,
      replica: setting.replica,
      gpu_memory_utilization: setting.gpu_memory_utilization ?? 0,
      reason: "",
      changed_by: "",
    },
  });

  const [showConfirm, setShowConfirm] = React.useState(false);
  const [diffData, setDiffData] = React.useState<Record<string, unknown> | null>(null);

  function handleSubmit(values: z.infer<typeof editSettingsSchema>) {
    // 計算 diff
    const diff = computeDiff(setting, values);
    if (Object.keys(diff).length === 0) {
      form.setError("root", { message: "沒有任何修改" });
      return;
    }
    setDiffData(diff);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    const values = form.getValues();
    await onSave(values);
  }

  return (
    <>
      <Dialog open onOpenChange={() => onCancel()}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              編輯 {setting.model_component.name}
              <span className="ml-2 text-sm text-slate-500">
                {setting.environment.name} / {setting.edition.name}
              </span>
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Deploy */}
              <FormField
                control={form.control}
                name="deploy"
                render={({ field }) => (
                  <FormItem data-testid="field-deploy">
                    <FormLabel>部署狀態</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Replica */}
              <FormField
                control={form.control}
                name="replica"
                render={({ field }) => (
                  <FormItem data-testid="field-replica">
                    <FormLabel>Replica</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} />
                    </FormControl>
                    <FormMessage data-testid="field-replica-error" />
                  </FormItem>
                )}
              />

              {/* GPU Memory Utilization */}
              <FormField
                control={form.control}
                name="gpu_memory_utilization"
                render={({ field }) => (
                  <FormItem data-testid="field-gpu-memory">
                    <FormLabel>GPU Memory Utilization</FormLabel>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-20"
                        {...field}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reason */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem data-testid="field-reason">
                    <FormLabel>變更原因（選填）</FormLabel>
                    <FormControl>
                      <Textarea placeholder="變更原因" maxLength={500} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Changed By */}
              <FormField
                control={form.control}
                name="changed_by"
                render={({ field }) => (
                  <FormItem data-testid="field-changed-by">
                    <FormLabel>操作者</FormLabel>
                    <FormControl>
                      <Input placeholder="操作者名稱" maxLength={100} {...field} />
                    </FormControl>
                    <FormMessage data-testid="field-changed-by-error" />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel}>
                  取消
                </Button>
                <Button type="submit" data-testid="btn-save" disabled={isSubmitting}>
                  {isSubmitting ? "儲存中..." : "儲存"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {showConfirm && diffData && (
        <ConfirmDialog
          diff={diffData}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
```

## Accessibility

- Dialog 開啟時 focus 自動移至第一個表單欄位
- Switch 具有 `role="switch"` 和 `aria-checked`
- 必填欄位標示 `aria-required="true"`
- 表單錯誤訊息以 `aria-describedby` 關聯到對應欄位
- Esc 鍵關閉 Dialog
