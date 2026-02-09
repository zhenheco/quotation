/**
 * 匯入範本的欄位定義
 * 用於生成範本和驗證匯入資料
 */

import type { ImportTemplateColumn, ImportResourceType } from './types'

/** 客戶匯入欄位定義 */
export const CUSTOMER_COLUMNS: ImportTemplateColumn[] = [
  {
    key: 'name_zh',
    header: '客戶名稱(中) *',
    headerEn: 'Name (Chinese) *',
    width: 25,
    required: true,
    description: '客戶公司或個人名稱（中文），必填',
    descriptionEn: 'Customer company or individual name (Chinese), required',
    example: '台北科技股份有限公司',
  },
  {
    key: 'name_en',
    header: '客戶名稱(英)',
    headerEn: 'Name (English)',
    width: 25,
    required: false,
    description: '客戶名稱英文版本',
    descriptionEn: 'Customer name in English',
    example: 'Taipei Tech Co., Ltd.',
  },
  {
    key: 'email',
    header: '電子郵件',
    headerEn: 'Email',
    width: 30,
    required: false,
    description: '客戶電子郵件，選填，若有填寫則優先用於識別重複資料',
    descriptionEn: 'Customer email, optional, used for duplicate detection if provided',
    example: 'contact@example.com',
    validation: { type: 'email' },
  },
  {
    key: 'phone',
    header: '電話',
    headerEn: 'Phone',
    width: 15,
    required: false,
    description: '公司電話',
    descriptionEn: 'Company phone number',
    example: '02-1234-5678',
  },
  {
    key: 'fax',
    header: '傳真',
    headerEn: 'Fax',
    width: 15,
    required: false,
    description: '傳真號碼',
    descriptionEn: 'Fax number',
    example: '02-1234-5679',
  },
  {
    key: 'address_zh',
    header: '地址(中)',
    headerEn: 'Address (Chinese)',
    width: 40,
    required: false,
    description: '公司地址（中文）',
    descriptionEn: 'Company address in Chinese',
    example: '台北市信義區信義路五段7號',
  },
  {
    key: 'address_en',
    header: '地址(英)',
    headerEn: 'Address (English)',
    width: 40,
    required: false,
    description: '公司地址（英文）',
    descriptionEn: 'Company address in English',
    example: 'No. 7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City',
  },
  {
    key: 'tax_id',
    header: '統一編號',
    headerEn: 'Tax ID',
    width: 12,
    required: false,
    description: '公司統一編號（8碼數字）',
    descriptionEn: 'Company tax ID (8 digits)',
    example: '12345678',
  },
  {
    key: 'contact_name',
    header: '聯絡人姓名',
    headerEn: 'Contact Person',
    width: 15,
    required: false,
    description: '主要聯絡人姓名',
    descriptionEn: 'Primary contact person name',
    example: '王小明',
  },
  {
    key: 'contact_phone',
    header: '聯絡人電話',
    headerEn: 'Contact Phone',
    width: 15,
    required: false,
    description: '聯絡人電話',
    descriptionEn: 'Contact person phone',
    example: '0912-345-678',
  },
  {
    key: 'contact_email',
    header: '聯絡人Email',
    headerEn: 'Contact Email',
    width: 25,
    required: false,
    description: '聯絡人電子郵件',
    descriptionEn: 'Contact person email',
    example: 'wang@example.com',
    validation: { type: 'email' },
  },
  {
    key: 'notes',
    header: '備註',
    headerEn: 'Notes',
    width: 40,
    required: false,
    description: '其他備註事項',
    descriptionEn: 'Additional notes',
    example: 'VIP 客戶，優先處理',
  },
]

