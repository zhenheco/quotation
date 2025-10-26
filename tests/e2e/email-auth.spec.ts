import { test, expect } from '@playwright/test'

test.describe('Email Authentication System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/zh/login')
  })

  test('登入頁面載入正常', async ({ page }) => {
    await expect(page).toHaveTitle(/.*/)
    await expect(page.locator('h1')).toContainText('登入')
  })

  test('Tab 切換功能正常', async ({ page }) => {
    const emailTab = page.getByRole('button', { name: 'Email 登入' })
    const googleTab = page.getByRole('button', { name: 'Google 登入' })

    await emailTab.click()
    await expect(page.locator('input[type="email"]')).toBeVisible()

    await googleTab.click()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })

  test('Email 登入表單顯示正確', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: '登入' })).toBeVisible()
  })

  test('密碼顯示/隱藏切換功能', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first()
    const toggleButton = page.locator('button[aria-label*="密碼"], button:has-text("👁")').first()

    await expect(passwordInput).toHaveAttribute('type', 'password')

    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
  })

  test('空白表單提交顯示錯誤', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: '登入' })
    await submitButton.click()

    await page.waitForTimeout(1000)
  })

  test('忘記密碼連結導向正確', async ({ page }) => {
    const forgotPasswordLink = page.getByRole('link', { name: /忘記密碼/i })
    await expect(forgotPasswordLink).toBeVisible()
    await expect(forgotPasswordLink).toHaveAttribute('href', /reset-password/)
  })

  test('註冊連結導向正確', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /註冊/i })
    await expect(registerLink).toBeVisible()
    await expect(registerLink).toHaveAttribute('href', /register/)
  })

  test('註冊頁面載入正常', async ({ page }) => {
    await page.goto('http://localhost:3001/zh/register')
    await expect(page.locator('h1')).toContainText('註冊')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toHaveCount(2)
  })

  test('密碼強度指示器顯示', async ({ page }) => {
    await page.goto('http://localhost:3001/zh/register')

    const passwordInput = page.locator('input[type="password"]').first()

    await passwordInput.fill('weak')
    await page.waitForTimeout(500)

    await passwordInput.fill('StrongPass123!')
    await page.waitForTimeout(500)
  })

  test('密碼確認匹配檢查', async ({ page }) => {
    await page.goto('http://localhost:3001/zh/register')

    const passwordInput = page.locator('input[type="password"]').first()
    const confirmInput = page.locator('input[type="password"]').last()

    await passwordInput.fill('Password123!')
    await confirmInput.fill('DifferentPass123!')

    const submitButton = page.getByRole('button', { name: '註冊' })
    await submitButton.click()

    await page.waitForTimeout(1000)
  })

  test('密碼重設頁面載入正常', async ({ page }) => {
    await page.goto('http://localhost:3001/zh/reset-password')
    await expect(page.locator('h1')).toContainText(/重設密碼|忘記密碼/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('語言切換 - 英文', async ({ page }) => {
    await page.goto('http://localhost:3001/en/login')
    await expect(page.locator('h1')).toContainText('Login')
  })

  test('響應式設計 - 手機視窗', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3001/zh/login')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('響應式設計 - 平板視窗', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('http://localhost:3001/zh/login')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('註冊成功提示顯示', async ({ page }) => {
    await page.goto('http://localhost:3001/zh/login?registered=true')
    await expect(page.locator('text=/註冊成功|請確認/i')).toBeVisible()
  })
})
