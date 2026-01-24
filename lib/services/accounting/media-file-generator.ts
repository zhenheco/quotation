/**
 * 401 媒體申報檔產生器
 * 產生符合財政部「營業稅離線建檔系統」規範的 TXT 檔案
 *
 * 規格：
 * - 每筆資料固定 81 Bytes
 * - 編碼格式：UTF-8
 * - 無換行符號，每 81 字元為一筆資料連續排列
 *
 * 欄位定義（81 Bytes）：
 * | 序號 | 欄位名稱 | 位置 | 長度 | 型態 | 說明 |
 * |-----|---------|------|------|------|------|
 * | 1 | 格式代號 | 1-2 | 2 | 9(2) | 進銷項類型 |
 * | 2 | 稅籍編號 | 3-11 | 9 | 9(9) | 統編8碼+分支碼1碼 |
 * | 3 | 流水號 | 12-18 | 7 | X(7) | 從 0000001 開始 |
 * | 4 | 資料所屬年月 | 19-23 | 5 | 9(5) | 民國年3碼+月2碼 |
 * | 5 | 買受人統編/發票訖號 | 24-31 | 8 | X(8) | 依情境不同 |
 * | 6 | 銷售人統編/彙總張數 | 32-39 | 8 | X(8) | 依情境不同 |
 * | 7 | 發票字軌號碼 | 40-49 | 10 | X(10) | 2碼英文+8碼數字 |
 * | 8 | 銷售額 | 50-61 | 12 | 9(12) | 不含稅金額，靠右補零 |
 * | 9 | 課稅別 | 62 | 1 | 9(1) | 1=應稅, 2=零稅率, 3=免稅 |
 * | 10 | 稅額 | 63-72 | 10 | 9(10) | 營業稅額，靠右補零 |
 * | 11 | 扣抵代號 | 73 | 1 | 9(1) | 進項專用 |
 * | 12 | 彙加註記 | 74 | 1 | X(1) | 空白=逐筆, A=彙總 |
 * | 13 | 通關方式 | 75 | 1 | 9(1) | 零稅率專用 |
 * | 14 | 空白保留 | 76-81 | 6 | X(6) | 全部填空白 |
 */

import type { InvoiceDetail, TaxCategory } from './tax-report.service'

// ============================================
// 常數定義
// ============================================

/** 每筆資料固定長度 */
export const RECORD_LENGTH = 81

/** 格式代號對照表 */
export const FORMAT_CODES = {
  // 進項（21~29）
  INPUT: {
    THREE_COPY: '21', // 三聯式、電子計算機統一發票
    TWO_COPY: '22', // 二聯式收銀機發票、載有稅額之其他憑證
    THREE_COPY_RETURN: '23', // 三聯式發票之進貨退出或折讓
    TWO_COPY_RETURN: '24', // 二聯式發票之進貨退出或折讓
    E_INVOICE: '25', // 電子發票進項（最常用）
    SUMMARY_THREE: '26', // 彙總三聯式
    SUMMARY_TWO: '27', // 彙總二聯式
    CUSTOMS: '28', // 海關代徵營業稅繳納證
    CUSTOMS_REFUND: '29', // 海關退還溢繳營業稅
  },
  // 銷項（31~38）
  OUTPUT: {
    THREE_COPY: '31', // 三聯式、電子計算機統一發票
    TWO_COPY: '32', // 二聯式、二聯式收銀機發票
    THREE_COPY_RETURN: '33', // 三聯式發票之銷貨退回或折讓
    TWO_COPY_RETURN: '34', // 二聯式發票之銷貨退回或折讓
    E_INVOICE: '35', // 電子發票銷項（最常用）
    NO_INVOICE: '36', // 免用統一發票
    SPECIAL: '37', // 特種稅額銷項憑證
    SPECIAL_RETURN: '38', // 特種稅額銷貨退回或折讓
  },
} as const

