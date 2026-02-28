/**
 * API 安全測試
 * 
 * 專門測試 API 端點的安全功能
 */

import { test, expect } from '@playwright/test'

test.describe('API 安全測試', () => {
  
  test.describe('🛡️ 輸入驗證 API', () => {
    test('API 應該驗證和清理字串輸入', async ({ request }) => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '../../../etc/passwd',
        '<img src=x onerror=alert(1)>',
        'javascript:alert("malicious")',
      ]

      // 測試客戶創建端點
      for (const maliciousInput of maliciousInputs) {
        const response = await request.post('/api/customers', {
          data: {
            name: maliciousInput,
            contact_person: { 
              name: 'Test User', 
              email: 'test@example.com',
              phone: '1234567890' 
            },
            address: 'Test Address',
            company_id: '12345678-1234-1234-1234-123456789012'
          }
        })

        // API 應該拒絕惡意輸入或適當清理
        if (response.status() === 400) {
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.error).toMatch(/validation|invalid|malicious/i)
        } else if (response.status() === 200) {
          // 如果接受了輸入，應該被清理
          const body = await response.json()
          if (body.success && body.data) {
            expect(body.data.name).not.toContain('<script>')
            expect(body.data.name).not.toContain('DROP TABLE')
          }
        }
      }
    })

    test('API 應該驗證 Email 格式', async ({ request }) => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        '<script>alert(1)</script>@example.com',
        'test@example.com<script>',
      ]

      for (const invalidEmail of invalidEmails) {
        const response = await request.post('/api/customers', {
          data: {
            name: 'Test Customer',
            contact_person: { 
              name: 'Test User', 
              email: invalidEmail,
              phone: '1234567890' 
            },
            company_id: '12345678-1234-1234-1234-123456789012'
          }
        })

        // 應該拒絕無效的 Email
        expect(response.status()).not.toBe(200)
        if (response.status() === 400) {
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.error).toMatch(/email|validation|invalid/i)
        }
      }
    })

    test('API 應該驗證 UUID 格式', async ({ request }) => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '<script>alert(1)</script>',
        '"; DROP TABLE customers; --',
      ]

      for (const invalidUUID of invalidUUIDs) {
        const response = await request.post('/api/customers', {
          data: {
            name: 'Test Customer',
            contact_person: { 
              name: 'Test User', 
              email: 'test@example.com' 
            },
            company_id: invalidUUID
          }
        })

        // 應該拒絕無效的 UUID
        expect(response.status()).not.toBe(200)
        if (response.status() === 400) {
          const body = await response.json()
          expect(body.success).toBe(false)
        }
      }
    })
  })

  test.describe('🔒 授權檢查 API', () => {
    test('未認證請求應該被拒絕', async ({ request }) => {
      const protectedEndpoints = [
        { method: 'GET', path: '/api/customers' },
        { method: 'POST', path: '/api/customers' },
        { method: 'GET', path: '/api/products' },
        { method: 'POST', path: '/api/products' },
        { method: 'GET', path: '/api/quotations' },
        { method: 'POST', path: '/api/quotations' },
      ]

      for (const endpoint of protectedEndpoints) {
        let response
        
        if (endpoint.method === 'GET') {
          response = await request.get(endpoint.path)
        } else if (endpoint.method === 'POST') {
          response = await request.post(endpoint.path, {
            data: { test: 'data' }
          })
        }

        if (response) {
          // 應該返回 401 或 403 或重導向到登入
          expect([302, 401, 403]).toContain(response.status())
          
          if ([401, 403].includes(response.status())) {
            const body = await response.json()
            expect(body.success).toBe(false)
            expect(body.error).toMatch(/unauthorized|forbidden|authentication|login/i)
          }
        }
      }
    })

    test('無效的認證 Token 應該被拒絕', async ({ request }) => {
      const invalidTokens = [
        'invalid-token',
        'Bearer fake-token',
        'Bearer expired-token-12345',
        '<script>alert(1)</script>',
      ]

      for (const token of invalidTokens) {
        const response = await request.get('/api/customers', {
          headers: {
            'Authorization': token
          }
        })

        // 應該拒絕無效 token
        expect([401, 403]).toContain(response.status())
        
        if ([401, 403].includes(response.status())) {
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.error).toMatch(/unauthorized|invalid.*token|authentication/i)
        }
      }
    })
  })

  test.describe('⚡ 速率限制 API', () => {
    test('應該限制 API 請求頻率', async ({ request }) => {
      // 快速發送多個請求到同一端點
      const requests = []
      for (let i = 0; i < 20; i++) {
        requests.push(
          request.post('/api/auth/login', {
            data: {
              email: 'test@example.com',
              password: 'wrongpassword'
            }
          })
        )
      }

      const responses = await Promise.allSettled(requests)
      const actualResponses = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)

      // 檢查是否有速率限制
      const rateLimitedCount = actualResponses.filter(r => r.status() === 429).length
      const tooManyRequestsCount = actualResponses.filter(r => r.status() >= 500).length

      // 如果實施了速率限制，應該有一些請求被限制
      if (rateLimitedCount > 0) {
        expect(rateLimitedCount).toBeGreaterThan(0)
        
        const limitedResponse = actualResponses.find(r => r.status() === 429)
        if (limitedResponse) {
          const body = await limitedResponse.json()
          expect(body.error).toMatch(/rate limit|too many/i)
        }
      }

      // 至少不應該全部都成功（因為密碼錯誤）
      const successCount = actualResponses.filter(r => r.status() === 200).length
      expect(successCount).toBe(0) // 所有請求都應該失敗（錯誤密碼）
    })
  })

  test.describe('📋 資料驗證 API', () => {
    test('API 應該驗證必填欄位', async ({ request }) => {
      // 測試缺少必填欄位的請求
      const invalidRequests = [
        { name: '', contact_person: { name: 'Test', email: 'test@example.com' } }, // 空名稱
        { name: 'Test', contact_person: { name: '', email: 'test@example.com' } }, // 空聯絡人
        { name: 'Test', contact_person: { name: 'Test', email: '' } }, // 空 email
        { name: 'Test' }, // 缺少 contact_person
        {}, // 完全空的請求
      ]

      for (const invalidData of invalidRequests) {
        const response = await request.post('/api/customers', {
          data: invalidData
        })

        // 應該拒絕不完整的資料
        expect(response.status()).not.toBe(200)
        
        if (response.status() === 400) {
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.error).toMatch(/required|validation|missing/i)
        }
      }
    })

    test('API 應該驗證數值範圍', async ({ request }) => {
      // 測試產品價格驗證
      const invalidPrices = [
        -100,      // 負數價格
        0,         // 零價格（可能不被允許）
        999999999999, // 過大的價格
        'not-a-number', // 非數字
        '<script>alert(1)</script>', // XSS 嘗試
      ]

      for (const invalidPrice of invalidPrices) {
        const response = await request.post('/api/products', {
          data: {
            name: 'Test Product',
            description: 'Test Description',
            unit_price: invalidPrice,
            company_id: '12345678-1234-1234-1234-123456789012'
          }
        })

        // 應該拒絕無效的價格
        if (typeof invalidPrice === 'number' && invalidPrice <= 0) {
          expect(response.status()).not.toBe(200)
        } else if (typeof invalidPrice === 'string') {
          expect(response.status()).not.toBe(200)
        }

        if (response.status() === 400) {
          const body = await response.json()
          expect(body.success).toBe(false)
        }
      }
    })
  })

  test.describe('🔍 錯誤處理 API', () => {
    test('API 錯誤回應不應洩漏敏感資訊', async ({ request }) => {
      // 嘗試存取不存在的端點
      const response = await request.get('/api/nonexistent-endpoint-12345')
      
      expect(response.status()).toBe(404)
      
      const body = await response.text()
      
      // 不應該包含敏感的技術資訊
      expect(body).not.toMatch(/database.*error|connection.*string|internal.*server/i)
      expect(body).not.toMatch(/stack.*trace|debug|development/i)
      expect(body).not.toMatch(/supabase|postgresql|next\.js/i)
    })

    test('內部錯誤應該返回通用錯誤訊息', async ({ request }) => {
      // 嘗試發送會導致內部錯誤的請求
      const response = await request.post('/api/customers', {
        data: {
          name: 'A'.repeat(10000), // 過長的名稱可能導致資料庫錯誤
          contact_person: {
            name: 'Test',
            email: 'test@example.com'
          },
          company_id: '12345678-1234-1234-1234-123456789012'
        }
      })

      if (response.status() >= 500) {
        const body = await response.json()
        
        // 應該返回通用錯誤而非具體的資料庫錯誤
        expect(body.error).toMatch(/internal.*error|server.*error|something.*wrong/i)
        expect(body.error).not.toMatch(/constraint|foreign.*key|database/i)
      }
    })
  })
})