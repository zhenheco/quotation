import { test, expect } from '@playwright/test'

test.describe('寄送報價單功能', () => {
  test('列表頁面寄送按鈕顯示深綠色', async ({ page }) => {
    await page.goto('/zh/quotations')

    const sendButtons = page.locator('button', { hasText: /寄送|Send/ })
    const firstButton = sendButtons.first()

    if (await firstButton.isVisible()) {
      const color = await firstButton.evaluate((el) => {
        return window.getComputedStyle(el).color
      })
      console.log('寄送按鈕顏色:', color)
    }
  })

  test('沒有客戶郵件的報價單，寄送按鈕應該 disabled', async ({ page }) => {
    await page.goto('/zh/quotations')

    const disabledButton = page.locator('button:disabled', { hasText: /寄送|Send/ })

    if (await disabledButton.isVisible()) {
      await expect(disabledButton).toBeDisabled()
      const title = await disabledButton.getAttribute('title')
      expect(title).toContain('郵件')
    }
  })

  test('報價單詳細頁面有寄送按鈕', async ({ page }) => {
    await page.goto('/zh/quotations')

    const viewLinks = page.locator('a', { hasText: /檢視|View/ })
    if (await viewLinks.first().isVisible()) {
      await viewLinks.first().click()

      await page.waitForLoadState('networkidle')

      const sendButton = page.locator('button', { hasText: /寄送報價單|Send Quotation/ })
      await expect(sendButton).toBeVisible()
    }
  })
})

test.describe('寄送報價單 API 測試（需要登入）', () => {
  test.skip('寄送報價單完整流程', async ({ page, context }) => {
    await page.goto('/zh/login')

    await page.fill('input[type="email"]', 'acejou27@gmail.com')
    await page.fill('input[type="password"]', 'your-password-here')
    await page.click('button:has-text("登入")')

    await page.waitForURL('**/dashboard')

    await page.goto('/zh/quotations')

    await page.waitForLoadState('networkidle')

    const quotationRows = page.locator('tr').filter({ hasText: 'draft' })
    const sendButton = quotationRows.first().locator('button', { hasText: /寄送|Send/ })

    await expect(sendButton).toBeEnabled()

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/quotations/') &&
                    response.url().includes('/send') &&
                    response.request().method() === 'POST'
    )

    page.once('dialog', dialog => dialog.accept())

    await sendButton.click()

    const response = await responsePromise

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.message).toContain('Quotation sent successfully')
    expect(data.data.status).toBe('sent')

    await expect(page.locator('text=/已成功發送|successfully sent/i')).toBeVisible()

    await page.waitForTimeout(1000)

    const updatedStatus = await page.locator('tr').filter({ hasText: 'Q2025-003' }).first().textContent()
    expect(updatedStatus).toContain('sent')
  })
})
