/**
 * 自動欄位匹配演算法
 * 將用戶 Excel 的欄位名稱自動對應到系統欄位
 */

import type { ColumnMapping, ImportResourceType } from './types'
import { getColumnsForResource, getHeaderToKeyMap } from './template-columns'

/**
 * 各資源類型的關鍵字同義詞對照表
 * key: 同義詞, value: 系統欄位 key
 */
const SYNONYM_MAP: Record<string, string> = {
  // 客戶/供應商名稱
  '公司名': 'name_zh',
  '公司名稱': 'name_zh',
  '公司': 'name_zh',
  '名稱': 'name_zh',
  '客戶名': 'name_zh',
  '客戶名稱': 'name_zh',
  '供應商名': 'name_zh',
  '供應商名稱': 'name_zh',
  '品名': 'name_zh',
  '產品名': 'name_zh',
  '產品名稱': 'name_zh',
  '中文名稱': 'name_zh',
  'company': 'name_zh',
  'company name': 'name_zh',
  'name': 'name_zh',
  '英文名稱': 'name_en',
  'english name': 'name_en',
  // Email
  '信箱': 'email',
  '郵件': 'email',
  '電郵': 'email',
  'e-mail': 'email',
  'mail': 'email',
  // 電話
  '手機': 'phone',
  '行動電話': 'phone',
  '電話號碼': 'phone',
  '聯絡電話': 'phone',
  'tel': 'phone',
  'telephone': 'phone',
  'mobile': 'phone',
  // 地址
  '地址': 'address_zh',
  '中文地址': 'address_zh',
  '英文地址': 'address_en',
  'address': 'address_zh',
  // 統編
  '統編': 'tax_id',
  '稅籍編號': 'tax_id',
  'tax': 'tax_id',
  // 聯絡人
  '聯絡人': 'contact_name',
  '窗口': 'contact_name',
  '對接人': 'contact_name',
  'contact': 'contact_name',
  // 產品相關
  '單價': 'base_price',
  '價格': 'base_price',
  '售價': 'base_price',
  '定價': 'base_price',
  'price': 'base_price',
  '幣別': 'base_currency',
  'currency': 'base_currency',
  '成本': 'cost_price',
  'cost': 'cost_price',
  '類別': 'category',
  '分類': 'category',
  'category': 'category',
  '編號': 'sku',
  '產品編號': 'sku',
  '料號': 'sku',
  // 供應商相關
  '代碼': 'code',
  '供應商代碼': 'code',
  '供應商編號': 'code',
  '付款條件': 'payment_terms',
  '付款天數': 'payment_days',
  '銀行': 'bank_name',
  '帳號': 'bank_account',
  // 通用
  '備註': 'notes',
  '說明': 'notes',
  'note': 'notes',
  'notes': 'notes',
  'remark': 'notes',
  '網站': 'website',
  'website': 'website',
  '傳真': 'fax',
  'fax': 'fax',
  '單位': 'unit',
  'unit': 'unit',
  '啟用': 'is_active',
  'active': 'is_active',
}

/**
 * 自動匹配用戶欄位到系統欄位
 * @param sourceHeaders 用戶 Excel 的欄位名稱
 * @param resourceType 匯入資源類型
 * @returns 匹配結果陣列
 */
export function autoMatchColumns(
  sourceHeaders: string[],
  resourceType: ImportResourceType
): ColumnMapping[] {
  const headerToKeyMap = getHeaderToKeyMap(resourceType)
  const columns = getColumnsForResource(resourceType)
  const validKeys = new Set(columns.map((c) => c.key))

  // 追蹤已被使用的系統欄位，避免重複對應
  const usedTargetKeys = new Set<string>()

  // 建立結果，先嘗試匹配
  const preliminaryMappings = sourceHeaders.map((header): ColumnMapping & { _priority: number } => {
    const trimmed = header.trim()
    const normalized = trimmed.toLowerCase()

    // 策略 1: 精確匹配（headerToKeyMap 已包含 header、headerEn、key）
    const exactMatch = headerToKeyMap.get(trimmed) || headerToKeyMap.get(normalized)
    if (exactMatch && validKeys.has(exactMatch)) {
      return {
        sourceColumn: header,
        targetKey: exactMatch,
        confidence: 1.0,
        autoMatched: true,
        _priority: 1,
      }
    }

    // 策略 2: 同義詞對照表
    const synonymMatch = SYNONYM_MAP[normalized] || SYNONYM_MAP[trimmed]
    if (synonymMatch && validKeys.has(synonymMatch)) {
      return {
        sourceColumn: header,
        targetKey: synonymMatch,
        confidence: 0.8,
        autoMatched: true,
        _priority: 2,
      }
    }

    // 策略 3: 包含匹配 — 系統欄位的中文標題或關鍵字被包含在用戶欄位中
    for (const col of columns) {
      const cleanHeader = col.header.replace(' *', '')
      if (normalized.includes(cleanHeader.toLowerCase()) || cleanHeader.toLowerCase().includes(normalized)) {
        return {
          sourceColumn: header,
          targetKey: col.key,
          confidence: 0.7,
          autoMatched: true,
          _priority: 3,
        }
      }
    }

    // 無匹配
    return {
      sourceColumn: header,
      targetKey: null,
      confidence: 0,
      autoMatched: false,
      _priority: 99,
    }
  })

  // 按優先順序（信心度高的先分配）排序，解決衝突
  const sorted = [...preliminaryMappings].sort((a, b) => a._priority - b._priority || b.confidence - a.confidence)

  // 處理重複的 targetKey：信心度高的優先佔位，低信心度的重複則清空
  for (const item of sorted) {
    if (!item.targetKey) continue
    if (!usedTargetKeys.has(item.targetKey)) {
      usedTargetKeys.add(item.targetKey)
    } else {
      // 這個 targetKey 已被佔用，將此 mapping 設為不匯入
      item.targetKey = null
      item.confidence = 0
      item.autoMatched = false
    }
  }

  // 移除內部優先權欄位，產出最終結果
  return preliminaryMappings.map((m): ColumnMapping => ({
    sourceColumn: m.sourceColumn,
    targetKey: m.targetKey,
    confidence: m.confidence,
    autoMatched: m.autoMatched,
  }))
}

/**
 * 用 mapping 將原始資料轉換成系統格式
 * @param rawData 原始資料（用戶 Excel 欄位名稱為 key）
 * @param mappings 欄位對應設定
 * @returns 轉換後的資料（系統欄位 key 為 key）
 */
export function applyColumnMapping(
  rawData: Record<string, unknown>[],
  mappings: ColumnMapping[]
): Record<string, unknown>[] {
  // 建立 sourceColumn -> targetKey 的 map，排除不匯入的
  const mappingMap = new Map<string, string>()
  for (const m of mappings) {
    if (m.targetKey) {
      mappingMap.set(m.sourceColumn, m.targetKey)
    }
  }

  return rawData.map((row) => {
    const transformed: Record<string, unknown> = {}
    for (const [sourceCol, value] of Object.entries(row)) {
      const targetKey = mappingMap.get(sourceCol)
      if (targetKey) {
        transformed[targetKey] = value
      }
    }
    return transformed
  })
}
