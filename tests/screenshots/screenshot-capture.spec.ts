/**
 * 自動化截圖採集腳本
 *
 * 用途：自動採集教學所需的頁面截圖
 * 執行：pnpm playwright test tests/screenshots/screenshot-capture.spec.ts
 *
 * 輸出：docs/screenshots-tutorial/screenshots/
 */

import { test } from '@playwright/test';

// 測試帳號設定
const TEST_CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'Test1234!',
};

// 截圖設定
const SCREENSHOT_CONFIG = {
  fullPage: false,
  animations: 'allow' as const,
};

test.describe('教學截圖採集', () => {
  let baseURL: string;

  test.beforeAll(async () => {
    baseURL = process.env.BASE_URL || 'http://localhost:3000';
    console.log(`📸 開始採集截圖，目標網站: ${baseURL}`);
  });

  // ============================================
  // 基礎流程 (1-5)
  // ============================================

  test('01-註冊頁面', async ({ page }) => {
    await page.goto(`${baseURL}/register`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/01-registration.png',
    });
    console.log('✅ 01-註冊頁面');
  });

  test('02-登入頁面', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/02-login.png',
    });
    console.log('✅ 02-登入頁面');
  });

  test('03-Onboarding 選擇', async ({ page }) => {
    // 先登入
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // 等待跳轉到 onboarding 或 dashboard
    await page.waitForTimeout(2000);

    // 如果已經有公司，先登出並清除公司
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      // 需要測試新用戶流程
      console.log('⚠️ 03-已有公司，跳過 onboarding 截圖');
      return;
    }

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/03-onboarding.png',
    });
    console.log('✅ 03-Onboarding 選擇');
  });

  test('04-儀表板', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // 等待登入完成
    await page.waitForURL(`${baseURL}/dashboard`, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/04-dashboard.png',
    });
    console.log('✅ 04-儀表板');
  });

  test('05-教學頁面', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(`${baseURL}/dashboard`, { timeout: 10000 });

    // 點擊教學按鈕或導航到 /guide
    await page.goto(`${baseURL}/guide`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/05-guide-page.png',
    });
    console.log('✅ 05-教學頁面');
  });

  // ============================================
  // 報價單管理 (6-11)
  // ============================================

  test('06-報價單列表', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/quotations`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/06-quotations-list.png',
    });
    console.log('✅ 06-報價單列表');
  });

  test('07-新增報價單', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/quotations/new`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/07-quotation-new.png',
    });
    console.log('✅ 07-新增報價單');
  });

  test('08-新增報價項目', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/quotations/new`);
    await page.waitForLoadState('networkidle');

    // 填寫基本資料以顯示項目新增區
    try {
      await page.selectOption('select[name="customer_id"]', { index: 0 });
      await page.waitForTimeout(500);
    } catch {
      // 沒有客戶也沒關係，繼續截圖
    }

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/08-quotation-add-items.png',
    });
    console.log('✅ 08-新增報價項目');
  });

  test('09-報價預覽', async ({ page }) => {
    await login(page, baseURL);

    // 先取得第一個報價單 ID
    await page.goto(`${baseURL}/quotations`);
    await page.waitForLoadState('networkidle');

    const quotationLink = page.locator('a[href^="/quotations/"]').first();
    const href = await quotationLink.getAttribute('href');

    if (href) {
      await page.goto(`${baseURL}${href}`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        ...SCREENSHOT_CONFIG,
        path: 'docs/screenshots-tutorial/screenshots/09-quotation-preview.png',
      });
      console.log('✅ 09-報價預覽');
    } else {
      console.log('⚠️ 09-沒有報價單，跳過預覽截圖');
    }
  });

  test('10-編輯報價單', async ({ page }) => {
    await login(page, baseURL);

    // 取得第一個報價單並前往編輯頁面
    await page.goto(`${baseURL}/quotations`);
    await page.waitForLoadState('networkidle');

    const quotationLink = page.locator('a[href^="/quotations/"]').first();
    const href = await quotationLink.getAttribute('href');

    if (href) {
      await page.goto(`${baseURL}${href}/edit`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        ...SCREENSHOT_CONFIG,
        path: 'docs/screenshots-tutorial/screenshots/10-quotation-edit.png',
      });
      console.log('✅ 10-編輯報價單');
    } else {
      console.log('⚠️ 10-沒有報價單，跳過編輯截圖');
    }
  });

  test('11-PDF 下載', async ({ page }) => {
    await login(page, baseURL);

    // 取得第一個報價單
    await page.goto(`${baseURL}/quotations`);
    await page.waitForLoadState('networkidle');

    const quotationLink = page.locator('a[href^="/quotations/"]').first();
    const href = await quotationLink.getAttribute('href');

    if (href) {
      await page.goto(`${baseURL}${href}`);
      await page.waitForLoadState('networkidle');

      // 截圖包含下載按鈕的頁面
      await page.screenshot({
        ...SCREENSHOT_CONFIG,
        path: 'docs/screenshots-tutorial/screenshots/11-quotation-pdf-download.png',
      });
      console.log('✅ 11-PDF 下載');
    } else {
      console.log('⚠️ 11-沒有報價單，跳過 PDF 下載截圖');
    }
  });

  // ============================================
  // 產品管理 (12-14)
  // ============================================

  test('12-產品列表', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/products`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/12-products-list.png',
    });
    console.log('✅ 12-產品列表');
  });

  test('13-新增產品', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/products/new`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/13-product-new.png',
    });
    console.log('✅ 13-新增產品');
  });

  // ============================================
  // 客戶管理 (15-17)
  // ============================================

  test('15-客戶列表', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/customers`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/15-customers-list.png',
    });
    console.log('✅ 15-客戶列表');
  });

  test('16-新增客戶', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/customers/new`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/16-customer-new.png',
    });
    console.log('✅ 16-新增客戶');
  });

  // ============================================
  // 會計功能 (18-22)
  // ============================================

  test('18-發票列表', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/accounting/invoices`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/18-invoices-list.png',
    });
    console.log('✅ 18-發票列表');
  });

  test('20-分錄列表', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/accounting/journals`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/20-journals-list.png',
    });
    console.log('✅ 20-分錄列表');
  });

  test('21-營業稅申報', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/accounting/reports`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/21-vat-filing.png',
    });
    console.log('✅ 21-營業稅申報');
  });

  test('22-所得稅擴大書審', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/accounting/income-tax`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/22-income-tax-audit.png',
    });
    console.log('✅ 22-所得稅擴大書審');
  });

  // ============================================
  // 付款管理 (23-25)
  // ============================================

  test('23-付款列表', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/payments`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/23-payments-list.png',
    });
    console.log('✅ 23-付款列表');
  });

  // ============================================
  // 合約管理 (26-27)
  // ============================================

  test('26-合約列表', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/contracts`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/26-contracts-list.png',
    });
    console.log('✅ 26-合約列表');
  });

  test('27-合約詳情', async ({ page }) => {
    await login(page, baseURL);

    // 取得第一個合約 ID
    await page.goto(`${baseURL}/contracts`);
    await page.waitForLoadState('networkidle');

    const contractLink = page.locator('a[href^="/contracts/"]').first();
    const href = await contractLink.getAttribute('href');

    if (href) {
      await page.goto(`${baseURL}${href}`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        ...SCREENSHOT_CONFIG,
        path: 'docs/screenshots-tutorial/screenshots/27-contract-detail.png',
      });
      console.log('✅ 27-合約詳情');
    } else {
      console.log('⚠️ 27-沒有合約，跳過詳情截圖');
    }
  });

  // ============================================
  // 設定 (28-30)
  // ============================================

  test('28-公司設定', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/settings`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/28-settings-company.png',
    });
    console.log('✅ 28-公司設定');
  });

  test('30-訂閱方案', async ({ page }) => {
    await login(page, baseURL);
    await page.goto(`${baseURL}/pricing`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      ...SCREENSHOT_CONFIG,
      path: 'docs/screenshots-tutorial/screenshots/30-pricing.png',
    });
    console.log('✅ 30-訂閱方案');
  });
});

/**
 * 輔助函數：登入
 */
async function login(page: Page, baseURL: string) {
  await page.goto(`${baseURL}/login`);
  await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]');

  // 等待登入完成
  await page.waitForURL(`${baseURL}/dashboard`, { timeout: 10000 });
  await page.waitForTimeout(500);
}
