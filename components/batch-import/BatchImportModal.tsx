'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useCompany } from '@/hooks/useCompany'
import { buildCsrfHeaders } from '@/lib/security/csrf'
import { parseExcelFile } from '@/lib/utils/excel-parser'
import { parseCsvFile } from '@/lib/utils/csv-parser'
import type {
  ImportResourceType,
  ImportStep,
  DuplicateHandling,
  ImportResult,
  ValidationError,
  ParsedRow,
  ColumnMapping,
} from '@/lib/services/batch-import/types'
import { getColumnsForResource } from '@/lib/services/batch-import/template-columns'
import { validateCustomerRows } from '@/lib/services/batch-import/validators/customer-validator'
import { validateProductRows } from '@/lib/services/batch-import/validators/product-validator'
import { validateSupplierRows } from '@/lib/services/batch-import/validators/supplier-validator'
import { downloadTemplate } from '@/hooks/useBatchImport'
import { autoMatchColumns, applyColumnMapping } from '@/lib/services/batch-import/column-matcher'
import ColumnMappingStep from './ColumnMappingStep'

interface BatchImportModalProps {
  isOpen: boolean
  onClose: () => void
  resourceType: ImportResourceType
  onSuccess?: () => void
}

/** 資源類型標籤 */
const RESOURCE_LABELS: Record<ImportResourceType, { zh: string; en: string }> = {
  customers: { zh: '客戶', en: 'Customer' },
  products: { zh: '產品', en: 'Product' },
  suppliers: { zh: '供應商', en: 'Supplier' },
}

/** 最大行數限制 */
const MAX_ROWS = 500
/** 最大檔案大小（5MB） */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/** 資源驗證器映射 */
const VALIDATORS: Record<
  ImportResourceType,
  (data: Record<string, unknown>[]) => {
    validRows: ParsedRow[]
    invalidRows: ParsedRow[]
    errors: ValidationError[]
  }
> = {
  customers: validateCustomerRows,
  products: validateProductRows,
  suppliers: validateSupplierRows,
}