/** 課稅別 */
export const TAX_TYPES = {
  TAXABLE: '1', // 應稅（5%）
  ZERO_RATED: '2', // 零稅率
  EXEMPT: '3', // 免稅
  SPECIAL: '9', // 特種稅額
} as const

/** 扣抵代號（僅進項使用） */
export const DEDUCTION_CODES = {
  DEDUCTIBLE: '1', // 得扣抵進項稅額
  NON_DEDUCTIBLE: '2', // 不得扣抵進項稅額
  DEDUCTIBLE_ASSET: '3', // 得扣抵之固定資產
  NON_DEDUCTIBLE_ASSET: '4', // 不得扣抵之固定資產
} as const

// ============================================
// 類型定義
// ============================================

/**
 * 媒體檔發票資料
 */
export interface MediaInvoiceData {
  /** 進項或銷項 */
  type: 'INPUT' | 'OUTPUT'
  /** 發票號碼（如 AB-12345678 或 AB12345678） */
  invoiceNumber: string
  /** 發票日期（YYYY-MM-DD 格式） */
  date: string
  /** 交易對象統編 */
  counterpartyTaxId: string
  /** 銷售額（未稅） */
  untaxedAmount: number
  /** 稅額 */
  taxAmount: number
  /** 稅類別 */
  taxCategory: TaxCategory
  /** 是否可扣抵（僅進項使用） */
  isDeductible?: boolean
  /** 是否為固定資產（僅進項使用） */
  isFixedAsset?: boolean
  /** 是否為彙總 */
  isSummary?: boolean
  /** 彙總張數（彙總時使用） */
  summaryCount?: number
  /** 發票訖號（彙總時使用） */
  invoiceEndNumber?: string
}

/**
 * 媒體檔產生選項
 */
export interface MediaFileOptions {
  /** 公司稅籍編號（統編8碼+分支碼1碼，總公司分支碼為0） */
  taxRegistrationNumber: string
  /** 申報年度（西元年） */
  year: number
  /** 雙月期（1-6） */
  biMonth: number
}

/**
 * 媒體檔產生結果
 */
export interface MediaFileResult {
  /** 媒體檔內容 */
  content: string
  /** 總筆數 */
  recordCount: number
  /** 進項筆數 */
  inputCount: number
  /** 銷項筆數 */
  outputCount: number
  /** 進項銷售額合計 */
  inputAmount: number
  /** 銷項銷售額合計 */
  outputAmount: number
  /** 進項稅額合計 */
  inputTax: number
  /** 銷項稅額合計 */
  outputTax: number
}

// ============================================
// 工具函數
// ============================================

/**
 * 將西元年轉換為民國年
 */
export function toRocYear(westernYear: number): number {
  return westernYear - 1911
}

/**
 * 格式化年月為 5 位數字（民國年3碼+月2碼）
 * 例如：2024年12月 → "11312"
 */
export function formatYearMonth(year: number, month: number): string {
  const rocYear = toRocYear(year)
  return `${String(rocYear).padStart(3, '0')}${String(month).padStart(2, '0')}`
}

/**
 * 從日期字串取得年月
 */
export function extractYearMonth(dateStr: string): { year: number; month: number } {
  const date = new Date(dateStr)
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  }
}

/**
 * 數字靠右補零
 */
export function padNumber(num: number, length: number): string {
  const absNum = Math.abs(Math.round(num))
  return String(absNum).padStart(length, '0')
}

/**
 * 文字靠左補空白
 */
export function padText(text: string, length: number): string {
  const trimmed = (text || '').substring(0, length)
  return trimmed.padEnd(length, ' ')
}

/**
 * 清理發票號碼（移除分隔符號）
 * AB-12345678 → AB12345678
 */
export function cleanInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber.replace(/[-\s]/g, '')
}

/**
 * 根據稅類別取得課稅別代碼
 */
export function getTaxTypeCode(taxCategory: TaxCategory): string {
  switch (taxCategory) {
    case 'TAXABLE_5':
      return TAX_TYPES.TAXABLE
    case 'ZERO_RATED':
      return TAX_TYPES.ZERO_RATED
    case 'EXEMPT':
      return TAX_TYPES.EXEMPT
    default:
      return TAX_TYPES.TAXABLE
  }
}

