/**
 * 備註解析工具函數測試
 * 測試路徑: lib/utils/notes-parser.ts
 */

import { describe, it, expect } from 'vitest'
import { parseNotes } from '@/lib/utils/notes-parser'

describe('parseNotes - 備註解析工具函數', () => {
  describe('處理空值', () => {
    it('應該對 null 返回空字串', () => {
      expect(parseNotes(null)).toBe('')
    })

    it('應該對 undefined 返回空字串', () => {
      expect(parseNotes(undefined)).toBe('')
    })

    it('應該對空字串返回空字串', () => {
      expect(parseNotes('')).toBe('')
    })
  })

  describe('處理純字串', () => {
    it('應該直接返回純文字字串', () => {
      expect(parseNotes('這是備註內容')).toBe('這是備註內容')
    })

    it('應該將跳脫的換行符 \\n 轉換為實際換行', () => {
      expect(parseNotes('第一行\\n第二行')).toBe('第一行\n第二行')
    })

    it('應該處理多個跳脫換行符', () => {
      expect(parseNotes('第一行\\n第二行\\n第三行')).toBe('第一行\n第二行\n第三行')
    })
  })

  describe('處理 JSON 字串', () => {
    it('應該解析 JSON 字串並提取 zh 欄位', () => {
      const jsonString = '{"zh":"中文備註","en":"English notes"}'
      expect(parseNotes(jsonString)).toBe('中文備註')
    })

    it('應該處理 JSON 字串中的跳脫換行符', () => {
      const jsonString = '{"zh":"第一行\\n第二行","en":"Line 1\\nLine 2"}'
      expect(parseNotes(jsonString)).toBe('第一行\n第二行')
    })

    it('應該處理只有 zh 欄位的 JSON', () => {
      const jsonString = '{"zh":"只有中文"}'
      expect(parseNotes(jsonString)).toBe('只有中文')
    })

    it('應該在缺少 zh 欄位時返回原始字串', () => {
      const jsonString = '{"en":"Only English"}'
      // 解析後沒有 zh，應該返回原始字串（去除 JSON 格式）
      expect(parseNotes(jsonString)).toBe('{"en":"Only English"}')
    })
  })

  describe('處理物件', () => {
    it('應該從物件中提取 zh 欄位', () => {
      const obj = { zh: '中文備註', en: 'English notes' }
      expect(parseNotes(obj)).toBe('中文備註')
    })

    it('應該處理物件中的跳脫換行符', () => {
      const obj = { zh: '第一行\\n第二行', en: 'Line 1\\nLine 2' }
      expect(parseNotes(obj)).toBe('第一行\n第二行')
    })

    it('應該在物件缺少 zh 欄位時返回空字串', () => {
      const obj = { en: 'Only English' }
      expect(parseNotes(obj)).toBe('')
    })
  })

  describe('邊界情況', () => {
    it('應該處理無效的 JSON 字串', () => {
      const invalidJson = '{invalid json}'
      expect(parseNotes(invalidJson)).toBe('{invalid json}')
    })

    it('應該處理數字輸入', () => {
      expect(parseNotes(123 as unknown)).toBe('123')
    })

    it('應該處理布林值輸入', () => {
      expect(parseNotes(true as unknown)).toBe('true')
    })

    it('應該處理陣列輸入', () => {
      const arr = ['item1', 'item2']
      expect(parseNotes(arr as unknown)).toBe('')
    })
  })
})
