'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useCompany } from '@/hooks/useCompany'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { parseExcelFile, formatDateString } from '@/lib/utils/excel-parser'
import {
  parseMofExcel,
  detectImportMode,
  type ImportMode,
  type ParsedMofInvoice,
} from '@/lib/services/accounting/mof-excel-parser'

interface ValidationError {
  row: number
  column: string
  message: string
}

interface ParsedInvoiceRow {
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

interface PreviewData extends ParsedInvoiceRow {
  _rowNumber: number
}

type UploadStep = 'select' | 'preview' | 'importing' | 'complete'

/** 使用者選擇的匯入模式 */
type UserImportMode = 'auto' | 'standard' | 'mof_purchase' | 'mof_sales'

/**
 * 驗證發票資料行（客戶端驗證）
 */
function validateInvoiceRow(
  row: Record<string, unknown>,
  rowNumber: number
): { data: ParsedInvoiceRow | null; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  // 驗證發票號碼
  const number = String(row['發票號碼'] || row['發票號碼 *'] || row.number || '').trim()
  if (!number) {
    errors.push({ row: rowNumber, column: '發票號碼', message: '發票號碼為必填欄位' })
  } else if (number.length > 15) {
    errors.push({ row: rowNumber, column: '發票號碼', message: `發票號碼「${number}」超過 15 字元上限` })
  }

  // 驗證類型
  const rawType = String(row['類型'] || row['類型 *'] || row.type || '').trim().toUpperCase()
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
  const rawDate = row['日期'] || row['日期 *'] || row.date
  const date = formatDateString(rawDate)
  if (!date) {
    errors.push({ row: rowNumber, column: '日期', message: '日期為必填欄位' })
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push({
      row: rowNumber,
      column: '日期',
      message: '日期格式必須為 YYYY-MM-DD',
    })
  }

  // 驗證金額
  const untaxedAmount = parseFloat(
    String(row['未稅金額'] || row['未稅金額 *'] || row.untaxed_amount || '0')
  )
  if (isNaN(untaxedAmount) || untaxedAmount < 0) {
    errors.push({ row: rowNumber, column: '未稅金額', message: '未稅金額必須為正數' })
  }

  const taxAmount = parseFloat(String(row['稅額'] || row['稅額 *'] || row.tax_amount || '0'))
  if (isNaN(taxAmount) || taxAmount < 0) {
    errors.push({ row: rowNumber, column: '稅額', message: '稅額必須為非負數' })
  }

  const totalAmount = parseFloat(
    String(row['含稅金額'] || row['含稅金額 *'] || row.total_amount || '0')
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
  const counterpartyName = String(row['交易對象'] || row.counterparty_name || '').trim() || undefined
  const counterpartyTaxId =
    String(row['統一編號'] || row.counterparty_tax_id || '').trim() || undefined
  const description = String(row['摘要'] || row.description || '').trim() || undefined

  // 到期日（選填）
  const rawDueDate = row['到期日'] || row.due_date
  let dueDate: string | undefined = undefined
  if (rawDueDate) {
    const dueDateStr = formatDateString(rawDueDate)
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

/**
 * 檢查重複的發票號碼
 */
function checkDuplicateNumbers(data: ParsedInvoiceRow[]): ValidationError[] {
  const errors: ValidationError[] = []
  const seen = new Map<string, number>()

  data.forEach((row, index) => {
    const rowNumber = index + 2
    if (seen.has(row.number)) {
      errors.push({
        row: rowNumber,
        column: '發票號碼',
        message: `發票號碼 ${row.number} 與第 ${seen.get(row.number)} 行重複`,
      })
    } else {
      seen.set(row.number, rowNumber)
    }
  })

  return errors
}

interface InvoiceUploadProps {
  onSuccess?: () => void
}

/**
 * 發票 Excel 上傳元件
 * 使用客戶端 Excel 解析，減少伺服器端 bundle 大小
 */
export default function InvoiceUpload({ onSuccess }: InvoiceUploadProps) {
  const { company } = useCompany()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<UploadStep>('select')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData[]>([])
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [importResult, setImportResult] = useState<{
    importedCount: number
    skippedCount: number
  } | null>(null)
  const [importMode, setImportMode] = useState<UserImportMode>('auto')
  const [detectedMode, setDetectedMode] = useState<ImportMode | null>(null)

  // 下載範本
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/accounting/invoices/template')
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-import-template-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('範本已下載')
    } catch (error) {
      console.error('Download template error:', error)
      toast.error('範本下載失敗')
    }
  }

  /**
   * 將 MOF 解析結果轉換為標準格式
   */
  const convertMofToStandardFormat = (
    mofData: ParsedMofInvoice[]
  ): ParsedInvoiceRow[] => {
    return mofData.map((invoice) => ({
      number: invoice.number,
      type: invoice.type,
      date: invoice.date,
      untaxed_amount: invoice.untaxed_amount,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      counterparty_name: invoice.counterparty_name,
      counterparty_tax_id: invoice.counterparty_tax_id,
    }))
  }

  // 處理檔案選擇（客戶端解析）
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!company?.id) {
        toast.error('請先選擇公司')
        return
      }

      // 驗證檔案類型
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('請上傳 Excel 檔案 (.xlsx, .xls)')
        return
      }

