/**
 * 財政部電子發票 Excel 解析器
 * 解析從財政部電子發票平台下載的進項/銷項發票 Excel 檔案
 *
 * 支援格式：
 * - 進項發票：含賣方統一編號、賣方名稱欄位
 * - 銷項發票：含買方統一編號、買方名稱欄位
 *
 * 日期格式支援：
 * - 民國年：113/12/15、113-12-15
 * - 西元年：2024/12/15、2024-12-15
 * - Excel 日期序號
 *
 * 金額格式支援：
 * - 千分位：100,000
 * - 負數（折讓）：-5000
 * - 空值視為 0
 */

// ============================================
// 常數定義
// ============================================

/**
 * 進項發票欄位對應（財政部 Excel 格式）
 * 欄位名稱可能有多種變體
 */
export const MOF_PURCHASE_COLUMNS = {
  invoiceNumber: ['發票號碼', '發票字軌號碼', '統一發票號碼', 'Invoice Number'],
  date: ['發票日期', '開票日期', '日期', 'Invoice Date'],
  sellerTaxId: ['賣方統一編號', '銷售人統一編號', '銷售人統編', '賣方統編', 'Seller Tax ID'],
  sellerName: ['賣方名稱', '銷售人名稱', 'Seller Name'],
  untaxedAmount: ['銷售額', '未稅金額', '淨額', '應稅銷售額', 'Sales Amount'],
  taxAmount: ['稅額', '營業稅額', 'Tax Amount'],
  totalAmount: ['總計', '含稅金額', '發票金額', 'Total Amount'],
  taxType: ['課稅別', '稅別', 'Tax Type'],
  deductible: ['可扣抵', '扣抵', 'Deductible'],
} as const

/**
 * 銷項發票欄位對應（財政部 Excel 格式）
 */
export const MOF_SALES_COLUMNS = {
  invoiceNumber: ['發票號碼', '發票字軌號碼', '統一發票號碼', 'Invoice Number'],
  date: ['發票日期', '開票日期', '日期', 'Invoice Date'],
  buyerTaxId: ['買方統一編號', '買受人統一編號', '買受人統編', '買方統編', 'Buyer Tax ID'],
  buyerName: ['買方名稱', '買受人名稱', 'Buyer Name'],
  untaxedAmount: ['銷售額', '未稅金額', '淨額', '應稅銷售額', 'Sales Amount'],
  taxAmount: ['稅額', '營業稅額', 'Tax Amount'],
  totalAmount: ['總計', '含稅金額', '發票金額', 'Total Amount'],
  taxType: ['課稅別', '稅別', 'Tax Type'],
} as const

/**
 * 財政部「全部發票」(ALL) 格式欄位對應
 * 同時包含買方和賣方欄位，需用公司統編判斷進/銷項
 */
export const MOF_ALL_COLUMNS = {
  invoiceNumber: ['發票號碼', '發票字軌號碼', '統一發票號碼'],
  date: ['發票日期', '開票日期'],
  buyerTaxId: ['買方統一編號', '買受人統一編號', '買方統編'],
  buyerName: ['買方名稱', '買受人名稱'],
  sellerTaxId: ['賣方統一編號', '銷售人統一編號', '賣方統編'],
  sellerName: ['賣方名稱', '銷售人名稱'],
  untaxedAmount: ['銷售額合計', '銷售額', '未稅金額', '應稅銷售額'],
  taxableAmount: ['應稅銷售額'],
  zeroRatedAmount: ['零稅銷售額'],
  exemptAmount: ['免稅銷售額'],
  taxAmount: ['營業稅', '稅額', '營業稅額'],
  totalAmount: ['總計', '含稅金額', '發票金額'],
  taxType: ['課稅別', '稅別'],
  invoiceStatus: ['發票狀態'],
} as const

// ============================================
// 類型定義
// ============================================

/**
 * 匯入模式
 */
export type ImportMode = 'standard' | 'mof_purchase' | 'mof_sales' | 'mof_all'

/**
 * 解析後的發票資料
 */