/** 產品匯入欄位定義 */
export const PRODUCT_COLUMNS: ImportTemplateColumn[] = [
  {
    key: 'sku',
    header: 'SKU',
    headerEn: 'SKU',
    width: 15,
    required: false,
    description: '產品編號，用於識別重複資料',
    descriptionEn: 'Stock Keeping Unit, used for duplicate detection',
    example: 'PROD-001',
  },
  {
    key: 'name_zh',
    header: '產品名稱(中) *',
    headerEn: 'Name (Chinese) *',
    width: 30,
    required: true,
    description: '產品名稱（中文），必填',
    descriptionEn: 'Product name (Chinese), required',
    example: '無線藍牙耳機',
  },
  {
    key: 'name_en',
    header: '產品名稱(英)',
    headerEn: 'Name (English)',
    width: 30,
    required: false,
    description: '產品名稱（英文）',
    descriptionEn: 'Product name in English',
    example: 'Wireless Bluetooth Earbuds',
  },
  {
    key: 'description_zh',
    header: '產品描述(中)',
    headerEn: 'Description (Chinese)',
    width: 40,
    required: false,
    description: '產品描述（中文）',
    descriptionEn: 'Product description in Chinese',
    example: '高品質藍牙5.0，續航8小時',
  },
  {
    key: 'description_en',
    header: '產品描述(英)',
    headerEn: 'Description (English)',
    width: 40,
    required: false,
    description: '產品描述（英文）',
    descriptionEn: 'Product description in English',
    example: 'High quality Bluetooth 5.0, 8-hour battery life',
  },
  {
    key: 'base_price',
    header: '售價 *',
    headerEn: 'Price *',
    width: 12,
    required: true,
    description: '產品售價，必填，數字格式',
    descriptionEn: 'Product price, required, numeric format',
    example: '1990',
    validation: { type: 'number', min: 0 },
  },
  {
    key: 'base_currency',
    header: '幣別 *',
    headerEn: 'Currency *',
    width: 8,
    required: true,
    description: '售價幣別，必填，如 TWD、USD',
    descriptionEn: 'Price currency, required, e.g., TWD, USD',
    example: 'TWD',
    validation: { type: 'list', values: ['TWD', 'USD', 'EUR', 'JPY', 'CNY'] },
  },
  {
    key: 'category',
    header: '分類',
    headerEn: 'Category',
    width: 15,
    required: false,
    description: '產品分類',
    descriptionEn: 'Product category',
    example: '3C周邊',
  },
  {
    key: 'cost_price',
    header: '成本價',
    headerEn: 'Cost Price',
    width: 12,
    required: false,
    description: '產品成本價，數字格式',
    descriptionEn: 'Product cost price, numeric format',
    example: '800',
    validation: { type: 'number', min: 0 },
  },
  {
    key: 'cost_currency',
    header: '成本幣別',
    headerEn: 'Cost Currency',
    width: 10,
    required: false,
    description: '成本幣別',
    descriptionEn: 'Cost currency',
    example: 'TWD',
    validation: { type: 'list', values: ['TWD', 'USD', 'EUR', 'JPY', 'CNY'] },
  },
  {
    key: 'unit',
    header: '單位',
    headerEn: 'Unit',
    width: 8,
    required: false,
    description: '計量單位',
    descriptionEn: 'Unit of measurement',
    example: '個',
  },
  {
    key: 'is_active',
    header: '啟用',
    headerEn: 'Active',
    width: 8,
    required: false,
    description: '是否啟用，是/否 或 true/false',
    descriptionEn: 'Whether active, Yes/No or true/false',
    example: '是',
    validation: { type: 'boolean' },
  },
]