export default function BatchImportModal({
  isOpen,
  onClose,
  resourceType,
  onSuccess,
}: BatchImportModalProps) {
  const { company } = useCompany()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ImportStep>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [validRows, setValidRows] = useState<ParsedRow[]>([])
  const [invalidRows, setInvalidRows] = useState<ParsedRow[]>([])
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>('skip')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const resourceLabel = RESOURCE_LABELS[resourceType].zh

  /** 重置狀態 */
  const resetState = useCallback(() => {
    setStep('upload')
    setRawData([])
    setColumnMappings([])
    setParsedData([])
    setValidRows([])
    setInvalidRows([])
    setErrors([])
    setDuplicateHandling('skip')
    setIsImporting(false)
    setImportResult(null)
  }, [])

  /** 關閉 Modal */
  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  /** 驗證資料 */
  const validateData = useCallback(
    (data: Record<string, unknown>[]) => VALIDATORS[resourceType](data),
    [resourceType]
  )

  /** 處理檔案 */
  const handleFile = useCallback(
    async (file: File) => {
      // 檢查檔案大小
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`檔案大小超過限制（最大 5MB）`)
        return
      }

      // 檢查檔案類型
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      const isCsv = file.name.endsWith('.csv')

      if (!isExcel && !isCsv) {
        toast.error('請上傳 Excel (.xlsx) 或 CSV (.csv) 檔案')
        return
      }

      try {
        let data: Record<string, unknown>[]

        if (isExcel) {
          const result = await parseExcelFile(file)
          data = result.data
        } else {
          const result = await parseCsvFile(file)
          data = result.data
        }

        // 檢查行數限制
        if (data.length > MAX_ROWS) {
          toast.error(`資料筆數超過限制（最大 ${MAX_ROWS} 筆）`)
          return
        }

        if (data.length === 0) {
          toast.error('檔案中沒有資料')
          return
        }

        // 取得原始欄位名稱，進入 mapping 步驟
        const headers = Object.keys(data[0])
        const mappings = autoMatchColumns(headers, resourceType)

        setRawData(data)
        setColumnMappings(mappings)
        setStep('mapping')

        toast.success(`成功解析 ${data.length} 筆資料，請確認欄位對應`)
      } catch (error) {
        console.error('Parse error:', error)
        toast.error(`解析檔案失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
      }
    },
    [resourceType]
  )

  /** 拖曳事件處理 */
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

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  /** 檔案選擇事件 */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  /** 下載範本 */
  const handleDownloadTemplate = useCallback(
    (format: 'xlsx' | 'csv') => downloadTemplate(resourceType, format),
    [resourceType]
  )

  /** Mapping 確認後，轉換資料並進入預覽 */
  const handleMappingConfirm = useCallback(() => {
    // 用 mapping 將原始資料轉成系統格式
    const mappedData = applyColumnMapping(rawData, columnMappings)

    // 驗證轉換後的資料
    const { validRows, invalidRows, errors } = validateData(mappedData)

    setParsedData(mappedData.map((row, index) => ({ _rowNumber: index + 1, ...row })))
    setValidRows(validRows)
    setInvalidRows(invalidRows)
    setErrors(errors)
    setStep('preview')

    if (errors.length > 0) {
      toast.warning(`發現 ${errors.length} 個驗證錯誤，請檢查預覽`)
    } else {
      toast.success(`欄位對應完成，共 ${mappedData.length} 筆資料`)
    }
  }, [rawData, columnMappings, validateData])

  /** 執行匯入 */
  const handleImport = useCallback(async () => {
    if (!company?.id) {
      toast.error('請先選擇公司')
      return
    }

    setIsImporting(true)
    setStep('importing')

    try {
      const response = await fetch(`/api/batch-import/${resourceType}/import`, {
        method: 'POST',
        headers: buildCsrfHeaders(),
        body: JSON.stringify({
          data: parsedData,
          company_id: company.id,
          duplicateHandling,
        }),
      })

      const result = await response.json()

      if (result.success && result.result) {
        setImportResult(result.result)
        setStep('complete')

        if (result.result.importedCount > 0 || result.result.updatedCount > 0) {
          toast.success(
            `匯入完成！新增 ${result.result.importedCount} 筆，更新 ${result.result.updatedCount} 筆`
          )
          onSuccess?.()
        } else if (result.result.skippedCount > 0) {
          toast.info(`全部 ${result.result.skippedCount} 筆資料已跳過（重複）`)
        } else {
          toast.warning('沒有匯入任何資料')
        }
      } else {
        toast.error(result.error || '匯入失敗')
        setStep('preview')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('匯入失敗，請稍後再試')
      setStep('preview')
    } finally {
      setIsImporting(false)
    }
  }, [company?.id, resourceType, parsedData, duplicateHandling, onSuccess])

  /** 檢查 mapping 步驟是否可以進入下一步 */
  const canProceedMapping = useMemo(() => {
    if (step !== 'mapping') return false
    const columns = getColumnsForResource(resourceType)
    const requiredKeys = columns.filter((c) => c.required).map((c) => c.key)
    const mappedKeys = new Set(columnMappings.filter((m) => m.targetKey).map((m) => m.targetKey))
    return requiredKeys.every((key) => mappedKeys.has(key))
  }, [step, resourceType, columnMappings])

  if (!isOpen) return null

  const columns = getColumnsForResource(resourceType)

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              批量匯入{resourceLabel}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 內容區 */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: 上傳 */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* 範本下載 */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-medium text-blue-900 mb-2">下載範本</h3>
                <p className="text-sm text-blue-700 mb-3">
                  請先下載範本檔案，按照欄位格式填入資料後再上傳
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Excel 範本
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate('csv')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    CSV 範本
                  </button>
                </div>
              </div>

              {/* 上傳區 */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-700 mb-2">
                  拖曳檔案到這裡，或{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    點擊選擇檔案
                  </button>
                </p>
                <p className="text-sm text-gray-500">
                  支援 Excel (.xlsx) 和 CSV (.csv) 格式，最多 {MAX_ROWS} 筆資料
                </p>
              </div>

              {/* 欄位說明 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-3">欄位說明</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-700">欄位</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">必填</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">說明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.slice(0, 6).map((col) => (
                        <tr key={col.key} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-900">
                            {col.header.replace(' *', '')}
                          </td>
                          <td className="py-2 px-3">
                            {col.required ? (
                              <span className="text-red-600 font-medium">是</span>
                            ) : (
                              <span className="text-gray-400">否</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-600">{col.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {columns.length > 6 && (
                    <p className="text-sm text-gray-500 mt-2 px-3">
                      還有 {columns.length - 6} 個欄位，詳見範本檔案中的「說明」工作表
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 欄位對應 */}
          {step === 'mapping' && (
            <ColumnMappingStep
              rawData={rawData}
              mappings={columnMappings}
              resourceType={resourceType}
              onMappingsChange={setColumnMappings}
            />
          )}

          {/* Step 3: 預覽 */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* 統計摘要 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{validRows.length}</div>
                  <div className="text-sm text-emerald-700">有效資料</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{invalidRows.length}</div>
                  <div className="text-sm text-red-700">驗證錯誤</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">{parsedData.length}</div>
                  <div className="text-sm text-gray-700">總筆數</div>
                </div>
              </div>

              {/* 錯誤列表 */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    驗證錯誤（{errors.length} 個）
                  </h3>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="text-sm text-red-700 space-y-1">
                      {errors.slice(0, 10).map((error, index) => (
                        <li key={index}>
                          第 {error.row} 行，{error.column}：{error.message}
                        </li>
                      ))}
                      {errors.length > 10 && (
                        <li className="text-red-600">還有 {errors.length - 10} 個錯誤...</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* 重複處理選項 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-medium text-amber-900 mb-3">重複資料處理方式</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="skip"
                      checked={duplicateHandling === 'skip'}
                      onChange={() => setDuplicateHandling('skip')}
                      className="text-emerald-600"
                    />
                    <span className="text-sm text-gray-700">跳過重複資料</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="update"
                      checked={duplicateHandling === 'update'}
                      onChange={() => setDuplicateHandling('update')}
                      className="text-emerald-600"
                    />
                    <span className="text-sm text-gray-700">更新現有資料</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="error"
                      checked={duplicateHandling === 'error'}
                      onChange={() => setDuplicateHandling('error')}
                      className="text-emerald-600"
                    />
                    <span className="text-sm text-gray-700">視為錯誤</span>
                  </label>
                </div>
              </div>

              {/* 預覽表格 */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 border-b">
                          #
                        </th>
                        {columns.slice(0, 5).map((col) => (
                          <th
                            key={col.key}
                            className="text-left py-2 px-3 font-medium text-gray-700 border-b"
                          >
                            {col.header.replace(' *', '')}
                          </th>
                        ))}
                        <th className="text-left py-2 px-3 font-medium text-gray-700 border-b">
                          狀態
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 10).map((row, index) => {
                        const hasError = invalidRows.some((r) => r._rowNumber === row._rowNumber)
                        return (
                          <tr
                            key={index}
                            className={hasError ? 'bg-red-50' : 'hover:bg-gray-50'}
                          >
                            <td className="py-2 px-3 border-b border-gray-100">{row._rowNumber}</td>
                            {columns.slice(0, 5).map((col) => (
                              <td key={col.key} className="py-2 px-3 border-b border-gray-100">
                                {String(row[col.key] || '')}
                              </td>
                            ))}
                            <td className="py-2 px-3 border-b border-gray-100">
                              {hasError ? (
                                <span className="text-red-600">錯誤</span>
                              ) : (
                                <span className="text-emerald-600">有效</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 10 && (
                  <div className="p-3 bg-gray-50 text-sm text-gray-600 text-center">
                    僅顯示前 10 筆，共 {parsedData.length} 筆資料
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: 匯入中 */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-6"></div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">正在匯入...</h3>
              <p className="text-gray-600">請稍候，正在處理 {parsedData.length} 筆資料</p>
            </div>
          )}

          {/* Step 4: 完成 */}
          {step === 'complete' && importResult && (
            <div className="text-center py-8 space-y-6">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900">匯入完成！</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600">
                    {importResult.importedCount}
                  </div>
                  <div className="text-sm text-emerald-700">新增成功</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {importResult.updatedCount}
                  </div>
                  <div className="text-sm text-blue-700">更新成功</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-600">
                    {importResult.skippedCount}
                  </div>
                  <div className="text-sm text-gray-700">已跳過</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.errorCount}
                  </div>
                  <div className="text-sm text-red-700">失敗</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left max-w-2xl mx-auto">
                  <h4 className="font-medium text-red-900 mb-2">錯誤詳情</h4>
                  <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>
                        第 {error.row} 行：{error.message}
                      </li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>還有 {importResult.errors.length - 5} 個錯誤...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={step === 'complete' ? handleClose : resetState}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {step === 'complete' ? '關閉' : step === 'upload' ? '取消' : '重新上傳'}
          </button>

          {step === 'mapping' && (
            <button
              onClick={handleMappingConfirm}
              disabled={!canProceedMapping}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              下一步 →
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={handleImport}
              disabled={validRows.length === 0 || isImporting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="h-4 w-4" />
              匯入 {validRows.length} 筆資料
            </button>
          )}

          {step === 'complete' && (
            <button
              onClick={resetState}
              className="px-4 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              繼續匯入
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