export interface ParsedMofInvoice {
  /** 發票號碼（如 AB-12345678） */
  number: string
  /** 發票類型 */
  type: 'INPUT' | 'OUTPUT'
  /** 發票日期（YYYY-MM-DD 格式） */
  date: string
  /** 未稅金額 */
  untaxed_amount: number
  /** 稅額 */
  tax_amount: number
  /** 含稅金額 */
  total_amount: number
  /** 交易對象名稱 */
  counterparty_name?: string
  /** 交易對象統一編號 */
  counterparty_tax_id?: string
  /** 是否可扣抵（僅進項） */
  is_deductible?: boolean
  /** 課稅別：1=應稅, 2=零稅率, 3=免稅 */
  tax_type?: string
}

/**
 * 解析錯誤
 */
export interface ParseError {
  row: number
  column: string
  message: string
}

/**
 * 解析結果
 */
export interface MofParseResult {
  /** 成功解析的資料 */
  data: ParsedMofInvoice[]
  /** 解析錯誤 */
  errors: ParseError[]
  /** 匯入模式 */
  mode: ImportMode
}

// ============================================
// 日期解析函數
// ============================================

/**
 * 民國年轉西元年
 */
export function rocToWesternYear(rocYear: number): number {
  return rocYear + 1911
}

/**
 * 解析民國年日期格式
 * 支援格式：113/12/15、113-12-15、1131215
 */
