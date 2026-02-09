/**
 * 批量匯入功能的類型定義
 */

/** 支援匯入的資源類型 */
export type ImportResourceType = 'customers' | 'products' | 'suppliers'

/** 重複資料處理方式 */
export type DuplicateHandling = 'skip' | 'update' | 'error'

/** 匯入步驟 */
export type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'

/** 欄位對應定義 */
export interface ColumnMapping {
  /** 用戶 Excel 的欄位名稱 */
  sourceColumn: string
  /** 系統欄位 key，null 表示「不匯入」 */
  targetKey: string | null
  /** 匹配信心度 0-1 */
  confidence: number
  /** 是否為自動匹配 */
  autoMatched: boolean
}

/** 範本欄位定義 */
export interface ImportTemplateColumn {
  /** 欄位 key（英文，用於程式處理） */
  key: string
  /** 欄位標題（中文） */
  header: string
  /** 欄位標題（英文） */
  headerEn: string
  /** Excel 欄位寬度 */
  width: number
  /** 是否必填 */
  required: boolean
  /** 欄位說明（中文） */
  description: string
  /** 欄位說明（英文） */
  descriptionEn: string
  /** 範例值 */
  example: string
  /** 驗證規則 */
  validation?: {
    type: 'text' | 'number' | 'email' | 'boolean' | 'list'
    values?: string[]
    min?: number
    max?: number
  }
}

/** 驗證錯誤 */
export interface ValidationError {
  /** 資料行號（從 1 開始，不含標題行） */
  row: number
  /** 欄位名稱 */
  column: string
  /** 錯誤訊息（中文） */
  message: string
  /** 錯誤訊息（英文） */
  messageEn: string
}

/** 解析後的資料行（帶元資料） */
export interface ParsedRow {
  /** 原始行號 */
  _rowNumber: number
  /** 是否為重複資料 */
  _isDuplicate?: boolean
  /** 重複的現有記錄 ID */
  _existingId?: string
  /** 重複欄位名稱 */
  _duplicateField?: string
  /** 驗證錯誤 */
  _errors?: ValidationError[]
  /** 原始資料 */
  [key: string]: unknown
}

/** 重複資料資訊 */
export interface DuplicateInfo {
  /** 資料行號 */
  row: number
  /** 重複的欄位名稱 */
  field: string
  /** 重複的值 */
  value: string
  /** 現有記錄 ID */
  existingId: string
}

/** 匯入預覽結果 */
export interface ImportPreviewResult {
  /** 有效資料行（通過驗證且非重複） */
  validRows: ParsedRow[]
  /** 無效資料行（驗證失敗） */
  invalidRows: ParsedRow[]
  /** 所有驗證錯誤 */
  errors: ValidationError[]
  /** 重複資料資訊 */
  duplicates: DuplicateInfo[]
  /** 總資料行數 */
  totalRows: number
}

/** 匯入結果 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean
  /** 成功匯入數量 */
  importedCount: number
  /** 更新數量（重複且選擇更新） */
  updatedCount: number
  /** 跳過數量（重複且選擇跳過） */
  skippedCount: number
  /** 錯誤數量 */
  errorCount: number
  /** 錯誤詳情 */
  errors: ValidationError[]
}

// ============================================
// 各資源類型的匯入資料行定義
// ============================================

/** 客戶匯入資料行 */
export interface CustomerImportRow {
  /** 客戶名稱（中文）- 必填 */
  name_zh: string
  /** 客戶名稱（英文） */
  name_en?: string
  /** 電子郵件 */
  email?: string
  /** 電話 */
  phone?: string
  /** 傳真 */
  fax?: string
  /** 地址（中文） */
  address_zh?: string
  /** 地址（英文） */
  address_en?: string
  /** 統一編號 */
  tax_id?: string
  /** 聯絡人姓名 */
  contact_name?: string
  /** 聯絡人電話 */
  contact_phone?: string
  /** 聯絡人 Email */
  contact_email?: string
  /** 備註 */
  notes?: string
}

/** 產品匯入資料行 */
export interface ProductImportRow {
  /** SKU - 重複檢測主鍵（選填） */
  sku?: string
  /** 產品名稱（中文）- 必填 */
  name_zh: string
  /** 產品名稱（英文） */
  name_en?: string
  /** 產品描述（中文） */
  description_zh?: string
  /** 產品描述（英文） */
  description_en?: string
  /** 售價 - 必填 */
  base_price: number
  /** 售價幣別 - 必填，預設 TWD */
  base_currency: string
  /** 分類 */
  category?: string
  /** 成本價 */
  cost_price?: number
  /** 成本幣別 */
  cost_currency?: string
  /** 單位 */
  unit?: string
  /** 是否啟用 */
  is_active?: boolean
}

/** 供應商匯入資料行 */
export interface SupplierImportRow {
  /** 供應商名稱（中文）- 必填 */
  name_zh: string
  /** 供應商名稱（英文） */
  name_en?: string
  /** 供應商代碼 - 重複檢測主鍵 */
  code?: string
  /** 聯絡人姓名 */
  contact_name?: string
  /** 聯絡人電話 */
  contact_phone?: string
  /** 聯絡人 Email */
  contact_email?: string
  /** 公司電話 */
  phone?: string
  /** 公司 Email */
  email?: string
  /** 傳真 */
  fax?: string
  /** 地址（中文） */
  address_zh?: string
  /** 地址（英文） */
  address_en?: string
  /** 網站 */
  website?: string
  /** 統一編號 - 次要重複檢測鍵 */
  tax_id?: string
  /** 付款條件 */
  payment_terms?: string
  /** 付款天數 */
  payment_days?: number
  /** 銀行名稱 */
  bank_name?: string
  /** 銀行帳號 */
  bank_account?: string
  /** 是否啟用 */
  is_active?: boolean
  /** 備註 */
  notes?: string
}

// ============================================
// API 請求/回應類型
// ============================================

/** 匯入 API 請求 */
export interface BatchImportRequest {
  /** 匯入資料 */
  data: ParsedRow[]
  /** 公司 ID */
  company_id: string
  /** 重複處理方式 */
  duplicateHandling: DuplicateHandling
}

/** 匯入 API 回應 */
export interface BatchImportResponse {
  /** 是否成功 */
  success: boolean
  /** 匯入結果 */
  result?: ImportResult
  /** 錯誤訊息 */
  error?: string
}

/** 預覽 API 請求 */
export interface BatchPreviewRequest {
  /** 解析後的資料 */
  data: ParsedRow[]
  /** 公司 ID */
  company_id: string
}

/** 預覽 API 回應 */
export interface BatchPreviewResponse {
  /** 是否成功 */
  success: boolean
  /** 預覽結果 */
  preview?: ImportPreviewResult
  /** 錯誤訊息 */
  error?: string
}
