/**
 * F-004: Settings Edit Browser Tests (Playwright)
 *
 * 對應 specs/features/f004-settings-edit.md — UI 規格
 *
 * 注意：這些測試需要前端 UI 實作完成後才能執行。
 *       目前全部標記為 test.skip，待 UI 就緒後解除。
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helper: 導航到設定表格頁面
// ---------------------------------------------------------------------------
async function navigateToSettingsTable(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL);
  const firstCard = page.locator('[data-testid="version-card"]').first();
  await expect(firstCard).toBeVisible({ timeout: 10_000 });
  await firstCard.click();
  await page.locator('[data-testid="settings-table"]').waitFor({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// 編輯表單
// ---------------------------------------------------------------------------
test.describe('F-004 設定編輯 — 單一編輯', () => {
  test.skip('WHEN user clicks Edit THEN edit form opens', async ({ page }) => {
    await navigateToSettingsTable(page);

    // 點擊第一行的編輯按鈕或行本身
    const firstRow = page.locator('[data-testid="settings-table"] tbody tr').first();
    await firstRow.click();

    // 編輯面板/dialog 應出現
    const editForm = page.locator('[data-testid="edit-settings-form"]');
    await expect(editForm).toBeVisible({ timeout: 5_000 });

    // 驗證表單欄位存在
    await expect(editForm.locator('[data-testid="field-deploy"]')).toBeVisible();
    await expect(editForm.locator('[data-testid="field-replica"]')).toBeVisible();
    await expect(editForm.locator('[data-testid="field-gpu-memory"]')).toBeVisible();
    await expect(editForm.locator('[data-testid="field-changed-by"]')).toBeVisible();
  });

  test.skip('WHEN user changes deploy toggle THEN confirm dialog shows diff', async ({ page }) => {
    await navigateToSettingsTable(page);

    // 開啟編輯表單
    const firstRow = page.locator('[data-testid="settings-table"] tbody tr').first();
    await firstRow.click();

    const editForm = page.locator('[data-testid="edit-settings-form"]');
    await expect(editForm).toBeVisible({ timeout: 5_000 });

    // 切換 deploy toggle
    const deployToggle = editForm.locator('[data-testid="field-deploy"] [role="switch"]');
    await deployToggle.click();

    // 填入 changed_by
    const changedByInput = editForm.locator('[data-testid="field-changed-by"] input');
    await changedByInput.fill('browser-test');

    // 點擊儲存
    const saveButton = editForm.locator('[data-testid="btn-save"]');
    await saveButton.click();

    // 確認對話框應出現，顯示 diff
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });

    // diff 區域應顯示 deploy 的變更
    const diffArea = confirmDialog.locator('[data-testid="diff-preview"]');
    await expect(diffArea).toBeVisible();
    await expect(diffArea).toContainText('deploy');
  });

  test.skip('WHEN user confirms THEN setting updated and table refreshed', async ({ page }) => {
    await navigateToSettingsTable(page);

    // 記錄第一行的 replica 值
    const firstRow = page.locator('[data-testid="settings-table"] tbody tr').first();
    await firstRow.click();

    const editForm = page.locator('[data-testid="edit-settings-form"]');
    await expect(editForm).toBeVisible({ timeout: 5_000 });

    // 修改 replica
    const replicaInput = editForm.locator('[data-testid="field-replica"] input');
    await replicaInput.clear();
    await replicaInput.fill('7');

    // 填入必要欄位
    const changedByInput = editForm.locator('[data-testid="field-changed-by"] input');
    await changedByInput.fill('browser-test');

    // 儲存
    await editForm.locator('[data-testid="btn-save"]').click();

    // 確認對話框 → 確認
    const confirmBtn = page.locator('[data-testid="confirm-dialog"] [data-testid="btn-confirm"]');
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    // 等待成功提示或表單關閉
    await expect(editForm).not.toBeVisible({ timeout: 5_000 });

    // 表格應刷新，第一行的 replica 應為 7
    await page.waitForTimeout(1_000);
    const replicaCell = firstRow.locator('[data-testid="cell-replica"]');
    await expect(replicaCell).toHaveText('7');
  });
});

// ---------------------------------------------------------------------------
// 批量編輯
// ---------------------------------------------------------------------------
test.describe('F-004 設定編輯 — 批量編輯', () => {
  test.skip('WHEN user selects multiple rows THEN batch edit bar appears', async ({ page }) => {
    await navigateToSettingsTable(page);

    // 勾選前兩行的 checkbox
    const checkboxes = page.locator('[data-testid="settings-table"] [data-testid="row-checkbox"]');
    const count = await checkboxes.count();
    if (count < 2) return;

    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();

    // 批量編輯列出現
    const batchBar = page.locator('[data-testid="batch-edit-bar"]');
    await expect(batchBar).toBeVisible();
    await expect(batchBar).toContainText('2');

    // 批量修改 deploy 按鈕可見
    await expect(batchBar.locator('[data-testid="btn-batch-deploy"]')).toBeVisible();
  });

  test.skip('WHEN user clicks batch deploy toggle THEN confirmation shows affected models', async ({ page }) => {
    await navigateToSettingsTable(page);

    const checkboxes = page.locator('[data-testid="settings-table"] [data-testid="row-checkbox"]');
    const count = await checkboxes.count();
    if (count < 2) return;

    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();

    const batchBar = page.locator('[data-testid="batch-edit-bar"]');
    await batchBar.locator('[data-testid="btn-batch-deploy"]').click();

    // 確認對話框顯示影響的 model 清單
    const confirmDialog = page.locator('[data-testid="batch-confirm-dialog"]');
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
    await expect(confirmDialog).toContainText('2');
  });
});

// ---------------------------------------------------------------------------
// 表單驗證
// ---------------------------------------------------------------------------
test.describe('F-004 設定編輯 — 表單驗證', () => {
  test.skip('WHEN user enters negative replica THEN validation error shown', async ({ page }) => {
    await navigateToSettingsTable(page);

    const firstRow = page.locator('[data-testid="settings-table"] tbody tr').first();
    await firstRow.click();

    const editForm = page.locator('[data-testid="edit-settings-form"]');
    await expect(editForm).toBeVisible({ timeout: 5_000 });

    const replicaInput = editForm.locator('[data-testid="field-replica"] input');
    await replicaInput.clear();
    await replicaInput.fill('-1');

    // 應顯示驗證錯誤
    const error = editForm.locator('[data-testid="field-replica-error"]');
    await expect(error).toBeVisible();
  });

  test.skip('WHEN user leaves changed_by empty THEN save button disabled or validation error', async ({ page }) => {
    await navigateToSettingsTable(page);

    const firstRow = page.locator('[data-testid="settings-table"] tbody tr').first();
    await firstRow.click();

    const editForm = page.locator('[data-testid="edit-settings-form"]');
    await expect(editForm).toBeVisible({ timeout: 5_000 });

    // 確保 changed_by 為空
    const changedByInput = editForm.locator('[data-testid="field-changed-by"] input');
    await changedByInput.clear();

    // 修改一個值
    const deployToggle = editForm.locator('[data-testid="field-deploy"] [role="switch"]');
    await deployToggle.click();

    // 儲存按鈕應 disabled 或點擊後出現錯誤
    const saveButton = editForm.locator('[data-testid="btn-save"]');
    const isDisabled = await saveButton.isDisabled();
    if (!isDisabled) {
      await saveButton.click();
      const error = editForm.locator('[data-testid="field-changed-by-error"]');
      await expect(error).toBeVisible();
    }
  });
});