/**
 * 取得扣抵代號
 */
export function getDeductionCode(
  isDeductible: boolean,
  isFixedAsset: boolean
): string {
  if (isDeductible && isFixedAsset) return DEDUCTION_CODES.DEDUCTIBLE_ASSET
  if (isDeductible) return DEDUCTION_CODES.DEDUCTIBLE
  if (isFixedAsset) return DEDUCTION_CODES.NON_DEDUCTIBLE_ASSET
  return DEDUCTION_CODES.NON_DEDUCTIBLE
}

// ============================================
// 核心函數
// ============================================

/**
 * 產生單筆媒體檔記錄（81 bytes）
 */
export function generateMediaLine(
  invoice: MediaInvoiceData,
  options: MediaFileOptions,
  sequenceNumber: number
): string {
  const { taxRegistrationNumber, year, biMonth } = options
  const { type, invoiceNumber, counterpartyTaxId, untaxedAmount, taxAmount, taxCategory } = invoice

  // 確保稅籍編號為 9 碼（統編8碼+分支碼1碼）
  const taxRegNum = padText(taxRegistrationNumber, 9)

  // 格式代號（預設使用電子發票格式）
  const formatCode = type === 'INPUT' ? FORMAT_CODES.INPUT.E_INVOICE : FORMAT_CODES.OUTPUT.E_INVOICE

  // 流水號（7碼）
  const seqNum = padNumber(sequenceNumber, 7)

  // 計算申報年月（取雙月期的結束月份）
  const endMonth = biMonth * 2
  const yearMonth = formatYearMonth(year, endMonth)

  // 清理發票號碼
  const cleanedInvoiceNum = cleanInvoiceNumber(invoiceNumber)
  const invoiceTrack = padText(cleanedInvoiceNum, 10)

  // 買受人統編/發票訖號（8碼）
  // 進項：填自己公司統編（取前8碼）
  // 銷項：填買方統編
  let buyerTaxId: string
  if (type === 'INPUT') {
    buyerTaxId = padText(taxRegistrationNumber.substring(0, 8), 8)
  } else {
    buyerTaxId = padText(counterpartyTaxId || '', 8)
  }

  // 銷售人統編/彙總張數（8碼）
  // 進項：填賣方統編
  // 銷項：填自己公司統編（取前8碼）
  let sellerTaxId: string
  if (type === 'INPUT') {
    sellerTaxId = padText(counterpartyTaxId || '', 8)
  } else {
    sellerTaxId = padText(taxRegistrationNumber.substring(0, 8), 8)
  }

  // 銷售額（12碼，靠右補零）
  const salesAmount = padNumber(untaxedAmount, 12)

  // 課稅別（1碼）
  const taxType = getTaxTypeCode(taxCategory)

  // 稅額（10碼，靠右補零）
  const tax = padNumber(taxAmount, 10)

  // 扣抵代號（1碼）- 銷項不填（空白）
  let deductionCode = ' '
  if (type === 'INPUT') {
    const isDeductible = invoice.isDeductible !== false // 預設可扣抵
    const isFixedAsset = invoice.isFixedAsset === true
    deductionCode = getDeductionCode(isDeductible, isFixedAsset)
  }

  // 彙加註記（1碼）- 空白=逐筆, A=彙總
  const summaryMark = invoice.isSummary ? 'A' : ' '

  // 通關方式（1碼）- 非零稅率留空白
  const customsType = taxCategory === 'ZERO_RATED' ? '1' : ' '

  // 空白保留（6碼）
  const reserved = '      '

  // 組合 81 bytes 記錄
  const line =
    formatCode + // 1-2 (2)
    taxRegNum + // 3-11 (9)
    seqNum + // 12-18 (7)
    yearMonth + // 19-23 (5)
    buyerTaxId + // 24-31 (8)
    sellerTaxId + // 32-39 (8)
    invoiceTrack + // 40-49 (10)
    salesAmount + // 50-61 (12)
    taxType + // 62 (1)
    tax + // 63-72 (10)
    deductionCode + // 73 (1)
    summaryMark + // 74 (1)
    customsType + // 75 (1)
    reserved // 76-81 (6)

  // 驗證長度
  if (line.length !== RECORD_LENGTH) {
    throw new Error(
      `媒體檔記錄長度錯誤：預期 ${RECORD_LENGTH}，實際 ${line.length}。發票號碼：${invoiceNumber}`
    )
  }

  return line
}

