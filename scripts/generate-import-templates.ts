/**
 * 產生批量匯入範本 Excel 和 CSV 檔案
 *
 * 用法：pnpm tsx scripts/generate-import-templates.ts
 *
 * 此腳本會產生以下範本檔案到 public/templates/：
 * - customer-import-template.xlsx / .csv
 * - product-import-template.xlsx / .csv
 * - supplier-import-template.xlsx / .csv
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

import {
  CUSTOMER_COLUMNS,
  PRODUCT_COLUMNS,
  SUPPLIER_COLUMNS,
} from '../lib/services/batch-import/template-columns'
import type { ImportTemplateColumn } from '../lib/services/batch-import/types'

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'templates')

/**
 * 產生 Excel 範本
 */
function generateExcelTemplate(
  columns: ImportTemplateColumn[],
  resourceName: string,
  _resourceNameEn: string,
  exampleRows: Record<string, string | number | boolean>[]
): Buffer {
  const workbook = XLSX.utils.book_new()

  // === 資料工作表 ===
  const headers = columns.map((col) => col.header)
  const dataRows = exampleRows.map((row) =>
    columns.map((col) => row[col.key] ?? '')
  )

  const dataSheetData = [headers, ...dataRows]
  const dataSheet = XLSX.utils.aoa_to_sheet(dataSheetData)
  dataSheet['!cols'] = columns.map((col) => ({ wch: col.width }))

  XLSX.utils.book_append_sheet(workbook, dataSheet, `${resourceName}資料`)

  // === 說明工作表 ===
  const helpHeaders = ['欄位', '必填', '說明', '範例']
  const helpData = columns.map((col) => [
    col.header.replace(' *', ''),
    col.required ? '是' : '否',
    col.description,
    col.example,
  ])

  const notes = [
    [],
    ['注意事項：'],
    ['1. 帶有 * 符號的欄位為必填欄位'],
    ['2. 第一行為標題行，請勿刪除'],
    ['3. 範例資料請刪除後再輸入實際資料'],
    ['4. 單次匯入上限 500 筆'],
    ['5. 重複資料會根據您選擇的處理方式進行處理'],
  ]

  const helpSheetData = [helpHeaders, ...helpData, ...notes]
  const helpSheet = XLSX.utils.aoa_to_sheet(helpSheetData)
  helpSheet['!cols'] = [
    { wch: 20 },
    { wch: 8 },
    { wch: 50 },
    { wch: 30 },
  ]

  XLSX.utils.book_append_sheet(workbook, helpSheet, '說明')

  // === 英文說明工作表 ===
  const helpHeadersEn = ['Field', 'Required', 'Description', 'Example']
  const helpDataEn = columns.map((col) => [
    col.headerEn.replace(' *', ''),
    col.required ? 'Yes' : 'No',
    col.descriptionEn,
    col.example,
  ])

  const notesEn = [
    [],
    ['Notes:'],
    ['1. Fields marked with * are required'],
    ['2. Do not delete the header row'],
    ['3. Please delete example data before entering actual data'],
    ['4. Maximum 500 rows per import'],
    ['5. Duplicate data will be handled based on your selection'],
  ]

  const helpSheetDataEn = [helpHeadersEn, ...helpDataEn, ...notesEn]
  const helpSheetEn = XLSX.utils.aoa_to_sheet(helpSheetDataEn)
  helpSheetEn['!cols'] = [
    { wch: 25 },
    { wch: 10 },
    { wch: 50 },
    { wch: 35 },
  ]

  XLSX.utils.book_append_sheet(workbook, helpSheetEn, 'Instructions')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/**
 * 產生 CSV 範本
 */
function generateCsvTemplate(
  columns: ImportTemplateColumn[],
  exampleRows: Record<string, string | number | boolean>[]
): string {
  const headers = columns.map((col) => col.header)
  const dataRows = exampleRows.map((row) =>
    columns.map((col) => {
      const value = row[col.key]
      // 處理包含逗號的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value ?? ''
    })
  )

  const csvLines = [headers.join(','), ...dataRows.map((row) => row.join(','))]
  // 使用 BOM 確保 Excel 正確識別 UTF-8
  return '\ufeff' + csvLines.join('\r\n')
}

/**
 * 儲存檔案
 */
function saveFile(
  content: Buffer | string,
  filename: string,
  isBinary: boolean
): void {
  const filePath = path.join(OUTPUT_DIR, filename)

  if (isBinary) {
    fs.writeFileSync(filePath, content as Buffer)
  } else {
    fs.writeFileSync(filePath, content as string, 'utf-8')
  }

  const size = Buffer.byteLength(content)
  console.log(`  ✅ ${filename} (${(size / 1024).toFixed(2)} KB)`)
}

// === 範例資料 ===

const customerExamples: Record<string, string | number | boolean>[] = [
  {
    name_zh: '台北科技股份有限公司',
    name_en: 'Taipei Tech Co., Ltd.',
    email: 'contact@taipeitech.com',
    phone: '02-1234-5678',
    fax: '02-1234-5679',
    address_zh: '台北市信義區信義路五段7號',
    address_en: 'No. 7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City',
    tax_id: '12345678',
    contact_name: '王小明',
    contact_phone: '0912-345-678',
    contact_email: 'wang@taipeitech.com',
    notes: 'VIP 客戶',
  },
  {
    name_zh: '新竹電子有限公司',
    name_en: 'Hsinchu Electronics Ltd.',
    email: 'info@hsinchu-elec.com',
    phone: '03-5678-1234',
    fax: '',
    address_zh: '新竹市東區光復路一段101號',
    address_en: '',
    tax_id: '87654321',
    contact_name: '李大華',
    contact_phone: '0923-456-789',
    contact_email: 'lee@hsinchu-elec.com',
    notes: '',
  },
]

const productExamples: Record<string, string | number | boolean>[] = [
  {
    sku: 'PROD-001',
    name_zh: '無線藍牙耳機',
    name_en: 'Wireless Bluetooth Earbuds',
    description_zh: '高品質藍牙5.0，續航8小時',
    description_en: 'High quality Bluetooth 5.0, 8-hour battery life',
    base_price: 1990,
    base_currency: 'TWD',
    category: '3C周邊',
    cost_price: 800,
    cost_currency: 'TWD',
    unit: '個',
    is_active: '是',
  },
  {
    sku: 'PROD-002',
    name_zh: '筆記型電腦支架',
    name_en: 'Laptop Stand',
    description_zh: '鋁合金材質，可調節高度',
    description_en: 'Aluminum alloy, adjustable height',
    base_price: 890,
    base_currency: 'TWD',
    category: '辦公用品',
    cost_price: 350,
    cost_currency: 'TWD',
    unit: '個',
    is_active: '是',
  },
  {
    sku: 'SVC-001',
    name_zh: '系統維護服務',
    name_en: 'System Maintenance Service',
    description_zh: '每月定期維護，含緊急支援',
    description_en: 'Monthly maintenance with emergency support',
    base_price: 5000,
    base_currency: 'TWD',
    category: '服務',
    cost_price: '',
    cost_currency: '',
    unit: '月',
    is_active: '是',
  },
]

const supplierExamples: Record<string, string | number | boolean>[] = [
  {
    name_zh: '優質貿易有限公司',
    name_en: 'Quality Trading Co., Ltd.',
    code: 'SUP-001',
    contact_name: '陳經理',
    contact_phone: '0912-345-678',
    contact_email: 'chen@quality-trading.com',
    phone: '02-8765-4321',
    email: 'info@quality-trading.com',
    fax: '02-8765-4322',
    address_zh: '新北市板橋區中山路一段100號',
    address_en: 'No. 100, Sec. 1, Zhongshan Rd., Banqiao Dist., New Taipei City',
    website: 'https://www.quality-trading.com',
    tax_id: '87654321',
    payment_terms: '月結30天',
    payment_days: 30,
    bank_name: '台灣銀行',
    bank_account: '012-34567890',
    is_active: '是',
    notes: '優質供應商',
  },
  {
    name_zh: '全球進口商行',
    name_en: 'Global Import Trading',
    code: 'SUP-002',
    contact_name: '林業務',
    contact_phone: '0923-456-789',
    contact_email: 'lin@global-import.com',
    phone: '04-2345-6789',
    email: 'contact@global-import.com',
    fax: '',
    address_zh: '台中市西屯區台灣大道四段500號',
    address_en: '',
    website: '',
    tax_id: '11223344',
    payment_terms: 'T/T',
    payment_days: 60,
    bank_name: '中國信託',
    bank_account: '123-45678901',
    is_active: '是',
    notes: '',
  },
]

// === 主程式 ===

function main(): void {
  console.log('🚀 開始產生批量匯入範本...\n')

  // 確保目錄存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    console.log(`📁 已建立目錄：${OUTPUT_DIR}\n`)
  }

  // 客戶範本
  console.log('📋 客戶匯入範本：')
  const customerXlsx = generateExcelTemplate(
    CUSTOMER_COLUMNS,
    '客戶',
    'Customer',
    customerExamples
  )
  saveFile(customerXlsx, 'customer-import-template.xlsx', true)

  const customerCsv = generateCsvTemplate(CUSTOMER_COLUMNS, customerExamples)
  saveFile(customerCsv, 'customer-import-template.csv', false)

  // 產品範本
  console.log('\n📋 產品匯入範本：')
  const productXlsx = generateExcelTemplate(
    PRODUCT_COLUMNS,
    '產品',
    'Product',
    productExamples
  )
  saveFile(productXlsx, 'product-import-template.xlsx', true)

  const productCsv = generateCsvTemplate(PRODUCT_COLUMNS, productExamples)
  saveFile(productCsv, 'product-import-template.csv', false)

  // 供應商範本
  console.log('\n📋 供應商匯入範本：')
  const supplierXlsx = generateExcelTemplate(
    SUPPLIER_COLUMNS,
    '供應商',
    'Supplier',
    supplierExamples
  )
  saveFile(supplierXlsx, 'supplier-import-template.xlsx', true)

  const supplierCsv = generateCsvTemplate(SUPPLIER_COLUMNS, supplierExamples)
  saveFile(supplierCsv, 'supplier-import-template.csv', false)

  console.log('\n✅ 所有範本已產生完成！')
  console.log(`📍 輸出目錄：${OUTPUT_DIR}`)
}

main()
