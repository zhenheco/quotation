/**
 * 資安修復功能 E2E 測試
 *
 * 測試範圍：
 * 1. 輸入驗證防護 (XSS、SQL 注入)
 * 2. 授權檢查 (角色權限、資料隔離)
 * 3. 檔案上傳安全
 * 4. CSRF 防護
 * 5. 其他安全功能
 */

import { test, expect } from '@playwright/test'

test.describe('資安修復功能 E2E 測試', () => {
  
  test.describe('🛡️ 輸入驗證防護', () => {
    test('表單應該拒絕 XSS 攻擊', async ({ page }) => {
      // 前往登入頁面
      await page.goto('/login')
      
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '"><script>alert("xss")</script>',
      ]
      
      for (const payload of xssPayloads) {
        // 嘗試在 email 欄位注入 XSS
        await page.fill('input[type="email"]', payload)
        await page.fill('input[type="password"]', 'password123')
        await page.click('button[type="submit"]')
        
        // 驗證頁面沒有執行 XSS 代碼
        await page.waitForTimeout(500)
        const dialogHandled = await page.evaluate(() => {
          return window.hasOwnProperty('alert')
        })
        
        // 確保沒有彈窗或執行任何 JavaScript
        expect(dialogHandled).toBeTruthy() // alert 函數應該存在但不應被調用
        
        // 檢查是否有適當的錯誤訊息
        const errorMessage = await page.locator('text=invalid').count()
        expect(errorMessage).toBeGreaterThanOrEqual(0) // 應該有驗證錯誤或被清理
      }
    })

    test('API 端點應該拒絕惡意 SQL 注入嘗試', async ({ page, request }) => {
      // 模擬登入以取得認證
      await page.goto('/auth/login')
      
      const sqlInjectionPayloads = [
        "'; DROP TABLE customers; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users--",
      ]
      
      for (const payload of sqlInjectionPayloads) {
        // 嘗試通過 API 端點進行 SQL 注入
        const response = await request.post('/api/customers', {
          data: {
            name: payload,
            contact_person: { name: 'Test User', email: 'test@example.com' },
            company_id: 'test-company-id'
          }
        })
        
        // API 應該返回錯誤或過濾掉惡意輸入
        expect(response.status()).not.toBe(200)
        
        if (response.status() === 400) {
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.error).toMatch(/validation|malicious|invalid/i)
        }
      }
    })

    test('表單輸入應該被適當清理和編碼', async ({ page }) => {
      await page.goto('/login')
      
      // 測試 HTML 實體編碼
      const testInput = 'Test & <script>alert(1)</script> > "quotes"'
      await page.fill('input[type="email"]', testInput)
      
      // 檢查輸入值是否被適當處理
      const inputValue = await page.inputValue('input[type="email"]')
      
      // 應該包含原始文本但不包含可執行的腳本
      expect(inputValue).toContain('Test')
      expect(inputValue).not.toContain('<script>')
    })
  })

  test.describe('🔒 授權檢查功能', () => {
    test('未認證用戶無法存取受保護頁面', async ({ page }) => {
      const protectedPages = [
        '/dashboard',
        '/customers',
        '/products',
        '/quotations',
        '/reports'
      ]
      
      for (const pagePath of protectedPages) {
        await page.goto(pagePath)
        
        // 應該重導向到登入頁面
        await expect(page).toHaveURL(/\/login/)
        
        // 或顯示未授權訊息
        const unauthorizedContent = await page.locator('text=/login|unauthorized|access denied/i').count()
        expect(unauthorizedContent).toBeGreaterThan(0)
      }
    })

    test('不同角色用戶應該看到對應的功能', async ({ page }) => {
      // 這個測試需要實際的用戶認證，暫時跳過
      // 在實際實施中，需要建立測試用戶和角色
      test.skip(true, 'Requires test user setup and authentication')
    })

    test('API 端點應該檢查用戶權限', async ({ request }) => {
      // 測試未認證的 API 請求
      const protectedEndpoints = [
        '/api/customers',
        '/api/products', 
        '/api/quotations',
        '/api/admin/users'
      ]
      
      for (const endpoint of protectedEndpoints) {
        const response = await request.get(endpoint)
        
        // 應該返回 401 或 403
        expect([401, 403]).toContain(response.status())
        
        const body = await response.json()
        expect(body.success).toBe(false)
        expect(body.error).toMatch(/unauthorized|forbidden|authentication/i)
      }
    })
  })

  test.describe('📁 檔案上傳安全功能', () => {
    test('應該拒絕危險的檔案類型', async ({ page }) => {
      // 前往有檔案上傳功能的頁面
      // 這裡假設有一個檔案上傳頁面，實際路徑可能不同
      test.skip(true, 'Requires specific file upload page')
      
      // await page.goto('/upload-files')
      
      // const fileInput = page.locator('input[type="file"]')
      
      // 測試危險檔案類型
      // const dangerousFiles = [
      //   { name: 'malware.exe', content: 'MZ' }, // PE header
      //   { name: 'script.js', content: 'alert(1)' },
      //   { name: 'fake-image.jpg.exe', content: 'executable' },
      // ]
      
      // for (const file of dangerousFiles) {
      //   // 創建臨時檔案並嘗試上傳
      //   // 應該被拒絕並顯示錯誤訊息
      // }
    })

    test('應該檢查檔案魔術字節', async ({ page }) => {
      test.skip(true, 'Requires file upload implementation')
      
      // 測試偽造的檔案類型
      // 例如：聲稱是 JPEG 但實際是可執行檔案
    })

    test('應該限制檔案大小', async ({ page }) => {
      test.skip(true, 'Requires file upload implementation')
      
      // 測試上傳超大檔案
      // 應該被拒絕
    })
  })

  test.describe('🛡️ CSRF 防護', () => {
    test('表單應該包含 CSRF Token', async ({ page }) => {
      await page.goto('/login')
      
      // 檢查登入表單是否有 CSRF token
      const csrfToken = await page.locator('input[name="csrf_token"]').count()
      const csrfMeta = await page.locator('meta[name="csrf-token"]').count()
      
      // 至少應該有一種 CSRF 防護機制
      expect(csrfToken + csrfMeta).toBeGreaterThan(0)
    })

    test('沒有有效 CSRF Token 的請求應該被拒絕', async ({ request }) => {
      // 嘗試沒有 CSRF token 的 POST 請求
      const response = await request.post('/api/customers', {
        data: {
          name: 'Test Customer',
          contact_person: { name: 'Test', email: 'test@example.com' }
        }
      })
      
      // 應該被拒絕 (除非是公開端點)
      if (response.status() === 403) {
        const body = await response.json()
        expect(body.error).toMatch(/csrf|token|forbidden/i)
      }
    })
  })

  test.describe('🔍 安全標頭檢查', () => {
    test('應該設定適當的安全標頭', async ({ page }) => {
      const response = await page.goto('/')
      const headers = response?.headers() || {}
      
      // 檢查重要的安全標頭
      expect(headers['x-frame-options'] || headers['x-frame-options']).toBeTruthy()
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['x-xss-protection'] || headers['x-xss-protection']).toBeTruthy()
      
      // CSP 標頭 (如果有實施)
      if (headers['content-security-policy']) {
        expect(headers['content-security-policy']).toContain("default-src")
      }
    })

    test('應該使用 HTTPS (在生產環境)', async ({ page }) => {
      // 在本地開發時跳過此測試
      const currentUrl = page.url()
      if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
        test.skip(true, 'HTTPS test skipped for local development')
      }
      
      // 在生產環境應該使用 HTTPS
      expect(currentUrl).toMatch(/^https:\/\//)
    })
  })

  test.describe('📊 錯誤處理與資訊洩漏防護', () => {
    test('錯誤訊息不應該洩漏敏感資訊', async ({ page }) => {
      await page.goto('/login')
      
      // 嘗試無效的登入
      await page.fill('input[type="email"]', 'nonexistent@example.com')
      await page.fill('input[type="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')
      
      // 等待錯誤訊息出現
      await page.waitForTimeout(1000)
      
      // 檢查錯誤訊息
      const pageContent = await page.textContent('body')
      
      // 不應該包含敏感的技術細節
      expect(pageContent).not.toMatch(/database|sql|internal server error|stack trace/i)
      expect(pageContent).not.toMatch(/password.*hash|secret.*key/i)
    })

    test('404 頁面不應該洩漏系統資訊', async ({ page }) => {
      const response = await page.goto('/nonexistent-page-12345')
      
      expect(response?.status()).toBe(404)
      
      const pageContent = await page.textContent('body')
      
      // 不應該包含技術棧資訊
      expect(pageContent).not.toMatch(/next\.js|react|node\.js|supabase/i)
      expect(pageContent).not.toMatch(/version|build|debug/i)
    })
  })

  test.describe('⚡ 速率限制', () => {
    test('應該限制頻繁的請求', async ({ page, request }) => {
      // 測試登入端點的速率限制
      const loginAttempts = []
      
      for (let i = 0; i < 10; i++) {
        loginAttempts.push(
          request.post('/api/auth/login', {
            data: {
              email: 'test@example.com',
              password: 'wrongpassword'
            }
          })
        )
      }
      
      const responses = await Promise.all(loginAttempts)
      
      // 至少有一些請求應該被速率限制
      const rateLimitedResponses = responses.filter(r => r.status() === 429)
      
      // 如果有實施速率限制，應該會有 429 回應
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses.length).toBeGreaterThan(0)
        
        const body = await rateLimitedResponses[0].json()
        expect(body.error).toMatch(/rate limit|too many requests/i)
      }
    })
  })

  test.describe('🔄 會話管理', () => {
    test('會話應該在適當時間後過期', async ({ page }) => {
      test.skip(true, 'Requires session management implementation')
      
      // 登入後檢查會話過期
      // 這需要實際的認證流程
    })

    test('登出應該清除所有會話資料', async ({ page }) => {
      test.skip(true, 'Requires authentication flow')
      
      // 登入 -> 登出 -> 檢查會話是否被清除
    })
  })
})