/** 供應商匯入欄位定義 */
export const SUPPLIER_COLUMNS: ImportTemplateColumn[] = [
  {
    key: 'name_zh',
    header: '供應商名稱(中) *',
    headerEn: 'Name (Chinese) *',
    width: 25,
    required: true,
    description: '供應商公司名稱（中文），必填',
    descriptionEn: 'Supplier company name (Chinese), required',
    example: '優質貿易有限公司',
  },
  {
    key: 'name_en',
    header: '供應商名稱(英)',
    headerEn: 'Name (English)',
    width: 25,
    required: false,
    description: '供應商名稱（英文）',
    descriptionEn: 'Supplier name in English',
    example: 'Quality Trading Co., Ltd.',
  },
  {
    key: 'code',
    header: '供應商代碼',
    headerEn: 'Supplier Code',
    width: 12,
    required: false,
    description: '供應商代碼，用於識別重複資料',
    descriptionEn: 'Supplier code, used for duplicate detection',
    example: 'SUP-001',
  },
  {
    key: 'contact_name',
    header: '聯絡人姓名',
    headerEn: 'Contact Person',
    width: 15,
    required: false,
    description: '主要聯絡人姓名',
    descriptionEn: 'Primary contact person name',
    example: '李大華',
  },
  {
    key: 'contact_phone',
    header: '聯絡人電話',
    headerEn: 'Contact Phone',
    width: 15,
    required: false,
    description: '聯絡人電話',
    descriptionEn: 'Contact person phone',
    example: '0912-345-678',
  },
  {
    key: 'contact_email',
    header: '聯絡人Email',
    headerEn: 'Contact Email',
    width: 25,
    required: false,
    description: '聯絡人電子郵件',
    descriptionEn: 'Contact person email',
    example: 'lee@example.com',
    validation: { type: 'email' },
  },
  {
    key: 'phone',
    header: '公司電話',
    headerEn: 'Phone',
    width: 15,
    required: false,
    description: '公司電話',
    descriptionEn: 'Company phone number',
    example: '02-8765-4321',
  },
  {
    key: 'email',
    header: '公司Email',
    headerEn: 'Email',
    width: 25,
    required: false,
    description: '公司電子郵件',
    descriptionEn: 'Company email',
    example: 'info@supplier.com',
    validation: { type: 'email' },
  },
  {
    key: 'fax',
    header: '傳真',
    headerEn: 'Fax',
    width: 15,
    required: false,
    description: '傳真號碼',
    descriptionEn: 'Fax number',
    example: '02-8765-4322',
  },
  {
    key: 'address_zh',
    header: '地址(中)',
    headerEn: 'Address (Chinese)',
    width: 40,
    required: false,
    description: '公司地址（中文）',
    descriptionEn: 'Company address in Chinese',
    example: '新北市板橋區中山路一段100號',
  },
  {
    key: 'address_en',
    header: '地址(英)',
    headerEn: 'Address (English)',
    width: 40,
    required: false,
    description: '公司地址（英文）',
    descriptionEn: 'Company address in English',
    example: 'No. 100, Sec. 1, Zhongshan Rd., Banqiao Dist., New Taipei City',
  },
  {
    key: 'website',
    header: '網站',
    headerEn: 'Website',
    width: 30,
    required: false,
    description: '公司網站',
    descriptionEn: 'Company website',
    example: 'https://www.supplier.com',
  },
  {
    key: 'tax_id',
    header: '統一編號',
    headerEn: 'Tax ID',
    width: 12,
    required: false,
    description: '公司統一編號（8碼數字），次要重複檢測鍵',
    descriptionEn: 'Company tax ID (8 digits), secondary duplicate key',
    example: '87654321',
  },
  {
    key: 'payment_terms',
    header: '付款條件',
    headerEn: 'Payment Terms',
    width: 15,
    required: false,
    description: '付款條件，如月結、T/T等',
    descriptionEn: 'Payment terms, e.g., Monthly, T/T',
    example: '月結30天',
  },
  {
    key: 'payment_days',
    header: '付款天數',
    headerEn: 'Payment Days',
    width: 10,
    required: false,
    description: '付款天數，數字格式',
    descriptionEn: 'Payment days, numeric format',
    example: '30',
    validation: { type: 'number', min: 0 },
  },
  {
    key: 'bank_name',
    header: '銀行名稱',
    headerEn: 'Bank Name',
    width: 20,
    required: false,
    description: '收款銀行名稱',
    descriptionEn: 'Bank name',
    example: '台灣銀行',
  },
  {
    key: 'bank_account',
    header: '銀行帳號',
    headerEn: 'Bank Account',
    width: 20,
    required: false,
    description: '銀行帳號',
    descriptionEn: 'Bank account number',
    example: '012-34567890',
  },
  {
    key: 'is_active',
    header: '啟用',
    headerEn: 'Active',
    width: 8,
    required: false,
    description: '是否啟用，是/否 或 true/false',
    descriptionEn: 'Whether active, Yes/No or true/false',
    example: '是',
    validation: { type: 'boolean' },
  },
  {
    key: 'notes',
    header: '備註',
    headerEn: 'Notes',
    width: 40,
    required: false,
    description: '其他備註事項',
    descriptionEn: 'Additional notes',
    example: '優質供應商，品質穩定',
  },
]

/** 根據資源類型取得欄位定義 */
export function getColumnsForResource(
  resourceType: ImportResourceType
): ImportTemplateColumn[] {
  switch (resourceType) {
    case 'customers':
      return CUSTOMER_COLUMNS
    case 'products':
      return PRODUCT_COLUMNS
    case 'suppliers':
      return SUPPLIER_COLUMNS
    default:
      throw new Error(`Unknown resource type: ${resourceType}`)
  }
}

/** 取得必填欄位 */
export function getRequiredColumns(
  resourceType: ImportResourceType
): ImportTemplateColumn[] {
  return getColumnsForResource(resourceType).filter((col) => col.required)
}

/** 取得欄位標題對應（中文 header -> key） */
export function getHeaderToKeyMap(
  resourceType: ImportResourceType
): Map<string, string> {
  const columns = getColumnsForResource(resourceType)
  const map = new Map<string, string>()

  columns.forEach((col) => {
    // 支援多種標題格式
    map.set(col.header, col.key)
    map.set(col.header.replace(' *', ''), col.key) // 移除必填標記
    map.set(col.headerEn, col.key)
    map.set(col.headerEn.replace(' *', ''), col.key)
    map.set(col.key, col.key) // 也支援直接用 key
  })

  return map
}
