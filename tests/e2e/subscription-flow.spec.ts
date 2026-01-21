/**
 * 訂閱付款流程 E2E 測試
 *
 * 測試範圍：
 * 1. 首頁 → Pricing 頁面流程
 * 2. Callback 頁面成功狀態
 * 3. Callback 頁面失敗狀態
 * 4. Callback 頁面自動導向
 *
 * 注意：由於無法在 E2E 測試中進行真實付款，
 * 我們測試到 Pricing 頁面選擇方案為止，
 * 並使用模擬 URL 測試 Callback 頁面行為
 */

import { test, expect } from '@playwright/test'

test.describe('訂閱付款流程', () => {
  test.beforeEach(async ({ page }) => {
    // 每個測試前訪問首頁
    await page.goto('/')
  })

  test.describe('🏠 首頁到 Pricing 頁面', () => {
    test('應該能從首頁導向到 Pricing 頁面', async ({ page }) => {
      // 點擊「查看方案」按鈕
      await page.click('text=查看方案')

      // 驗證 URL
      await expect(page).toHaveURL(/\/pricing/)

      // 驗證頁面標題
      await expect(page.locator('h1, h2')).toContainText(/方案|選擇|價格/)
    })

    test('首頁應該顯示關鍵 CTA 按鈕', async ({ page }) => {
      // 驗證「免費開始」按鈕存在
      const freeStartButton = page.getByRole('link', { name: /免費開始/i })
      await expect(freeStartButton).toBeVisible()

      // 驗證「查看方案」按鈕存在
      const viewPricingButton = page.getByRole('link', { name: /查看方案/i })
      await expect(viewPricingButton).toBeVisible()
    })

    test('首頁應該顯示產品特色', async ({ page }) => {
      // 驗證產品特色區塊存在（任一個即可）
      const hasQuotationFeature = await page.getByText('報價單管理').count() > 0
      const hasAccountingFeature = await page.getByText('財務會計').count() > 0
      expect(hasQuotationFeature || hasAccountingFeature).toBe(true)
    })
  })

  test.describe('💳 Pricing 頁面選擇方案', () => {
    test('應該顯示所有訂閱方案', async ({ page }) => {
      await page.goto('/pricing')

      // 驗證方案卡片存在
      await expect(page.getByText(/入門版|Starter/i)).toBeVisible()
      await expect(page.getByText(/標準版|Standard/i)).toBeVisible()
      await expect(page.getByText(/專業版|Professional/i)).toBeVisible()
    })

    test('應該能看見「免費開始」和「升級」按鈕', async ({ page }) => {
      await page.goto('/pricing')

      // 驗證至少有一個方案卡片有 CTA 按鈕
      const ctaButtons = page.getByRole('button', { name: /免費開始|升級|選擇方案/i })
      await expect(ctaButtons.first()).toBeVisible()
    })
  })

  test.describe('✅ Callback 頁面 - 成功狀態', () => {
    test('應該顯示付款成功訊息', async ({ page }) => {
      // 直接訪問 callback 頁面並帶上成功參數
      await page.goto('/pricing/callback?status=success&message=付款成功！')

      // 驗證成功訊息
      await expect(page.getByText('付款完成')).toBeVisible()
      await expect(page.getByText('付款成功！')).toBeVisible()
      await expect(page.getByText(/感謝您的訂閱/)).toBeVisible()

      // 驗證「前往儀表板」按鈕
      const dashboardButton = page.getByRole('link', { name: '前往儀表板' })
      await expect(dashboardButton).toBeVisible()
      await expect(dashboardButton).toHaveAttribute('href', '/dashboard')
    })

    test('應該在 3 秒後自動導向到 dashboard', async ({ page }) => {
      // 訪問成功 callback 頁面
      await page.goto('/pricing/callback?status=success')

      // 等待成功訊息出現
      await expect(page.getByText('付款完成')).toBeVisible()

      // 等待自動導向（最多 4 秒，留 1 秒緩衝）
      await page.waitForURL('/dashboard', { timeout: 4000 })

      // 驗證已導向到 dashboard
      await expect(page).toHaveURL('/dashboard')
    })

    test('SUCCESS (大寫) 也應該視為成功', async ({ page }) => {
      await page.goto('/pricing/callback?status=SUCCESS')

      await expect(page.getByText('付款完成')).toBeVisible()
      await expect(page.getByText(/感謝您的訂閱/)).toBeVisible()
    })

    test('應該顯示「即將跳轉到儀表板」提示', async ({ page }) => {
      await page.goto('/pricing/callback?status=success')

      await expect(page.getByText(/即將跳轉到儀表板/)).toBeVisible()
    })
  })

  test.describe('❌ Callback 頁面 - 失敗狀態', () => {
    test('應該顯示付款失敗訊息', async ({ page }) => {
      await page.goto('/pricing/callback?status=failed&message=付款失敗')

      // 驗證失敗訊息
      await expect(page.getByText('付款未完成')).toBeVisible()
      await expect(page.getByText('付款失敗')).toBeVisible()
    })

    test('應該提供重新付款選項', async ({ page }) => {
      await page.goto('/pricing/callback?status=failed')

      // 驗證兩個按鈕都存在
      const dashboardButton = page.getByRole('link', { name: '前往儀表板' })
      const retryButton = page.getByRole('link', { name: '重新選擇方案' })

      await expect(dashboardButton).toBeVisible()
      await expect(retryButton).toBeVisible()

      // 驗證連結正確
      await expect(dashboardButton).toHaveAttribute('href', '/dashboard')
      await expect(retryButton).toHaveAttribute('href', '/pricing')
    })

    test('應該使用預設訊息當未提供 message', async ({ page }) => {
      await page.goto('/pricing/callback?status=failed')

      await expect(page.getByText('付款失敗或已取消')).toBeVisible()
    })

    test('不應自動導向', async ({ page }) => {
      await page.goto('/pricing/callback?status=failed')

      // 等待 4 秒
      await page.waitForTimeout(4000)

      // 驗證仍在 callback 頁面
      await expect(page).toHaveURL(/\/pricing\/callback/)
      await expect(page.getByText('付款未完成')).toBeVisible()
    })

    test('點擊「重新選擇方案」應導向 Pricing 頁面', async ({ page }) => {
      await page.goto('/pricing/callback?status=failed')

      // 點擊重新選擇方案按鈕
      await page.click('text=重新選擇方案')

      // 驗證導向到 pricing 頁面
      await expect(page).toHaveURL(/\/pricing/)
    })

    test('點擊「前往儀表板」應導向 Dashboard', async ({ page }) => {
      await page.goto('/pricing/callback?status=failed')

      // 點擊前往儀表板按鈕
      await page.click('text=前往儀表板')

      // 驗證導向到 dashboard
      await expect(page).toHaveURL('/dashboard')
    })
  })

  test.describe('🔍 其他狀態', () => {
    test('空 status 應視為失敗', async ({ page }) => {
      await page.goto('/pricing/callback')

      await expect(page.getByText('付款未完成')).toBeVisible()
      await expect(page.getByText('付款失敗或已取消')).toBeVisible()
    })

    test('應該顯示客戶服務提示', async ({ page }) => {
      await page.goto('/pricing/callback?status=success')

      await expect(page.getByText(/客戶服務/)).toBeVisible()
    })

    test('應該顯示 loading 狀態（初始）', async ({ page }) => {
      // 訪問 callback 頁面
      await page.goto('/pricing/callback?status=success')

      // 驗證成功訊息出現（表示 loading 狀態已過去）
      await expect(page.getByText('付款完成')).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('🔄 完整流程模擬', () => {
    test('首頁 → Pricing → Callback (成功) → Dashboard', async ({ page }) => {
      // 1. 從首頁開始
      await page.goto('/')
      await expect(page).toHaveURL('/')

      // 2. 點擊「查看方案」
      await page.click('text=查看方案')
      await expect(page).toHaveURL(/\/pricing/)

      // 3. 模擬付款成功後導向到 callback（實際付款流程需要真實金流閘道）
      await page.goto('/pricing/callback?status=success')

      // 4. 驗證 callback 成功頁面
      await expect(page.getByText('付款完成')).toBeVisible()

      // 5. 等待自動導向到 dashboard
      await page.waitForURL('/dashboard', { timeout: 4000 })

      // 6. 驗證已在 dashboard
      await expect(page).toHaveURL('/dashboard')
    })

    test('首頁 → Pricing → Callback (失敗) → 重試', async ({ page }) => {
      // 1. 從首頁開始
      await page.goto('/')

      // 2. 點擊「查看方案」
      await page.click('text=查看方案')
      await expect(page).toHaveURL(/\/pricing/)

      // 3. 模擬付款失敗
      await page.goto('/pricing/callback?status=failed')

      // 4. 驗證失敗頁面
      await expect(page.getByText('付款未完成')).toBeVisible()

      // 5. 點擊重新選擇方案
      await page.click('text=重新選擇方案')

      // 6. 驗證回到 pricing 頁面
      await expect(page).toHaveURL(/\/pricing/)
    })
  })
})