/**
 * 從 InvoiceDetail 轉換為 MediaInvoiceData
 */
export function invoiceDetailToMediaData(
  detail: InvoiceDetail,
  type: 'INPUT' | 'OUTPUT'
): MediaInvoiceData {
  return {
    type,
    invoiceNumber: detail.invoiceNumber,
    date: detail.date,
    counterpartyTaxId: detail.counterpartyTaxId,
    untaxedAmount: detail.untaxedAmount,
    taxAmount: detail.taxAmount,
    taxCategory: detail.taxCategory,
    isDeductible: type === 'INPUT' ? detail.taxAmount > 0 : undefined,
    isFixedAsset: false,
    isSummary: false,
  }
}

/**
 * 產生完整媒體檔
 */
export function generateMediaFile(
  invoices: MediaInvoiceData[],
  options: MediaFileOptions
): MediaFileResult {
  let content = ''
  let sequenceNumber = 0
  let inputCount = 0
  let outputCount = 0
  let inputAmount = 0
  let outputAmount = 0
  let inputTax = 0
  let outputTax = 0

  for (const invoice of invoices) {
    sequenceNumber++
    const line = generateMediaLine(invoice, options, sequenceNumber)
    content += line

    // 統計
    if (invoice.type === 'INPUT') {
      inputCount++
      inputAmount += invoice.untaxedAmount
      inputTax += invoice.taxAmount
    } else {
      outputCount++
      outputAmount += invoice.untaxedAmount
      outputTax += invoice.taxAmount
    }
  }

  return {
    content,
    recordCount: sequenceNumber,
    inputCount,
    outputCount,
    inputAmount,
    outputAmount,
    inputTax,
    outputTax,
  }
}

/**
 * 驗證媒體檔格式
 */
export function validateMediaFile(content: string): {
  valid: boolean
  recordCount: number
  errors: string[]
} {
  const errors: string[] = []

  if (content.length === 0) {
    return { valid: true, recordCount: 0, errors: [] }
  }

  if (content.length % RECORD_LENGTH !== 0) {
    errors.push(
      `檔案長度 ${content.length} 不是 ${RECORD_LENGTH} 的倍數`
    )
  }

  const recordCount = Math.floor(content.length / RECORD_LENGTH)

  // 驗證每筆記錄
  for (let i = 0; i < recordCount; i++) {
    const start = i * RECORD_LENGTH
    const record = content.substring(start, start + RECORD_LENGTH)

    // 驗證格式代號
    const formatCode = record.substring(0, 2)
    const validInputCodes = Object.values(FORMAT_CODES.INPUT)
    const validOutputCodes = Object.values(FORMAT_CODES.OUTPUT)
    if (
      !validInputCodes.includes(formatCode as typeof validInputCodes[number]) &&
      !validOutputCodes.includes(formatCode as typeof validOutputCodes[number])
    ) {
      errors.push(`第 ${i + 1} 筆記錄格式代號錯誤：${formatCode}`)
    }

    // 驗證流水號
    const seqNum = record.substring(11, 18)
    const expectedSeq = String(i + 1).padStart(7, '0')
    if (seqNum !== expectedSeq) {
      errors.push(
        `第 ${i + 1} 筆記錄流水號錯誤：預期 ${expectedSeq}，實際 ${seqNum}`
      )
    }
  }

  return {
    valid: errors.length === 0,
    recordCount,
    errors,
  }
}
