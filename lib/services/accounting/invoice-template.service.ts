/**
 * 發票範本服務 - 型別定義與驗證函數
 *
 * 注意：Excel 範本檔案現在是靜態產生的
 * 使用 scripts/generate-invoice-template.ts 產生
 * 存放於 /public/templates/invoice-template.xlsx
 */

export interface InvoiceTemplateColumn {
  key: string
  header: string
  width: number
  required: boolean
  description: string
  example: string
  validation?: {
    type: 'list' | 'date' | 'number' | 'text'
    values?: string[]
    min?: number
    max?: number
  }
}

// 發票範本欄位定義
export const INVOICE_TEMPLATE_COLUMNS: InvoiceTemplateColumn[] = [
  {
    key: 'number',
    header: '發票號碼',
    width: 15,
    required: true,
    description: '發票號碼（格式：XX-00000000）',
    example: 'AB-12345678',
    validation: { type: 'text' },
  },
  {
    key: 'type',
    header: '類型',
    width: 12,
    required: true,
    description: '發票類型：OUTPUT（銷項）或 INPUT（進項）',
    example: 'OUTPUT',
    validation: { type: 'list', values: ['OUTPUT', 'INPUT'] },
  },
  {
    key: 'date',
    header: '日期',
    width: 12,
    required: true,
    description: '發票日期（格式：YYYY-MM-DD）',
    example: '2024-01-15',
    validation: { type: 'date' },
  },
  {
    key: 'untaxed_amount',
    header: '未稅金額',
    width: 15,
    required: true,
    description: '未稅金額（正整數）',
    example: '10000',
    validation: { type: 'number', min: 0 },
  },
  {
    key: 'tax_amount',
    header: '稅額',
    width: 12,
    required: true,
    description: '稅額（5% 為預設）',
    example: '500',
    validation: { type: 'number', min: 0 },
  },
  {
    key: 'total_amount',
    header: '含稅金額',
    width: 15,
    required: true,
    description: '含稅總金額',
    example: '10500',
    validation: { type: 'number', min: 0 },
  },
  {
    key: 'counterparty_name',
    header: '交易對象',
    width: 20,
    required: false,
    description: '客戶或供應商名稱',
    example: '範例公司',
    validation: { type: 'text' },
  },
  {
    key: 'counterparty_tax_id',
    header: '統一編號',
    width: 12,
    required: false,
    description: '8 位數統一編號',
    example: '12345678',
    validation: { type: 'text' },
  },
  {
    key: 'description',
    header: '摘要',
    width: 30,
    required: false,
    description: '發票說明或備註',
    example: '商品銷售',
    validation: { type: 'text' },
  },
  {
    key: 'due_date',
    header: '到期日',
    width: 12,
    required: false,
    description: '付款到期日（格式：YYYY-MM-DD）',
    example: '2024-02-15',
    validation: { type: 'date' },
  },
]

/**
 * 驗證匯入的發票資料行
 */
export interface InvoiceValidationError {
  row: number
  column: string
  message: string
}

export interface ParsedInvoiceRow {
  number: string
  type: 'OUTPUT' | 'INPUT'
  date: string
  untaxed_amount: number
  tax_amount: number
  total_amount: number
  counterparty_name?: string
  counterparty_tax_id?: string
  description?: string
  due_date?: string
}

export function validateInvoiceRow(
  row: Record<string, unknown>,
  rowNumber: number
): { data: ParsedInvoiceRow | null; errors: InvoiceValidationError[] } {
  const errors: InvoiceValidationError[] = []

  // 驗證發票號碼
  const number = String(row.number || row['發票號碼'] || row['發票號碼 *'] || '').trim()
  if (!number) {
    errors.push({ row: rowNumber, column: '發票號碼', message: '發票號碼為必填欄位' })
  }

  // 驗證類型
  const rawType = String(row.type || row['類型'] || row['類型 *'] || '').trim().toUpperCase()
  if (!rawType) {
    errors.push({ row: rowNumber, column: '類型', message: '類型為必填欄位' })
  } else if (rawType !== 'OUTPUT' && rawType !== 'INPUT') {
    errors.push({
      row: rowNumber,
      column: '類型',
      message: '類型必須為 OUTPUT 或 INPUT',
    })
  }
  const type = rawType as 'OUTPUT' | 'INPUT'

  // 驗證日期
  const rawDate = row.date || row['日期'] || row['日期 *']
  let date = ''
  if (!rawDate) {
    errors.push({ row: rowNumber, column: '日期', message: '日期為必填欄位' })
  } else {
    // 處理 Excel 日期格式
    if (rawDate instanceof Date) {
      date = rawDate.toISOString().split('T')[0]
    } else {
      date = String(rawDate).trim()
      // 驗證日期格式
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push({
          row: rowNumber,
          column: '日期',
          message: '日期格式必須為 YYYY-MM-DD',
        })
      }
    }
  }

  // 驗證金額
  const untaxedAmount = parseFloat(
    String(row.untaxed_amount || row['未稅金額'] || row['未稅金額 *'] || '0')
  )
  if (isNaN(untaxedAmount) || untaxedAmount < 0) {
    errors.push({ row: rowNumber, column: '未稅金額', message: '未稅金額必須為正數' })
  }

  const taxAmount = parseFloat(String(row.tax_amount || row['稅額'] || row['稅額 *'] || '0'))
  if (isNaN(taxAmount) || taxAmount < 0) {
    errors.push({ row: rowNumber, column: '稅額', message: '稅額必須為非負數' })
  }

  const totalAmount = parseFloat(
    String(row.total_amount || row['含稅金額'] || row['含稅金額 *'] || '0')
  )
  if (isNaN(totalAmount) || totalAmount < 0) {
    errors.push({ row: rowNumber, column: '含稅金額', message: '含稅金額必須為正數' })
  }

  // 驗證金額計算
  if (errors.length === 0 && Math.abs(untaxedAmount + taxAmount - totalAmount) > 1) {
    errors.push({
      row: rowNumber,
      column: '含稅金額',
      message: `金額計算有誤：未稅(${untaxedAmount}) + 稅額(${taxAmount}) ≠ 含稅(${totalAmount})`,
    })
  }

  // 選填欄位
  const counterpartyName = String(row.counterparty_name || row['交易對象'] || '').trim() || undefined
  const counterpartyTaxId = String(row.counterparty_tax_id || row['統一編號'] || '').trim() || undefined
  const description = String(row.description || row['摘要'] || '').trim() || undefined

  // 到期日（選填）
  const rawDueDate = row.due_date || row['到期日']
  let dueDate: string | undefined = undefined
  if (rawDueDate) {
    if (rawDueDate instanceof Date) {
      dueDate = rawDueDate.toISOString().split('T')[0]
    } else {
      const dueDateStr = String(rawDueDate).trim()
      if (dueDateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)) {
        errors.push({
          row: rowNumber,
          column: '到期日',
          message: '到期日格式必須為 YYYY-MM-DD',
        })
      } else if (dueDateStr) {
        dueDate = dueDateStr
      }
    }
  }

  if (errors.length > 0) {
    return { data: null, errors }
  }

  return {
    data: {
      number,
      type,
      date,
      untaxed_amount: untaxedAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      counterparty_name: counterpartyName,
      counterparty_tax_id: counterpartyTaxId,
      description,
      due_date: dueDate,
    },
    errors: [],
  }
}