export function parseRocDate(dateStr: string): string | null {
  const str = dateStr.trim()

  // 格式：113/12/15 或 113-12-15
  const slashMatch = str.match(/^(\d{2,3})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (slashMatch) {
    const [, rocYear, month, day] = slashMatch
    const year = rocToWesternYear(parseInt(rocYear, 10))
    const m = String(month).padStart(2, '0')
    const d = String(day).padStart(2, '0')

    // 驗證日期合理性（民國年應該小於 200）
    if (parseInt(rocYear, 10) < 200) {
      return `${year}-${m}-${d}`
    }
  }

  // 格式：1131215（無分隔符號，7位數）
  const compactMatch = str.match(/^(\d{3})(\d{2})(\d{2})$/)
  if (compactMatch) {
    const [, rocYear, month, day] = compactMatch
    const year = rocToWesternYear(parseInt(rocYear, 10))
    return `${year}-${month}-${day}`
  }

  return null
}

/**
 * 解析西元年日期格式
 * 支援格式：2024/12/15、2024-12-15
 */
export function parseWesternDate(dateStr: string): string | null {
  const str = dateStr.trim()

  // 格式：2024/12/15 或 2024-12-15
  const match = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (match) {
    const [, year, month, day] = match
    const m = String(month).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
  }

  return null
}

/**
 * 解析 Excel 日期序號
 * Excel 以 1900-01-01 為基準（序號 1）
 */
export function parseExcelDateSerial(serial: number): string | null {
  if (typeof serial !== 'number' || serial < 1 || serial > 100000) {
    return null
  }

  // Excel 的日期基準有 bug：將 1900 年當作閏年
  // 序號 1 = 1900-01-01，序號 60 = 1900-02-28（Excel 認為 1900-02-29 存在）
  const excelEpoch = new Date(1899, 11, 30) // 1899-12-30
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 智慧解析日期
 * 支援多種格式自動識別
 */
export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  // Date 對象
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 數字（Excel 日期序號）
  if (typeof value === 'number') {
    return parseExcelDateSerial(value)
  }

  const str = String(value).trim()
  if (!str) {
    return null
  }

  // 已經是正確格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  // 嘗試解析民國年格式
  const rocDate = parseRocDate(str)
  if (rocDate) {
    return rocDate
  }

  // 嘗試解析西元年格式
  const westernDate = parseWesternDate(str)
  if (westernDate) {
    return westernDate
  }

  // 嘗試使用 Date 建構子（最後手段）
  const date = new Date(str)
  if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return null
}

// ============================================
// 金額解析函數
// ============================================

/**
 * 解析金額
 * 處理千分位、負數、空值
 */
export function parseAmount(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  if (typeof value === 'number') {
    return Math.round(value * 100) / 100 // 四捨五入到小數點後兩位
  }

  const str = String(value).trim()
  if (!str) {
    return 0
  }

  // 移除千分位逗號和空白
  const cleaned = str.replace(/[,\s]/g, '')

  // 解析數字
  const num = parseFloat(cleaned)
  if (isNaN(num)) {
    return 0
  }

  return Math.round(num * 100) / 100
}

// ============================================
// 欄位匹配函數
// ============================================

/**
 * 在資料行中尋找匹配的欄位值
 * @param row - 資料行
 * @param columnNames - 可能的欄位名稱列表
 * @returns 找到的值，或 undefined
 */
export function findColumnValue(
  row: Record<string, unknown>,
  columnNames: readonly string[]
): unknown {
  for (const colName of columnNames) {
    if (colName in row && row[colName] !== undefined && row[colName] !== '') {
      return row[colName]
    }
    // 也檢查帶星號的必填欄位格式
    const withAsterisk = `${colName} *`
    if (withAsterisk in row && row[withAsterisk] !== undefined && row[withAsterisk] !== '') {
      return row[withAsterisk]
    }
  }
  return undefined
}

/**
 * 檢測 Excel 資料的匯入模式
 * 根據欄位名稱自動判斷是進項還是銷項
 */
export function detectImportMode(headers: string[]): ImportMode {
  const headerSet = new Set(headers.map((h) => h.replace(' *', '').replace(/\n/g, '').trim()))

  // 檢查是否有進項特徵欄位（賣方）
  const hasPurchaseFields = MOF_PURCHASE_COLUMNS.sellerTaxId.some((col) => headerSet.has(col))
  || MOF_PURCHASE_COLUMNS.sellerName.some((col) => headerSet.has(col))

  // 檢查是否有銷項特徵欄位（買方）
  const hasSalesFields = MOF_SALES_COLUMNS.buyerTaxId.some((col) => headerSet.has(col))
  || MOF_SALES_COLUMNS.buyerName.some((col) => headerSet.has(col))

  // ALL 格式：同時有買方和賣方欄位
  if (hasPurchaseFields && hasSalesFields) {
    return 'mof_all'
  }

  if (hasPurchaseFields && !hasSalesFields) {
    return 'mof_purchase'
  }
  if (hasSalesFields && !hasPurchaseFields) {
    return 'mof_sales'
  }

  // 無法確定，返回標準模式
  return 'standard'
}

// ============================================
// 發票解析函數
// ============================================

/**
 * 解析單筆進項發票資料
 */
export function parsePurchaseInvoiceRow(
  row: Record<string, unknown>,
  rowNumber: number
): { data: ParsedMofInvoice | null; errors: ParseError[] } {
  const errors: ParseError[] = []

  // 發票號碼（必填）
  const rawNumber = findColumnValue(row, MOF_PURCHASE_COLUMNS.invoiceNumber)
  const number = String(rawNumber || '').trim().replace(/\s/g, '')
  if (!number) {
    errors.push({ row: rowNumber, column: '發票號碼', message: '發票號碼為必填欄位' })
  }

  // 發票日期（必填）
  const rawDate = findColumnValue(row, MOF_PURCHASE_COLUMNS.date)
  const date = parseDate(rawDate)
  if (!date) {
    errors.push({
      row: rowNumber,
      column: '發票日期',
      message: `無法解析日期格式: ${String(rawDate)}`,
    })
  }

  // 賣方統一編號
  const sellerTaxId = String(findColumnValue(row, MOF_PURCHASE_COLUMNS.sellerTaxId) || '')
    .trim()
    .replace(/\s/g, '')

  // 賣方名稱
  const sellerName = String(findColumnValue(row, MOF_PURCHASE_COLUMNS.sellerName) || '').trim()

  // 金額
  let untaxedAmount = parseAmount(findColumnValue(row, MOF_PURCHASE_COLUMNS.untaxedAmount))
  const taxAmount = parseAmount(findColumnValue(row, MOF_PURCHASE_COLUMNS.taxAmount))

  // 含稅金額：優先使用 Excel 的值，否則計算
  const rawTotal = findColumnValue(row, MOF_PURCHASE_COLUMNS.totalAmount)
  const totalAmount = rawTotal !== undefined ? parseAmount(rawTotal) : untaxedAmount + taxAmount

  // 防護：若未稅金額為 0 但含稅金額 > 稅額，則反推未稅金額
  if (untaxedAmount === 0 && totalAmount > 0 && totalAmount > taxAmount) {
    untaxedAmount = totalAmount - taxAmount
  }

  // 驗證金額
  if (untaxedAmount < 0) {
    errors.push({ row: rowNumber, column: '銷售額', message: '銷售額不可為負數' })
  }
  if (taxAmount < 0) {
    errors.push({ row: rowNumber, column: '稅額', message: '稅額不可為負數' })
  }

  // 課稅別
  const taxType = String(findColumnValue(row, MOF_PURCHASE_COLUMNS.taxType) || '1').trim()

  // 可扣抵
  const rawDeductible = findColumnValue(row, MOF_PURCHASE_COLUMNS.deductible)
  const isDeductible =
    rawDeductible === undefined || rawDeductible === '' || rawDeductible === 'Y' || rawDeductible === '是' || rawDeductible === true || rawDeductible === 1

  if (errors.length > 0) {
    return { data: null, errors }
  }

  return {
    data: {
      number,
      type: 'INPUT',
      date: date!,
      untaxed_amount: untaxedAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      counterparty_name: sellerName || undefined,
      counterparty_tax_id: sellerTaxId || undefined,
      is_deductible: isDeductible,
      tax_type: taxType,
    },
    errors: [],
  }
}

/**
 * 解析單筆銷項發票資料
 */
export function parseSalesInvoiceRow(
  row: Record<string, unknown>,
  rowNumber: number
): { data: ParsedMofInvoice | null; errors: ParseError[] } {
  const errors: ParseError[] = []

  // 發票號碼（必填）
  const rawNumber = findColumnValue(row, MOF_SALES_COLUMNS.invoiceNumber)
  const number = String(rawNumber || '').trim().replace(/\s/g, '')
  if (!number) {
    errors.push({ row: rowNumber, column: '發票號碼', message: '發票號碼為必填欄位' })
  }

  // 發票日期（必填）
  const rawDate = findColumnValue(row, MOF_SALES_COLUMNS.date)
  const date = parseDate(rawDate)
  if (!date) {
    errors.push({
      row: rowNumber,
      column: '發票日期',
      message: `無法解析日期格式: ${String(rawDate)}`,
    })
  }

  // 買方統一編號
  const buyerTaxId = String(findColumnValue(row, MOF_SALES_COLUMNS.buyerTaxId) || '')
    .trim()
    .replace(/\s/g, '')

  // 買方名稱
  const buyerName = String(findColumnValue(row, MOF_SALES_COLUMNS.buyerName) || '').trim()

  // 金額
  let untaxedAmount = parseAmount(findColumnValue(row, MOF_SALES_COLUMNS.untaxedAmount))
  const taxAmount = parseAmount(findColumnValue(row, MOF_SALES_COLUMNS.taxAmount))

  // 含稅金額：優先使用 Excel 的值，否則計算
  const rawTotal = findColumnValue(row, MOF_SALES_COLUMNS.totalAmount)
  const totalAmount = rawTotal !== undefined ? parseAmount(rawTotal) : untaxedAmount + taxAmount

  // 防護：若未稅金額為 0 但含稅金額 > 稅額，則反推未稅金額
  if (untaxedAmount === 0 && totalAmount > 0 && totalAmount > taxAmount) {
    untaxedAmount = totalAmount - taxAmount
  }

  // 驗證金額
  if (untaxedAmount < 0) {
    errors.push({ row: rowNumber, column: '銷售額', message: '銷售額不可為負數' })
  }
  if (taxAmount < 0) {
    errors.push({ row: rowNumber, column: '稅額', message: '稅額不可為負數' })
  }

  // 課稅別
  const taxType = String(findColumnValue(row, MOF_SALES_COLUMNS.taxType) || '1').trim()

  if (errors.length > 0) {
    return { data: null, errors }
  }

  return {
    data: {
      number,
      type: 'OUTPUT',
      date: date!,
      untaxed_amount: untaxedAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      counterparty_name: buyerName || undefined,
      counterparty_tax_id: buyerTaxId || undefined,
      tax_type: taxType,
    },
    errors: [],
  }
}

// ============================================
// ALL 格式解析（同時含進/銷項）
// ============================================

/**
 * 課稅別文字轉代號
 * 財政部 ALL 格式使用中文（「應稅」「零稅率」「免稅」）
 */
function normalizeTaxType(value: unknown): string {
  const str = String(value || '').trim()
  if (str === '應稅' || str === '1') return '1'
  if (str === '零稅率' || str === '零稅' || str === '2') return '2'
  if (str === '免稅' || str === '3') return '3'
  return '1' // 預設應稅
}

/**
 * 解析單筆 ALL 格式發票資料
 * 根據公司統編判斷是進項或銷項
 */
export function parseMofAllInvoiceRow(
  row: Record<string, unknown>,
  rowNumber: number,
  companyTaxId: string
): { data: ParsedMofInvoice | null; errors: ParseError[] } {
  const errors: ParseError[] = []

  // 發票狀態（跳過作廢）
  const invoiceStatus = String(findColumnValue(row, MOF_ALL_COLUMNS.invoiceStatus) || '').trim()
  if (invoiceStatus.includes('作廢') || invoiceStatus.includes('註銷')) {
    return { data: null, errors: [] } // 靜默跳過
  }

  // 發票號碼（必填）
  const rawNumber = findColumnValue(row, MOF_ALL_COLUMNS.invoiceNumber)
  const number = String(rawNumber || '').trim().replace(/\s/g, '')
  if (!number) {
    errors.push({ row: rowNumber, column: '發票號碼', message: '發票號碼為必填欄位' })
  }

  // 發票日期（必填，可能帶時間如 "2026-01-07 12:24:47"）
  const rawDate = findColumnValue(row, MOF_ALL_COLUMNS.date)
  // 先截取日期部分（去掉時間）
  const dateOnly = typeof rawDate === 'string' ? rawDate.split(' ')[0] : rawDate
  const date = parseDate(dateOnly)
  if (!date) {
    errors.push({
      row: rowNumber,
      column: '發票日期',
      message: `無法解析日期格式: ${String(rawDate)}`,
    })
  }

  // 買賣方資訊
  const buyerTaxId = String(findColumnValue(row, MOF_ALL_COLUMNS.buyerTaxId) || '').trim().replace(/\s/g, '')
  const buyerName = String(findColumnValue(row, MOF_ALL_COLUMNS.buyerName) || '').trim()
  const sellerTaxId = String(findColumnValue(row, MOF_ALL_COLUMNS.sellerTaxId) || '').trim().replace(/\s/g, '')
  const sellerName = String(findColumnValue(row, MOF_ALL_COLUMNS.sellerName) || '').trim()

  // 判斷進/銷項：買方統編 = 自己 → 進項；賣方統編 = 自己 → 銷項
  let invoiceType: 'INPUT' | 'OUTPUT'
  let counterpartyName: string
  let counterpartyTaxId: string

  if (buyerTaxId === companyTaxId) {
    invoiceType = 'INPUT'
    counterpartyName = sellerName
    counterpartyTaxId = sellerTaxId
  } else if (sellerTaxId === companyTaxId) {
    invoiceType = 'OUTPUT'
    counterpartyName = buyerName
    counterpartyTaxId = buyerTaxId
  } else {
    // 無法判斷方向 — 嘗試用買方名稱是否與統編相同（有時買方名稱就是統編）
    if (buyerName === companyTaxId || buyerTaxId === companyTaxId.replace(/\s/g, '')) {
      invoiceType = 'INPUT'
      counterpartyName = sellerName
      counterpartyTaxId = sellerTaxId
    } else {
      errors.push({
        row: rowNumber,
        column: '統一編號',
        message: `無法判斷進/銷項：買方=${buyerTaxId}，賣方=${sellerTaxId}，公司=${companyTaxId}`,
      })
      return { data: null, errors }
    }
  }

  // 金額：優先使用銷售額合計，否則用應稅銷售額
  let untaxedAmount = parseAmount(findColumnValue(row, MOF_ALL_COLUMNS.untaxedAmount))
    || parseAmount(findColumnValue(row, MOF_ALL_COLUMNS.taxableAmount))
  const taxAmount = parseAmount(findColumnValue(row, MOF_ALL_COLUMNS.taxAmount))

  // 含稅金額
  const rawTotal = findColumnValue(row, MOF_ALL_COLUMNS.totalAmount)
  const totalAmount = rawTotal !== undefined ? parseAmount(rawTotal) : untaxedAmount + taxAmount

  // 防護：若未稅金額為 0 但含稅金額 > 稅額，則反推未稅金額
  if (untaxedAmount === 0 && totalAmount > 0 && totalAmount > taxAmount) {
    untaxedAmount = totalAmount - taxAmount
  }

  // 課稅別
  const taxType = normalizeTaxType(findColumnValue(row, MOF_ALL_COLUMNS.taxType))

  if (errors.length > 0) {
    return { data: null, errors }
  }

  return {
    data: {
      number,
      type: invoiceType,
      date: date!,
      untaxed_amount: untaxedAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      counterparty_name: counterpartyName || undefined,
      counterparty_tax_id: counterpartyTaxId || undefined,
      tax_type: taxType,
    },
    errors: [],
  }
}

// ============================================
// 主要解析函數
// ============================================

/**
 * 解析財政部 Excel 資料
 * @param rows - Excel 資料行
 * @param headers - 欄位標題
 * @param mode - 匯入模式（可選，會自動偵測）
 * @returns 解析結果
 */
export function parseMofExcel(
  rows: Record<string, unknown>[],
  headers: string[],
  mode?: ImportMode,
  companyTaxId?: string
): MofParseResult {
  // 自動偵測模式
  const detectedMode = mode || detectImportMode(headers)

  if (detectedMode === 'standard') {
    // 標準模式不在此處理
    return {
      data: [],
      errors: [{ row: 0, column: '', message: '無法識別財政部 Excel 格式，請確認欄位名稱' }],
      mode: 'standard',
    }
  }

  // ALL 模式需要公司統編
  const cleanCompanyTaxId = companyTaxId?.replace(/\s/g, '')
  if (detectedMode === 'mof_all' && !cleanCompanyTaxId) {
    return {
      data: [],
      errors: [{ row: 0, column: '', message: '全部發票格式需要公司統編來判斷進/銷項' }],
      mode: 'mof_all',
    }
  }

  const allData: ParsedMofInvoice[] = []
  const allErrors: ParseError[] = []

  const parseRow = detectedMode === 'mof_all'
    ? (row: Record<string, unknown>, rowNumber: number) =>
        parseMofAllInvoiceRow(row, rowNumber, cleanCompanyTaxId!)
    : detectedMode === 'mof_purchase'
      ? parsePurchaseInvoiceRow
      : parseSalesInvoiceRow

  rows.forEach((row, index) => {
    const rowNumber = index + 2 // Excel 第一行是標題，資料從第二行開始

    // 跳過完全空白的行
    const hasData = Object.values(row).some((v) => v !== undefined && v !== '' && v !== null)
    if (!hasData) {
      return
    }

    const { data, errors } = parseRow(row, rowNumber)

    if (data) {
      allData.push(data)
    }
    allErrors.push(...errors)
  })

  // 檢查重複發票號碼
  const seen = new Map<string, number>()
  allData.forEach((invoice, index) => {
    const rowNumber = index + 2
    if (seen.has(invoice.number)) {
      allErrors.push({
        row: rowNumber,
        column: '發票號碼',
        message: `發票號碼 ${invoice.number} 與第 ${seen.get(invoice.number)} 行重複`,
      })
    } else {
      seen.set(invoice.number, rowNumber)
    }
  })

  return {
    data: allData,
    errors: allErrors,
    mode: detectedMode,
  }
}

/**
 * 驗證解析結果是否可匯入
 */
export function validateMofParseResult(result: MofParseResult): {
  valid: boolean
  message: string
} {
  if (result.mode === 'standard') {
    return { valid: false, message: '無法識別財政部 Excel 格式' }
  }

  if (result.errors.length > 0) {
    return {
      valid: false,
      message: `共有 ${result.errors.length} 筆資料有錯誤`,
    }
  }

  if (result.data.length === 0) {
    return { valid: false, message: '沒有可匯入的資料' }
  }

  return { valid: true, message: `共 ${result.data.length} 筆資料可匯入` }
}
