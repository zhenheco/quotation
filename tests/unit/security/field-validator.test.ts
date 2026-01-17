/**
 * Field Validator 單元測試
 *
 * 驗證欄位白名單機制是否正確過濾惡意輸入
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateFields,
  isFieldAllowed,
  hasInvalidFields,
  getInvalidFields,
  CUSTOMER_ALLOWED_FIELDS,
  PRODUCT_ALLOWED_FIELDS,
  QUOTATION_ALLOWED_FIELDS,
  COMPANY_ALLOWED_FIELDS,
} from '@/lib/security/field-validator'

describe('Field Validator', () => {
  describe('isFieldAllowed', () => {
    it('should return true for whitelisted fields', () => {
      expect(isFieldAllowed('name', CUSTOMER_ALLOWED_FIELDS)).toBe(true)
      expect(isFieldAllowed('email', CUSTOMER_ALLOWED_FIELDS)).toBe(true)
    })

    it('should return false for non-whitelisted fields', () => {
      expect(isFieldAllowed('id', CUSTOMER_ALLOWED_FIELDS)).toBe(false)
      expect(isFieldAllowed('user_id', CUSTOMER_ALLOWED_FIELDS)).toBe(false)
      expect(isFieldAllowed('created_at', CUSTOMER_ALLOWED_FIELDS)).toBe(false)
    })

    it('should return false for SQL injection attempts', () => {
      expect(isFieldAllowed('DROP TABLE', CUSTOMER_ALLOWED_FIELDS)).toBe(false)
      expect(isFieldAllowed("'; DELETE FROM", CUSTOMER_ALLOWED_FIELDS)).toBe(false)
    })
  })

  describe('validateFields', () => {
    describe('filtering behavior', () => {
      it('should filter out unknown fields', () => {
        const input = { name: 'Test', malicious: 'DROP TABLE' }
        const result = validateFields(input, CUSTOMER_ALLOWED_FIELDS)

        expect(result).toEqual({ name: 'Test' })
        expect(result).not.toHaveProperty('malicious')
      })

      it('should keep all whitelisted fields', () => {
        const input = {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '0912345678',
          address: 'Test Address',
        }
        const result = validateFields(input, CUSTOMER_ALLOWED_FIELDS)

        expect(result).toEqual(input)
      })

      it('should filter sensitive system fields', () => {
        const input = {
          name: 'Test',
          id: 'uuid-to-override',
          user_id: 'different-user',
          created_at: '2020-01-01',
          company_id: 'other-company',
        }
        const result = validateFields(input, CUSTOMER_ALLOWED_FIELDS)

        expect(result).toEqual({ name: 'Test' })
        expect(result).not.toHaveProperty('id')
        expect(result).not.toHaveProperty('user_id')
        expect(result).not.toHaveProperty('created_at')
        expect(result).not.toHaveProperty('company_id')
      })

      it('should handle empty object', () => {
        const result = validateFields({}, CUSTOMER_ALLOWED_FIELDS)
        expect(result).toEqual({})
      })

      it('should preserve field values including null and undefined', () => {
        const input = {
          name: 'Test',
          email: null,
          phone: undefined,
        }
        const result = validateFields(input, CUSTOMER_ALLOWED_FIELDS)

        expect(result).toHaveProperty('name', 'Test')
        expect(result).toHaveProperty('email', null)
        expect(result).toHaveProperty('phone', undefined)
      })
    })

    describe('strict mode (throwOnInvalid)', () => {
      it('should throw error when invalid fields detected in strict mode', () => {
        const input = { name: 'Test', hack: 'value' }

        expect(() =>
          validateFields(input, CUSTOMER_ALLOWED_FIELDS, { throwOnInvalid: true })
        ).toThrow('Invalid fields detected')
      })

      it('should include invalid field names in error message', () => {
        const input = { name: 'Test', hack: 'value', another: 'bad' }

        expect(() =>
          validateFields(input, CUSTOMER_ALLOWED_FIELDS, { throwOnInvalid: true })
        ).toThrow(/hack/)
      })

      it('should not throw when all fields are valid in strict mode', () => {
        const input = { name: 'Test', email: 'test@example.com' }

        expect(() =>
          validateFields(input, CUSTOMER_ALLOWED_FIELDS, { throwOnInvalid: true })
        ).not.toThrow()
      })
    })

    describe('logging behavior', () => {
      let consoleWarnSpy: ReturnType<typeof vi.spyOn>

      beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      })

      afterEach(() => {
        consoleWarnSpy.mockRestore()
      })

      it('should log warning for filtered fields', () => {
        const input = { name: 'Test', malicious: 'value' }
        validateFields(input, CUSTOMER_ALLOWED_FIELDS)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('malicious')
        )
      })
    })
  })

  describe('hasInvalidFields', () => {
    it('should return true when invalid fields exist', () => {
      const data = { name: 'Test', hack: 'value' }
      expect(hasInvalidFields(data, CUSTOMER_ALLOWED_FIELDS)).toBe(true)
    })

    it('should return false when all fields are valid', () => {
      const data = { name: 'Test', email: 'test@example.com' }
      expect(hasInvalidFields(data, CUSTOMER_ALLOWED_FIELDS)).toBe(false)
    })
  })

  describe('getInvalidFields', () => {
    it('should return array of invalid field names', () => {
      const data = { name: 'Test', hack: 'value', another: 'bad' }
      const invalid = getInvalidFields(data, CUSTOMER_ALLOWED_FIELDS)

      expect(invalid).toContain('hack')
      expect(invalid).toContain('another')
      expect(invalid).not.toContain('name')
    })

    it('should return empty array when all fields valid', () => {
      const data = { name: 'Test' }
      expect(getInvalidFields(data, CUSTOMER_ALLOWED_FIELDS)).toEqual([])
    })
  })

  describe('whitelist constants', () => {
    it('CUSTOMER_ALLOWED_FIELDS should include expected fields', () => {
      expect(CUSTOMER_ALLOWED_FIELDS).toContain('name')
      expect(CUSTOMER_ALLOWED_FIELDS).toContain('email')
      expect(CUSTOMER_ALLOWED_FIELDS).toContain('phone')
      expect(CUSTOMER_ALLOWED_FIELDS).toContain('address')
      expect(CUSTOMER_ALLOWED_FIELDS).toContain('tax_id')
    })

    it('PRODUCT_ALLOWED_FIELDS should include expected fields', () => {
      expect(PRODUCT_ALLOWED_FIELDS).toContain('sku')
      expect(PRODUCT_ALLOWED_FIELDS).toContain('name')
      expect(PRODUCT_ALLOWED_FIELDS).toContain('unit_price')
      expect(PRODUCT_ALLOWED_FIELDS).toContain('cost_price')
    })

    it('QUOTATION_ALLOWED_FIELDS should include expected fields', () => {
      expect(QUOTATION_ALLOWED_FIELDS).toContain('customer_id')
      expect(QUOTATION_ALLOWED_FIELDS).toContain('status')
      expect(QUOTATION_ALLOWED_FIELDS).toContain('total')
      expect(QUOTATION_ALLOWED_FIELDS).toContain('notes')
    })

    it('COMPANY_ALLOWED_FIELDS should include expected fields', () => {
      expect(COMPANY_ALLOWED_FIELDS).toContain('name')
      expect(COMPANY_ALLOWED_FIELDS).toContain('address')
      expect(COMPANY_ALLOWED_FIELDS).toContain('logo_url')
    })

    it('whitelist constants should NOT include sensitive fields', () => {
      const allWhitelists = [
        ...CUSTOMER_ALLOWED_FIELDS,
        ...PRODUCT_ALLOWED_FIELDS,
        ...QUOTATION_ALLOWED_FIELDS,
        ...COMPANY_ALLOWED_FIELDS,
      ]

      // 這些欄位絕對不應該出現在任何白名單中
      const sensitiveFields = ['id', 'user_id', 'created_at', 'updated_at', 'deleted_at']

      for (const field of sensitiveFields) {
        expect(allWhitelists).not.toContain(field)
      }
    })
  })
})
