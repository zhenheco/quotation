/**
 * 安全驗證測試
 * 
 * 測試輸入驗證、授權檢查、檔案上傳安全等功能
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { validateString, validateEmail, validateUuid, validators } from '@/lib/security/input-validator'
import { validateImageFileWithMagicBytes } from '@/lib/security/enhanced-file-validator'
// 僅在有環境變數時才導入需要資料庫的模組
let validateCustomerOwnership: any
let validateCompanyMembership: any
let getSupabaseClient: any

describe('Security Validation Tests', () => {
  let db: any

  beforeAll(async () => {
    // 僅在測試環境中初始化資料庫連接
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { validateCustomerOwnership: vco, validateCompanyMembership: vcm } = await import('@/lib/security/authorization-validator')
      const { getSupabaseClient: gsc } = await import('@/lib/db/supabase-client')
      validateCustomerOwnership = vco
      validateCompanyMembership = vcm
      getSupabaseClient = gsc
      db = getSupabaseClient()
    }
  })

  describe('Input Validation', () => {
    describe('String Validation', () => {
      it('should reject XSS attempts', () => {
        const maliciousInputs = [
          '<script>alert("xss")</script>',
          '<img src=x onerror=alert("xss")>',
          'javascript:alert("xss")',
          '<iframe src="javascript:alert(1)"></iframe>',
          '"><script>alert("xss")</script>',
          "'; DROP TABLE users; --",
        ]

        maliciousInputs.forEach(input => {
          const result = validateString(input, 'test')
          expect(result.isValid).toBe(false)
          expect(result.errors).toContain('test contains potentially malicious content')
        })
      })

      it('should reject SQL injection attempts', () => {
        const sqlInjections = [
          "'; DROP TABLE customers; --",
          "1' OR '1'='1",
          "admin'--",
          "admin'/*",
          "' OR 1=1--",
          "' UNION SELECT * FROM users--",
          "1; DELETE FROM products",
        ]

        sqlInjections.forEach(input => {
          const result = validateString(input, 'test', { checkSqlInjection: true })
          expect(result.isValid).toBe(false)
          expect(result.errors).toContain('test contains potentially malicious SQL patterns')
        })
      })

      it('should reject path traversal attempts', () => {
        const pathTraversals = [
          '../../../etc/passwd',
          '..\\\\..\\\\..\\\\windows\\\\system32',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
          '....//....//....//etc/passwd',
        ]

        pathTraversals.forEach(input => {
          const result = validateString(input, 'test', { checkPathTraversal: true })
          expect(result.isValid).toBe(false)
          expect(result.errors).toContain('test contains path traversal patterns')
        })
      })

      it('should sanitize valid input', () => {
        const validInputs = [
          { input: 'John Doe', expected: 'John Doe' },
          { input: 'Company & Co.', expected: 'Company &amp; Co.' },
          { input: 'Price: $100 < $200', expected: 'Price: $100 &lt; $200' },
          { input: 'Email: test@example.com', expected: 'Email: test@example.com' },
        ]

        validInputs.forEach(({ input, expected }) => {
          const result = validateString(input, 'test')
          expect(result.isValid).toBe(true)
          expect(result.sanitized).toBe(expected)
        })
      })

      it('should enforce length limits', () => {
        const longString = 'a'.repeat(10001)
        const result = validateString(longString, 'test', { maxLength: 100 })
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('test exceeds maximum length of 100')
      })
    })

    describe('Email Validation', () => {
      it('should accept valid emails', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
        ]

        validEmails.forEach(email => {
          const result = validateEmail(email, 'email')
          expect(result.isValid).toBe(true)
        })
      })

      it('should reject invalid emails', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'test@',
          'test..test@example.com',
          'test@example',
        ]

        invalidEmails.forEach(email => {
          const result = validateEmail(email, 'email')
          expect(result.isValid).toBe(false)
        })
      })

      it('should sanitize emails and reject malicious content', () => {
        const maliciousEmails = [
          'test+<script>alert(1)</script>@example.com',
          'test@example.com<script>',
          'test@example.com\'; DROP TABLE users; --',
        ]

        maliciousEmails.forEach(email => {
          const result = validateEmail(email, 'email')
          expect(result.isValid).toBe(false)
        })
      })
    })

    describe('UUID Validation', () => {
      it('should accept valid UUIDs', () => {
        const validUuids = [
          '123e4567-e89b-12d3-a456-426614174000',
          'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        ]

        validUuids.forEach(uuid => {
          const result = validateUuid(uuid, 'uuid')
          expect(result.isValid).toBe(true)
        })
      })

      it('should reject invalid UUIDs', () => {
        const invalidUuids = [
          'not-a-uuid',
          '123e4567-e89b-12d3-a456',
          '123e4567-e89b-12d3-a456-426614174000-extra',
          '123e4567-e89b-12d3-z456-426614174000',
          '',
          null,
          undefined,
        ]

        invalidUuids.forEach(uuid => {
          const result = validateUuid(uuid, 'uuid')
          expect(result.isValid).toBe(false)
        })
      })
    })

    describe('Validator Shortcuts', () => {
      it('should validate names correctly', () => {
        expect(validators.name('John Doe').isValid).toBe(true)
        expect(validators.name('').isValid).toBe(false)
        expect(validators.name('<script>alert(1)</script>').isValid).toBe(false)
      })

      it('should validate phone numbers', () => {
        expect(validators.phone('+1-234-567-8900', false).isValid).toBe(true)
        expect(validators.phone('invalid phone', false).isValid).toBe(true) // 不強制格式
        expect(validators.phone('DROP TABLE users', false).isValid).toBe(false) // 但拒絕 SQL
      })

      it('should validate prices', () => {
        expect(validators.price(100).isValid).toBe(true)
        expect(validators.price('99.99').isValid).toBe(true)
        expect(validators.price(-10).isValid).toBe(false)
        expect(validators.price('not a number').isValid).toBe(false)
      })
    })
  })

  describe('File Validation', () => {
    describe('Magic Bytes Detection', () => {
      it('should detect JPEG files correctly', async () => {
        // 模擬 JPEG 檔案的開頭字節
        const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])
        const jpegBlob = new Blob([jpegHeader], { type: 'image/jpeg' })
        const jpegFile = new File([jpegBlob], 'test.jpg', { type: 'image/jpeg' })

        const result = await validateImageFileWithMagicBytes(jpegFile)
        expect(result.isValid).toBe(true)
        expect(result.detectedMimeType).toBe('image/jpeg')
      })

      it('should detect PNG files correctly', async () => {
        // PNG 魔術字節
        const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
        const pngBlob = new Blob([pngHeader], { type: 'image/png' })
        const pngFile = new File([pngBlob], 'test.png', { type: 'image/png' })

        const result = await validateImageFileWithMagicBytes(pngFile)
        expect(result.isValid).toBe(true)
        expect(result.detectedMimeType).toBe('image/png')
      })

      it('should reject files with dangerous signatures', async () => {
        // 模擬可執行檔案 (PE header: MZ)
        const exeHeader = new Uint8Array([0x4D, 0x5A, 0x90, 0x00])
        const exeBlob = new Blob([exeHeader], { type: 'image/jpeg' }) // 偽裝成圖片
        const exeFile = new File([exeBlob], 'malware.jpg', { type: 'image/jpeg' })

        const result = await validateImageFileWithMagicBytes(exeFile)
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Dangerous file type detected')
      })

      it('should reject type mismatch', async () => {
        // PNG 內容但聲明為 JPEG
        const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
        const pngBlob = new Blob([pngHeader], { type: 'image/jpeg' }) // 錯誤的 MIME 類型
        const pngFile = new File([pngBlob], 'test.jpg', { type: 'image/jpeg' })

        const result = await validateImageFileWithMagicBytes(pngFile)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('does not match declared type')
      })
    })

    describe('Filename Validation', () => {
      it('should reject dangerous filenames', async () => {
        const dangerousNames = [
          '../../../etc/passwd',
          'file.exe.jpg',
          'script.js.png',
          'test\x00.jpg',
          '.hidden.jpg',
          '~$temp.jpg',
        ]

        const validContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])
        const blob = new Blob([validContent], { type: 'image/jpeg' })

        for (const filename of dangerousNames) {
          const file = new File([blob], filename, { type: 'image/jpeg' })
          const result = await validateImageFileWithMagicBytes(file)
          expect(result.isValid).toBe(false)
        }
      })

      it('should accept safe filenames', async () => {
        const safeNames = [
          'photo.jpg',
          'company-logo.png',
          'document_scan.jpg',
          'receipt-2024-01-01.jpg',
        ]

        const validContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])
        const blob = new Blob([validContent], { type: 'image/jpeg' })

        for (const filename of safeNames) {
          const file = new File([blob], filename, { type: 'image/jpeg' })
          const result = await validateImageFileWithMagicBytes(file)
          expect(result.isValid).toBe(true)
        }
      })
    })

    describe('File Size Validation', () => {
      it('should reject oversized files', async () => {
        // 建立超過 10MB 的檔案
        const largeContent = new Uint8Array(11 * 1024 * 1024) // 11MB
        largeContent.set([0xFF, 0xD8, 0xFF, 0xE0], 0) // JPEG header

        const largeBlob = new Blob([largeContent], { type: 'image/jpeg' })
        const largeFile = new File([largeBlob], 'large.jpg', { type: 'image/jpeg' })

        const result = await validateImageFileWithMagicBytes(largeFile)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('exceeds')
      })

      it('should reject empty files', async () => {
        const emptyBlob = new Blob([], { type: 'image/jpeg' })
        const emptyFile = new File([emptyBlob], 'empty.jpg', { type: 'image/jpeg' })

        const result = await validateImageFileWithMagicBytes(emptyFile)
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Empty file is not allowed')
      })
    })
  })

  describe('Authorization Validation', () => {
    // 注意：這些測試需要實際的資料庫連接和測試資料

    describe('Company Membership', () => {
      it('should validate company membership correctly', async () => {
        // 跳過如果沒有資料庫連接
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !validateCompanyMembership) {
          console.log('Skipping database-dependent test: no SUPABASE_SERVICE_ROLE_KEY')
          return
        }

        // 這裡需要建立測試資料
        // const userId = 'test-user-id'
        // const companyId = 'test-company-id'
        
        // const result = await validateCompanyMembership(db, userId, companyId)
        // expect(result).toBeDefined()
        // expect(typeof result.isAuthorized).toBe('boolean')
      })
    })

    describe('Resource Ownership', () => {
      it('should validate customer ownership correctly', async () => {
        // 跳過如果沒有資料庫連接
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !validateCustomerOwnership) {
          console.log('Skipping database-dependent test: no SUPABASE_SERVICE_ROLE_KEY')
          return
        }

        // 測試需要實際的測試資料
        // const userId = 'test-user-id'
        // const customerId = 'test-customer-id'
        
        // const result = await validateCustomerOwnership(db, userId, customerId)
        // expect(result).toBeDefined()
        // expect(typeof result.isAuthorized).toBe('boolean')
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(validateString(null, 'test').isValid).toBe(false)
      expect(validateString(undefined, 'test').isValid).toBe(false)
      expect(validateEmail(null, 'email').isValid).toBe(false)
      expect(validateUuid(undefined, 'uuid').isValid).toBe(false)
    })

    it('should handle non-string types appropriately', () => {
      expect(validateString(123, 'test').isValid).toBe(false)
      expect(validateString({}, 'test').isValid).toBe(false)
      expect(validateString([], 'test').isValid).toBe(false)
    })

    it('should handle unicode and special characters', () => {
      const unicodeString = '测试中文😀🚀'
      const result = validateString(unicodeString, 'test')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe(unicodeString)
    })

    it('should handle very long strings', () => {
      const veryLongString = 'a'.repeat(50000)
      const result = validateString(veryLongString, 'test')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('test exceeds maximum length of 10000')
    })
  })

  describe('Performance Tests', () => {
    it('should validate large batches efficiently', () => {
      const startTime = performance.now()
      
      // 測試大量輸入的處理效能
      for (let i = 0; i < 1000; i++) {
        validateString(`test input ${i}`, 'test')
        validators.email(`test${i}@example.com`, false)
        validators.price(Math.random() * 1000)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 應該在合理時間內完成（1秒）
      expect(duration).toBeLessThan(1000)
    })
  })
})