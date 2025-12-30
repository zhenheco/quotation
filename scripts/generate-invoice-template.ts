/**
 * 一次性腳本：產生發票匯入範本 Excel 檔案
 *
 * 用法：pnpm tsx scripts/generate-invoice-template.ts
 *
 * 此腳本會產生靜態範本檔案到 public/templates/invoice-template.xlsx
 * 範本檔案會被直接從 public 目錄提供，不需要在 runtime 產生
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

interface InvoiceTemplateColumn {
  key: string
  header: string
  width: number
  required: boolean
  description: string
  example: string
}

// 發票範本欄位定義（與 invoice-template.service.ts 保持一致）
const INVOICE_TEMPLATE_COLUMNS: InvoiceTemplateColumn[] = [
  {
    key: 'number',
    header: '發票號碼',
    width: 15,
    required: true,
    description: '發票號碼（格式：XX-00000000）',
    example: 'AB-12345678',
  },
  {
    key: 'type',
    header: '類型',
    width: 12,
    required: true,
    description: '發票類型：OUTPUT（銷項）或 INPUT（進項）',
    example: 'OUTPUT',
  },
  {
    key: 'date',
    header: '日期',
    width: 12,
    required: true,
    description: '發票日期（格式：YYYY-MM-DD）',
    example: '2024-01-15',
  },
  {
    key: 'untaxed_amount',
    header: '未稅金額',
    width: 15,
    required: true,
    description: '未稅金額（正整數）',
    example: '10000',
  },
  {
    key: 'tax_amount',
    header: '稅額',
    width: 12,
    required: true,
    description: '稅額（5% 為預設）',
    example: '500',
  },
  {
    key: 'total_amount',
    header: '含稅金額',
    width: 15,
    required: true,
    description: '含稅總金額',
    example: '10500',
  },
  {
    key: 'counterparty_name',
    header: '交易對象',
    width: 20,
    required: false,
    description: '客戶或供應商名稱',
    example: '範例公司',
  },
  {
    key: 'counterparty_tax_id',
    header: '統一編號',
    width: 12,
    required: false,
    description: '8 位數統一編號',
    example: '12345678',
  },
  {
    key: 'description',
    header: '摘要',
    width: 30,
    required: false,
    description: '發票說明或備註',
    example: '商品銷售',
  },
  {
    key: 'due_date',
    header: '到期日',
    width: 12,
    required: false,
    description: '付款到期日（格式：YYYY-MM-DD）',
    example: '2024-02-15',
  },
]

function generateTemplate(): void {
  console.log('正在產生發票匯入範本...')

  // 建立工作簿
  const workbook = XLSX.utils.book_new()

  // === 資料工作表 ===
  const headers = INVOICE_TEMPLATE_COLUMNS.map((col) =>
    col.required ? `${col.header} *` : col.header
  )

  const exampleData = [
    ['AB-12345678', 'OUTPUT', '2024-01-15', 10000, 500, 10500, '範例客戶 A', '12345678', '商品銷售', '2024-02-15'],
    ['CD-87654321', 'INPUT', '2024-01-20', 5000, 250, 5250, '範例供應商 B', '87654321', '進貨', '2024-02-20'],
    ['EF-11223344', 'OUTPUT', '2024-01-25', 20000, 1000, 21000, '範例客戶 C', '11223344', '服務收入', ''],
  ]

  const dataSheetData = [headers, ...exampleData]
  const dataSheet = XLSX.utils.aoa_to_sheet(dataSheetData)
  dataSheet['!cols'] = INVOICE_TEMPLATE_COLUMNS.map((col) => ({ wch: col.width }))

  // 設定資料驗證（類型欄位下拉選單）
  const typeColIndex = INVOICE_TEMPLATE_COLUMNS.findIndex((c) => c.key === 'type')
  if (typeColIndex >= 0) {
    const typeColLetter = XLSX.utils.encode_col(typeColIndex)
    // @ts-expect-error - SheetJS 內部類型
    dataSheet['!dataValidation'] = dataSheet['!dataValidation'] || []
    // @ts-expect-error - SheetJS 內部類型
    dataSheet['!dataValidation'].push({
      sqref: `${typeColLetter}2:${typeColLetter}100`,
      type: 'list',
      formula1: '"OUTPUT,INPUT"',
      showErrorMessage: true,
      errorTitle: '無效的類型',
      error: '請選擇 OUTPUT 或 INPUT',
    })
  }

  XLSX.utils.book_append_sheet(workbook, dataSheet, '發票資料')

  // === 說明工作表 ===
  const helpHeaders = ['欄位', '必填', '說明', '範例']
  const helpData = INVOICE_TEMPLATE_COLUMNS.map((col) => [
    col.header,
    col.required ? '是' : '否',
    col.description,
    col.example,
  ])

  const notes = [
    [],
    ['注意事項：'],
    ['1. 帶有 * 符號的欄位為必填欄位'],
    ['2. 日期格式請使用 YYYY-MM-DD（例：2024-01-15）'],
    ['3. 金額請輸入正整數，不需千分位符號'],
    ['4. 發票號碼不可重複'],
    ['5. 範例資料（灰色底）請刪除後再輸入實際資料'],
  ]

  const helpSheetData = [helpHeaders, ...helpData, ...notes]
  const helpSheet = XLSX.utils.aoa_to_sheet(helpSheetData)
  helpSheet['!cols'] = [
    { wch: 15 },
    { wch: 8 },
    { wch: 40 },
    { wch: 20 },
  ]

  XLSX.utils.book_append_sheet(workbook, helpSheet, '說明')

  // 儲存檔案
  const outputDir = path.join(__dirname, '..', 'public', 'templates')
  const outputPath = path.join(outputDir, 'invoice-template.xlsx')

  // 確保目錄存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  fs.writeFileSync(outputPath, buffer)

  console.log(`✅ 範本已產生：${outputPath}`)
  console.log(`   檔案大小：${(buffer.length / 1024).toFixed(2)} KB`)
}

// 執行
generateTemplate()
