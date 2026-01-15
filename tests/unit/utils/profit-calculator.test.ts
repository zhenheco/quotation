/**
 * 利潤率計算工具函數測試
 * 測試路徑: lib/utils/profit-calculator.ts
 */

import { describe, it, expect } from 'vitest'
import {
  calculateGrossMargin,
  calculateMarkup,
  calculateSellingPriceFromMargin,
  calculateSellingPriceFromMarkup,
} from '@/lib/utils/profit-calculator'

describe('profit-calculator - 利潤率計算工具', () => {
  describe('calculateGrossMargin - 毛利率計算', () => {
    it('應該正確計算毛利率 (售價 150, 成本 100) = 33.33%', () => {
      const result = calculateGrossMargin(100, 150)
      expect(result).toBeCloseTo(33.33, 2)
    })

    it('應該正確計算毛利率 (售價 200, 成本 100) = 50%', () => {
      const result = calculateGrossMargin(100, 200)
      expect(result).toBe(50)
    })

    it('應該正確計算毛利率 (售價 100, 成本 100) = 0%', () => {
      const result = calculateGrossMargin(100, 100)
      expect(result).toBe(0)
    })

    it('成本為 0 時應該返回 100%', () => {
      const result = calculateGrossMargin(0, 100)
      expect(result).toBe(100)
    })

    it('售價為 0 時應該返回 0%', () => {
      const result = calculateGrossMargin(100, 0)
      expect(result).toBe(0)
    })

    it('虧損情況應該返回負數 (售價 80, 成本 100) = -25%', () => {
      const result = calculateGrossMargin(100, 80)
      expect(result).toBe(-25)
    })
  })

  describe('calculateMarkup - 成本加成率計算', () => {
    it('應該正確計算成本加成率 (售價 150, 成本 100) = 50%', () => {
      const result = calculateMarkup(100, 150)
      expect(result).toBe(50)
    })

    it('應該正確計算成本加成率 (售價 200, 成本 100) = 100%', () => {
      const result = calculateMarkup(100, 200)
      expect(result).toBe(100)
    })

    it('應該正確計算成本加成率 (售價 100, 成本 100) = 0%', () => {
      const result = calculateMarkup(100, 100)
      expect(result).toBe(0)
    })

    it('成本為 0 時應該返回 0%', () => {
      const result = calculateMarkup(0, 100)
      expect(result).toBe(0)
    })

    it('虧損情況應該返回負數 (售價 80, 成本 100) = -20%', () => {
      const result = calculateMarkup(100, 80)
      expect(result).toBe(-20)
    })
  })

  describe('calculateSellingPriceFromMargin - 從毛利率計算售價', () => {
    it('毛利率 50% 時，成本 100 的售價應為 200', () => {
      const result = calculateSellingPriceFromMargin(100, 50)
      expect(result).toBe(200)
    })

    it('毛利率 33.33% 時，成本 100 的售價應約為 150', () => {
      const result = calculateSellingPriceFromMargin(100, 33.33)
      expect(result).toBeCloseTo(150, 0)
    })

    it('毛利率 0% 時，售價應等於成本', () => {
      const result = calculateSellingPriceFromMargin(100, 0)
      expect(result).toBe(100)
    })

    it('毛利率 100% 時應該返回 Infinity（防禦性處理返回 0）', () => {
      const result = calculateSellingPriceFromMargin(100, 100)
      expect(result).toBe(0)
    })
  })

  describe('calculateSellingPriceFromMarkup - 從成本加成率計算售價', () => {
    it('成本加成率 50% 時，成本 100 的售價應為 150', () => {
      const result = calculateSellingPriceFromMarkup(100, 50)
      expect(result).toBe(150)
    })

    it('成本加成率 100% 時，成本 100 的售價應為 200', () => {
      const result = calculateSellingPriceFromMarkup(100, 100)
      expect(result).toBe(200)
    })

    it('成本加成率 0% 時，售價應等於成本', () => {
      const result = calculateSellingPriceFromMarkup(100, 0)
      expect(result).toBe(100)
    })
  })

  describe('邊界情況', () => {
    it('應該處理小數點精度', () => {
      const margin = calculateGrossMargin(99.99, 149.99)
      expect(margin).toBeCloseTo(33.34, 1)
    })

    it('應該處理非常大的數字', () => {
      const margin = calculateGrossMargin(1000000, 1500000)
      expect(margin).toBeCloseTo(33.33, 2)
    })

    it('應該處理非常小的數字', () => {
      const margin = calculateGrossMargin(0.01, 0.015)
      expect(margin).toBeCloseTo(33.33, 2)
    })
  })
})