      setSelectedFile(file)
      setIsUploading(true)
      setErrors([])
      setDetectedMode(null)

      try {
        // 客戶端解析 Excel
        const parseResult = await parseExcelFile(file)

        // 決定使用哪種解析器
        let effectiveMode: ImportMode | 'standard' = 'standard'

        if (importMode === 'auto') {
          // 自動偵測模式
          const detected = detectImportMode(parseResult.headers)
          setDetectedMode(detected)
          effectiveMode = detected
        } else if (importMode === 'mof_purchase' || importMode === 'mof_sales') {
          effectiveMode = importMode
          setDetectedMode(importMode)
        }

        let validData: ParsedInvoiceRow[] = []
        let allErrors: ValidationError[] = []

        if (effectiveMode === 'mof_purchase' || effectiveMode === 'mof_sales') {
          // 使用 MOF 解析器
          const mofResult = parseMofExcel(
            parseResult.data as Record<string, unknown>[],
            parseResult.headers,
            effectiveMode
          )

          if (mofResult.mode === 'standard') {
            // 無法識別，回退到標準模式或顯示錯誤
            toast.error('無法識別檔案格式')
            setIsUploading(false)
            return
          }

          validData = convertMofToStandardFormat(mofResult.data)
          allErrors = mofResult.errors

          // 顯示偵測結果
          if (importMode === 'auto') {
            const modeLabel =
              mofResult.mode === 'mof_purchase'
                ? '財政部進項發票'
                : '財政部銷項發票'
            toast.success(`已偵測為：${modeLabel}`)
          }
        } else {
          // 使用標準解析器
          parseResult.data.forEach((row, index) => {
            const rowNumber = index + 2 // Excel 從第 2 行開始是資料
            const { data, errors: rowErrors } = validateInvoiceRow(row, rowNumber)

            if (data) {
              validData.push(data)
            }
            allErrors.push(...rowErrors)
          })

          // 檢查重複發票號碼
          const duplicateErrors = checkDuplicateNumbers(validData)
          allErrors.push(...duplicateErrors)
        }

        // 加入行號供顯示
        const dataWithRowNumbers = validData.map((row, index) => ({
          ...row,
          _rowNumber: index + 2,
        }))

        setPreviewData(dataWithRowNumbers)
        setErrors(allErrors)
        setStep('preview')
      } catch (error) {
        console.error('Parse error:', error)
        toast.error('解析檔案失敗')
      } finally {
        setIsUploading(false)
      }
    },
    [company?.id, importMode]
  )

  // 拖曳事件處理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  // 確認匯入（發送 JSON 到 API）
  const handleConfirmImport = async () => {
    if (!company?.id || previewData.length === 0) return

    setStep('importing')

    try {
      // 移除 _rowNumber，只保留資料欄位
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const dataToImport = previewData.map(({ _rowNumber, ...rest }) => rest)

      const response = await fetch('/api/accounting/invoices/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          data: dataToImport,
        }),
      })

      const result = (await response.json()) as {
        errors?: ValidationError[]
        importedCount: number
        skippedCount: number
      }

      // 檢查 HTTP 狀態碼
      if (!response.ok) {
        if (result.errors && result.errors.length > 0) {
          setErrors(result.errors)
        }
        toast.error('匯入失敗')
        setStep('preview')
        return
      }

      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors)
      }

      setImportResult({
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
      })

      setStep('complete')

      if (result.importedCount > 0) {
        toast.success(`成功匯入 ${result.importedCount} 筆`)
        onSuccess?.()
      } else if (result.skippedCount > 0) {
        // 當全部跳過時顯示警告訊息
        toast.warning('所有記錄都被跳過')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('匯入失敗')
      setStep('preview')
    }
  }

  // 重置
  const handleReset = () => {
    setStep('select')
    setSelectedFile(null)
    setPreviewData([])
    setErrors([])
    setImportResult(null)
    setDetectedMode(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 渲染上傳區域
  const renderUploadArea = () => (
    <div className="space-y-6">
      {/* 匯入模式選擇 */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">
          匯入模式
        </Label>
        <RadioGroup
          value={importMode}
          onValueChange={(value) => setImportMode(value as UserImportMode)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
            <RadioGroupItem value="auto" id="mode-auto" className="mt-0.5" />
            <Label htmlFor="mode-auto" className="flex-1 cursor-pointer">
              <span className="font-medium text-slate-700">
                自動偵測
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                根據欄位自動判斷格式
              </p>
            </Label>
          </div>
          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
            <RadioGroupItem value="standard" id="mode-standard" className="mt-0.5" />
            <Label htmlFor="mode-standard" className="flex-1 cursor-pointer">
              <span className="font-medium text-slate-700">
                標準格式
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                使用系統提供的範本格式
              </p>
            </Label>
          </div>
          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
            <RadioGroupItem value="mof_purchase" id="mode-mof-purchase" className="mt-0.5" />
            <Label htmlFor="mode-mof-purchase" className="flex-1 cursor-pointer">
              <span className="font-medium text-slate-700">
                財政部進項
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                財政部電子發票進項格式
              </p>
            </Label>
          </div>
          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
            <RadioGroupItem value="mof_sales" id="mode-mof-sales" className="mt-0.5" />
            <Label htmlFor="mode-mof-sales" className="flex-1 cursor-pointer">
              <span className="font-medium text-slate-700">
                財政部銷項
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                財政部電子發票銷項格式
              </p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* 下載範本按鈕 - 只在標準模式顯示 */}
      {importMode === 'standard' && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            下載範本
          </Button>
        </div>
      )}

      {/* 拖曳上傳區域 */}
      <div
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center transition-all
          ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 hover:border-slate-300'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center gap-4">
          {isUploading ? (
            <>
              <svg
                className="w-12 h-12 text-emerald-500 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-slate-600">解析中...</p>
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div>
                <p className="text-slate-700 font-medium">
                  拖曳檔案至此處
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  或點擊選擇檔案
                </p>
              </div>
              <p className="text-slate-400 text-xs">
                支援 .xlsx, .xls 格式
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // 取得模式標籤
  const getModeLabel = (mode: ImportMode | null): string => {
    switch (mode) {
      case 'mof_purchase':
        return '財政部進項'
      case 'mof_sales':
        return '財政部銷項'
      default:
        return '標準格式'
    }
  }

  // 渲染預覽表格
  const renderPreviewTable = () => (
    <div className="space-y-4">
      {/* 檔案資訊 */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div>
            <p className="font-medium text-slate-700">{selectedFile?.name}</p>
            {detectedMode && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mr-2">
                {getModeLabel(detectedMode)}
              </span>
            )}
            <p className="text-sm text-slate-500">
              共 {previewData.length} 筆資料
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          選擇其他檔案
        </Button>
      </div>

      {/* 錯誤訊息 */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="font-medium text-red-700 mb-2">
            發現 {errors.length} 個錯誤
          </h4>
          <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-auto">
            {errors.slice(0, 10).map((error, index) => (
              <li key={index}>
                第 {error.row} 行: {error.message}
              </li>
            ))}
            {errors.length > 10 && (
              <li className="text-red-500">
                還有 {errors.length - 10} 個錯誤...
              </li>
            )}
          </ul>
        </div>
      )}

      {/* 預覽表格 */}
      {previewData.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-64">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    發票號碼
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    類型
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    日期
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    含稅金額
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    交易對象
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {previewData.slice(0, 10).map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-500">{row._rowNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {row.number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.type === 'OUTPUT'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {row.type === 'OUTPUT' ? '銷項' : '進項'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.date}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-700">
                      {row.total_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.counterparty_name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.length > 10 && (
            <div className="bg-slate-50 px-4 py-2 text-center text-sm text-slate-500">
              顯示前 10 筆，共 {previewData.length} 筆
            </div>
          )}
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={handleReset}>
          取消
        </Button>
        <Button
          onClick={handleConfirmImport}
          disabled={previewData.length === 0 || errors.length > 0}
        >
          確認匯入 ({previewData.length} 筆)
        </Button>
      </div>
    </div>
  )

  // 渲染匯入中
  const renderImporting = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <svg
        className="w-16 h-16 text-emerald-500 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p className="mt-4 text-lg font-medium text-slate-700">
        匯入中...
      </p>
      <p className="text-slate-500">請稍候</p>
    </div>
  )

  // 渲染完成結果
  const renderComplete = () => (
    <div className="space-y-6">
      {/* 結果摘要 */}
      <div
        className={`rounded-xl p-6 text-center ${
          importResult?.importedCount && importResult.importedCount > 0
            ? 'bg-emerald-50'
            : 'bg-amber-50'
        }`}
      >
        {importResult?.importedCount && importResult.importedCount > 0 ? (
          <>
            <svg
              className="w-16 h-16 mx-auto text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-emerald-700">
              匯入完成
            </h3>
          </>
        ) : (
          <>
            <svg
              className="w-16 h-16 mx-auto text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-amber-700">
              無記錄被匯入
            </h3>
          </>
        )}

        <div className="mt-4 flex justify-center gap-8">
          <div>
            <p className="text-2xl font-bold text-emerald-600">
              {importResult?.importedCount || 0}
            </p>
            <p className="text-sm text-slate-500">已匯入</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">
              {importResult?.skippedCount || 0}
            </p>
            <p className="text-sm text-slate-500">已跳過</p>
          </div>
        </div>
      </div>

      {/* 錯誤詳情 */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="font-medium text-red-700 mb-2">
            跳過詳情
          </h4>
          <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-auto">
            {errors.map((error, index) => (
              <li key={index}>
                {error.row > 0 ? `第 ${error.row} 行: ` : ''}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex justify-center gap-3 pt-4 border-t">
        <Button variant="outline" onClick={handleReset}>
          上傳其他檔案
        </Button>
      </div>
    </div>
  )

  return (
    <Card>
      <CardContent className="pt-6">
        {step === 'select' && renderUploadArea()}
        {step === 'preview' && renderPreviewTable()}
        {step === 'importing' && renderImporting()}
        {step === 'complete' && renderComplete()}
      </CardContent>
    </Card>
  )
}
