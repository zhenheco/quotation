/**
 * ApiError Consolidation Tests
 *
 * 驗證所有模組使用相同的 ApiError 類別實作
 * 確保 instanceof 檢查在跨模組時正常運作
 */

import { describe, it, expect } from 'vitest'
import { ApiError as ApiErrorFromLibErrors } from '@/lib/api/errors'
import { ApiError as ApiErrorFromTypesApi } from '@/types/api'

describe('ApiError consolidation', () => {
  describe('class identity', () => {
    it('should be the same class from lib/api/errors and types/api', () => {
      // 確保兩個 import 來源是相同的類別
      expect(ApiErrorFromLibErrors).toBe(ApiErrorFromTypesApi)
    })

    it('should work with instanceof across modules', () => {
      // 從 lib/api/errors 建立實例
      const errorFromLib = new ApiErrorFromLibErrors('Invalid input', 'VALIDATION_ERROR', 400)

      // 應該可以用 types/api 的 ApiError 來檢查 instanceof
      expect(errorFromLib instanceof ApiErrorFromTypesApi).toBe(true)
    })

    it('should work with instanceof in reverse direction', () => {
      // 從 types/api 建立實例
      const errorFromTypes = new ApiErrorFromTypesApi('Not authenticated', 'AUTHENTICATION_ERROR', 401)

      // 應該可以用 lib/api/errors 的 ApiError 來檢查 instanceof
      expect(errorFromTypes instanceof ApiErrorFromLibErrors).toBe(true)
    })
  })

  describe('error properties', () => {
    it('should have status property', () => {
      const error = new ApiErrorFromLibErrors('Invalid input', 'VALIDATION_ERROR', 400)
      expect(error.status).toBe(400)
    })

    it('should have type property', () => {
      const error = new ApiErrorFromLibErrors('Invalid input', 'VALIDATION_ERROR', 400)
      expect(error.type).toBe('VALIDATION_ERROR')
    })

    it('should have message property', () => {
      const error = new ApiErrorFromLibErrors('Invalid input', 'VALIDATION_ERROR', 400)
      expect(error.message).toBe('Invalid input')
    })

    it('should extend Error', () => {
      const error = new ApiErrorFromLibErrors('Server error', 'SERVER_ERROR', 500)
      expect(error instanceof Error).toBe(true)
    })

    it('should have details property when provided', () => {
      const details = { field: 'email', reason: 'invalid format' }
      const error = new ApiErrorFromLibErrors('Validation failed', 'VALIDATION_ERROR', 400, details)
      expect(error.details).toEqual(details)
    })
  })

  describe('error creation shortcuts', () => {
    it('should create validation error with correct properties', () => {
      const error = new ApiErrorFromTypesApi('Email is required', 'VALIDATION_ERROR', 400)
      expect(error.status).toBe(400)
      expect(error.type).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Email is required')
    })

    it('should create unauthorized error with correct properties', () => {
      const error = new ApiErrorFromTypesApi('Invalid credentials', 'AUTHENTICATION_ERROR', 401)
      expect(error.status).toBe(401)
      expect(error.type).toBe('AUTHENTICATION_ERROR')
    })

    it('should create forbidden error with correct properties', () => {
      const error = new ApiErrorFromTypesApi('Access denied', 'AUTHORIZATION_ERROR', 403)
      expect(error.status).toBe(403)
      expect(error.type).toBe('AUTHORIZATION_ERROR')
    })

    it('should create not found error with correct properties', () => {
      const error = new ApiErrorFromTypesApi('Resource not found', 'NOT_FOUND_ERROR', 404)
      expect(error.status).toBe(404)
      expect(error.type).toBe('NOT_FOUND_ERROR')
    })
  })

  describe('default values', () => {
    it('should default type to UNKNOWN_ERROR when not provided', () => {
      const error = new ApiErrorFromLibErrors('Something went wrong')
      expect(error.type).toBe('UNKNOWN_ERROR')
    })

    it('should have undefined status when not provided', () => {
      const error = new ApiErrorFromLibErrors('Something went wrong')
      expect(error.status).toBeUndefined()
    })
  })
})
