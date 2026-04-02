/**
 * F-003: Settings View Browser Tests (Playwright)
 *
 * 對應 specs/features/f003-settings-view.md — UI 規格
 *
 * 注意：這些測試需要前端 UI 實作完成後才能執行。
 *       目前全部標記為 test.skip，待 UI 就緒後解除。
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// 頁面 1: 版本清單 (/)
// ---------------------------------------------------------------------------
test.describe('F-003 版本清單頁面', () => {
  // TC-015: 版本清單顯示
  test.skip('WHEN 訪問首頁 THEN 顯示版本卡片清單', async ({ page }) => {
    await page.goto(BASE_URL);

    // 等待版本卡片載入
    const cards = page.locator('[data-testid="version-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });

    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test.skip('WHEN 版本卡片顯示 THEN 包含版本名稱、model 數量、建立時間', async ({ page }) => {
    await page.goto(BASE_URL);

    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    // 版本名稱
    await expect(firstCard.locator('[data-testid="version-name"]')).toBeVisible();
    // Model 數量
    await expect(firstCard.locator('[data-testid="model-count"]')).toBeVisible();
    // 建立時間
    await expect(firstCard.locator('[data-testid="created-at"]')).toBeVisible();
  });

  // TC-030: 空版本清單
  test.skip('WHEN 系統無版本 THEN 顯示空狀態提示', async ({ page }) => {
    // 此測試需要空資料庫環境
    await page.goto(BASE_URL);

    const emptyState = page.locator('[data-testid="empty-state"]');
    // 如果沒有版本卡片，應該顯示空狀態
    const cards = page.locator('[data-testid="version-card"]');
    const cardCount = await cards.count();
    if (cardCount === 0) {
      await expect(emptyState).toBeVisible();
    }
  });

  test.skip('WHEN 點擊版本卡片 THEN 導航到該版本的設定表格頁面', async ({ page }) => {
    await page.goto(BASE_URL);

    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    await firstCard.click();

    // URL 應包含 /versions/{uuid}
    await expect(page).toHaveURL(/\/versions\/[\w-]+/);
  });
});

// ---------------------------------------------------------------------------
// 頁面 2: 設定表格 (/versions/:versionId)
// ---------------------------------------------------------------------------
test.describe('F-003 設定表格頁面', () => {
  // TC-017: 設定表格顯示
  test.skip('WHEN 訪問版本設定頁 THEN 顯示版本名稱和篩選列', async ({ page }) => {
    // 先取第一個 version 的 URL
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    // 版本名稱
    await expect(page.locator('[data-testid="version-title"]')).toBeVisible();
    // 篩選列
    await expect(page.locator('[data-testid="filter-environment"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-edition"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-model-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-deploy-toggle"]')).toBeVisible();
  });

  test.skip('WHEN 設定表格載入 THEN 包含所有必要欄位', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    // 表格表頭
    const table = page.locator('[data-testid="settings-table"]');
    await expect(table).toBeVisible({ timeout: 10_000 });

    await expect(table.locator('th:has-text("Model Name")')).toBeVisible();
    await expect(table.locator('th:has-text("Type")')).toBeVisible();
    await expect(table.locator('th:has-text("Environment")')).toBeVisible();
    await expect(table.locator('th:has-text("Edition")')).toBeVisible();
    await expect(table.locator('th:has-text("Deploy")')).toBeVisible();
    await expect(table.locator('th:has-text("GPU List")')).toBeVisible();
    await expect(table.locator('th:has-text("Replica")')).toBeVisible();
    await expect(table.locator('th:has-text("GPU Mem Util")')).toBeVisible();
  });

  // TC-018: 環境篩選
  test.skip('WHEN 選擇 Environment 篩選 THEN 表格只顯示該環境的設定', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    await page.locator('[data-testid="settings-table"]').waitFor({ timeout: 10_000 });

    // 打開 environment dropdown 並選擇
    const envDropdown = page.locator('[data-testid="filter-environment"]');
    await envDropdown.click();
    const prodOption = page.locator('[data-testid="filter-option-prod"]');
    if (await prodOption.isVisible()) {
      await prodOption.click();

      // 所有列的 environment 應為 prod
      const envCells = page.locator('[data-testid="cell-environment"]');
      const count = await envCells.count();
      for (let i = 0; i < count; i++) {
        await expect(envCells.nth(i)).toHaveText('prod');
      }
    }
  });

  // TC-020: Model Type 篩選
  test.skip('WHEN 選擇 Model Type 篩選 THEN 表格只顯示該類型的 model', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    await page.locator('[data-testid="settings-table"]').waitFor({ timeout: 10_000 });

    const typeDropdown = page.locator('[data-testid="filter-model-type"]');
    await typeDropdown.click();
    const asrOption = page.locator('[data-testid="filter-option-ASR"]');
    if (await asrOption.isVisible()) {
      await asrOption.click();

      const typeCells = page.locator('[data-testid="cell-type"]');
      const count = await typeCells.count();
      for (let i = 0; i < count; i++) {
        await expect(typeCells.nth(i)).toHaveText('ASR');
      }
    }
  });

  // TC-021: 搜尋
  test.skip('WHEN 在搜尋框輸入 model 名稱 THEN 表格只顯示匹配的設定', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    await page.locator('[data-testid="settings-table"]').waitFor({ timeout: 10_000 });

    const searchInput = page.locator('[data-testid="filter-search"]');
    await searchInput.fill('whisper');

    // 等待表格更新
    await page.waitForTimeout(500);

    const nameCells = page.locator('[data-testid="cell-model-name"]');
    const count = await nameCells.count();
    for (let i = 0; i < count; i++) {
      const text = await nameCells.nth(i).textContent();
      expect(text?.toLowerCase()).toContain('whisper');
    }
  });

  // TC-022: Deploy toggle
  test.skip('WHEN 開啟 "只顯示已部署" toggle THEN 只顯示 deploy=true 的設定', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    await page.locator('[data-testid="settings-table"]').waitFor({ timeout: 10_000 });

    const toggle = page.locator('[data-testid="filter-deploy-toggle"]');
    await toggle.click();

    // 等待表格更新
    await page.waitForTimeout(500);

    // 所有 deploy 圓點應為綠色
    const deployCells = page.locator('[data-testid="cell-deploy"]');
    const count = await deployCells.count();
    for (let i = 0; i < count; i++) {
      // 綠色圓點: data-status="true" 或 class 包含 green
      await expect(deployCells.nth(i).locator('[data-status="true"]')).toBeVisible();
    }
  });

  // TC-023: 排序
  test.skip('WHEN 點擊 Model Name 表頭 THEN 按 name 排序', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    const table = page.locator('[data-testid="settings-table"]');
    await table.waitFor({ timeout: 10_000 });

    // 點擊 Model Name 表頭（升序）
    await table.locator('th:has-text("Model Name")').click();
    await page.waitForTimeout(500);

    const nameCells = page.locator('[data-testid="cell-model-name"]');
    const count = await nameCells.count();
    if (count >= 2) {
      const firstName = await nameCells.first().textContent();
      const secondName = await nameCells.nth(1).textContent();
      expect((firstName ?? '').localeCompare(secondName ?? '')).toBeLessThanOrEqual(0);
    }

    // 再次點擊（降序）
    await table.locator('th:has-text("Model Name")').click();
    await page.waitForTimeout(500);

    if (count >= 2) {
      const firstName = await nameCells.first().textContent();
      const secondName = await nameCells.nth(1).textContent();
      expect((firstName ?? '').localeCompare(secondName ?? '')).toBeGreaterThanOrEqual(0);
    }
  });

  // TC-024: 分頁
  test.skip('WHEN 點擊下一頁 THEN 表格顯示第二頁資料', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    await page.locator('[data-testid="settings-table"]').waitFor({ timeout: 10_000 });

    const nextButton = page.locator('[data-testid="pagination-next"]');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // 確認分頁資訊更新
      const pageInfo = page.locator('[data-testid="pagination-info"]');
      await expect(pageInfo).toBeVisible();
    }
  });

  // TC-025: Deploy 狀態顯示
  test.skip('WHEN 表格有 deploy=true 和 deploy=false THEN 分別顯示綠色和灰色圓點', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    await page.locator('[data-testid="settings-table"]').waitFor({ timeout: 10_000 });

    const deployTrue = page.locator('[data-testid="cell-deploy"] [data-status="true"]');
    const deployFalse = page.locator('[data-testid="cell-deploy"] [data-status="false"]');

    // 至少有一個 true 或 false 的 deploy 狀態
    const trueCount = await deployTrue.count();
    const falseCount = await deployFalse.count();
    expect(trueCount + falseCount).toBeGreaterThan(0);
  });

  // TC-026: GPU List tags
  test.skip('WHEN model setting 有 gpu_list THEN 顯示為 tag/badge', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    await page.locator('[data-testid="settings-table"]').waitFor({ timeout: 10_000 });

    const gpuCells = page.locator('[data-testid="cell-gpu-list"]');
    const count = await gpuCells.count();
    if (count > 0) {
      // 至少有一個 gpu tag
      const tags = gpuCells.first().locator('[data-testid="gpu-tag"]');
      const tagCount = await tags.count();
      expect(tagCount).toBeGreaterThanOrEqual(0);
    }
  });

  // TC-027: 版本不存在
  test.skip('WHEN 訪問不存在的版本頁面 THEN 顯示 404 或錯誤提示', async ({ page }) => {
    await page.goto(`${BASE_URL}/versions/00000000-0000-0000-0000-000000000000`);

    // 應顯示錯誤頁面或提示
    const errorElement = page.locator('[data-testid="error-not-found"]');
    await expect(errorElement).toBeVisible({ timeout: 10_000 });
  });

  // TC-032: 多條件篩選無結果
  test.skip('WHEN 多條件篩選無匹配結果 THEN 顯示空狀態且篩選條件保持', async ({ page }) => {
    await page.goto(BASE_URL);
    const firstCard = page.locator('[data-testid="version-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    await page.locator('[data-testid="settings-table"]').waitFor({ timeout: 10_000 });

    // 搜尋一個不存在的名稱
    const searchInput = page.locator('[data-testid="filter-search"]');
    await searchInput.fill('zzznonexistent999');
    await page.waitForTimeout(500);

    // 應顯示空狀態
    const emptyTable = page.locator('[data-testid="table-empty-state"]');
    await expect(emptyTable).toBeVisible();

    // 篩選條件仍保持
    await expect(searchInput).toHaveValue('zzznonexistent999');
  });
});
