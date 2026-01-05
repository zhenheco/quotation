'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCompany } from '@/hooks/useCompany'
import { useCreateInvoice } from '@/hooks/accounting'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { InvoiceOCRData, InvoiceOCRConfidence } from '@/lib/services/accounting/invoice-ocr.service'
import type { CreateInvoiceInput, InvoiceType } from '@/lib/dal/accounting'
import type { ScanResponse } from '@/app/api/accounting/invoices/scan/route'

interface InvoiceScanProps {
  onSuccess?: () => void
}

type ScanStep = 'upload' | 'scanning' | 'review' | 'saving'

// 共用 input 樣式
const inputClassName =
  'block w-full px-4 py-3 text-sm border-2 rounded-2xl bg-white text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300'
const labelClassName = 'block text-sm font-medium text-slate-700 mb-2'

/**
 * 發票 AI 掃描元件
 * 支援圖片上傳、AI OCR 識別、結果確認/修正
 */
export default function InvoiceScan({ onSuccess }: InvoiceScanProps) {
  const router = useRouter()
  const { company } = useCompany()
  const createInvoice = useCreateInvoice()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ScanStep>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // 儲存 OCR 結果供日後擴充使用（如顯示信心度等）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 保留供日後顯示 OCR 原始結果
  const [ocrData, setOcrData] = useState<InvoiceOCRData | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 保留供日後顯示信心度指標
  const [confidence, setConfidence] = useState<InvoiceOCRConfidence | null>(null)
  const [fieldsNeedingReview, setFieldsNeedingReview] = useState<string[]>([])

  // 表單狀態
  const [formData, setFormData] = useState({
    number: '',
    type: 'OUTPUT' as InvoiceType,
    date: new Date().toISOString().split('T')[0],
    untaxedAmount: '',
    taxAmount: '',
    totalAmount: '',
    counterpartyName: '',
    counterpartyTaxId: '',
    description: '',
  })

  // 處理檔案選擇
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!company?.id) {
        toast.error('請先選擇公司')
        return
      }

      // 驗證檔案類型
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        toast.error('請上傳圖片或 PDF 檔案')
        return
      }

      // 檔案大小限制：10MB
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('檔案大小不得超過 10MB')
        return
      }

      setSelectedFile(file)

      // 建立預覽 URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // 開始掃描
      setStep('scanning')

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/accounting/invoices/scan', {
          method: 'POST',
          body: formData,
        })

        const result = (await response.json()) as ScanResponse

        if (!result.success) {
          throw new Error(result.error || 'OCR 識別失敗')
        }

        // 設定 OCR 結果
        if (result.data) setOcrData(result.data)
        if (result.confidence) setConfidence(result.confidence)
        setFieldsNeedingReview(result.fieldsNeedingReview || [])

        // 填入表單
        const data = result.data
        setFormData({
          number: data?.number || '',
          type: data?.type || 'OUTPUT',
          date: data?.date || new Date().toISOString().split('T')[0],
          untaxedAmount: data?.untaxed_amount?.toString() || '',
          taxAmount: data?.tax_amount?.toString() || '',
          totalAmount: data?.total_amount?.toString() || '',
          counterpartyName: data?.counterparty_name || '',
          counterpartyTaxId: data?.counterparty_tax_id || '',
          description: data?.description || '',
        })

        setStep('review')
        toast.success('掃描完成')
      } catch (error) {
        console.error('Scan error:', error)
        const message = error instanceof Error ? error.message : '掃描失敗'
        toast.error(message)
        setStep('upload')
      }
    },
    [company?.id]
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

  // 儲存發票
  const handleSave = async () => {
    if (!company?.id) {
      toast.error('請先選擇公司')
      return
    }

    if (!formData.number.trim()) {
      toast.error('請輸入發票號碼')
      return
    }

    setStep('saving')

    try {
      const input: CreateInvoiceInput = {
        company_id: company.id,
        number: formData.number.trim(),
        type: formData.type,
        date: formData.date,
        untaxed_amount: parseFloat(formData.untaxedAmount) || 0,
        tax_amount: parseFloat(formData.taxAmount) || 0,
        total_amount: parseFloat(formData.totalAmount) || 0,
        counterparty_name: formData.counterpartyName.trim() || undefined,
        counterparty_tax_id: formData.counterpartyTaxId.trim() || undefined,
        description: formData.description.trim() || undefined,
      }

      await createInvoice.mutateAsync(input)
      toast.success('發票建立成功')

      onSuccess?.()
      router.push('/accounting/invoices')
    } catch (error) {
      console.error('Error creating invoice:', error)
      const message = error instanceof Error ? error.message : '發票建立失敗'
      toast.error(message)
      setStep('review')
    }
  }

  // 重置
  const handleReset = () => {
    setStep('upload')
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setOcrData(null)
    setConfidence(null)
    setFieldsNeedingReview([])
    setFormData({
      number: '',
      type: 'OUTPUT',
      date: new Date().toISOString().split('T')[0],
      untaxedAmount: '',
      taxAmount: '',
      totalAmount: '',
      counterpartyName: '',
      counterpartyTaxId: '',
      description: '',
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 判斷欄位是否需要檢查
  const needsReview = (fieldName: string) => fieldsNeedingReview.includes(fieldName)

  // 取得欄位樣式
  const getFieldClassName = (fieldName: string) => {
    const baseClass = inputClassName
    if (needsReview(fieldName)) {
      return `${baseClass} border-amber-300 bg-amber-50`
    }
    return `${baseClass} border-slate-200`
  }

  // 渲染上傳區域
  const renderUploadArea = () => (
    <div className="space-y-6">
      {/* 拖曳上傳區域 */}
      <div
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center transition-all
          ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 hover:border-slate-300'
          }
          cursor-pointer
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
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
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <div>
            <p className="text-slate-700 font-medium">拖曳圖片或 PDF 至此處</p>
            <p className="text-slate-500 text-sm mt-1">或點擊選擇檔案</p>
          </div>
          <p className="text-slate-400 text-xs">支援 JPG, PNG, WebP, PDF</p>
        </div>
      </div>

      {/* 提示說明 */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h4 className="font-medium text-blue-700 mb-2">掃描提示</h4>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>確保發票影像清晰、光線充足</li>
          <li>避免發票有折痕或遮擋</li>
          <li>建議使用正面拍攝</li>
        </ul>
      </div>
    </div>
  )

  // 渲染掃描中
  const renderScanning = () => (
    <div className="flex flex-col items-center justify-center py-12">
      {/* 圖片預覽 */}
      {previewUrl && selectedFile?.type.startsWith('image/') && (
        <div className="mb-6 relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- Using blob URL from user upload */}
          <img
            src={previewUrl}
            alt="Invoice preview"
            className="max-w-xs max-h-48 rounded-lg shadow-lg opacity-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
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
          </div>
        </div>
      )}

      <p className="text-lg font-medium text-slate-700">AI 掃描中...</p>
      <p className="text-slate-500 mt-2">請稍候</p>
    </div>
  )

  // 渲染確認/修正表單
  const renderReviewForm = () => (
    <div className="space-y-6">
      {/* 圖片預覽與說明 */}
      <div className="flex gap-4 bg-slate-50 rounded-xl p-4">
        {previewUrl && selectedFile?.type.startsWith('image/') && (
          <div className="flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- Using blob URL from user upload */}
            <img
              src={previewUrl}
              alt="Invoice preview"
              className="w-32 h-32 object-cover rounded-lg shadow"
            />
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-medium text-slate-700">確認掃描結果</h4>
          <p className="text-sm text-slate-500 mt-1">請確認以下資訊是否正確</p>
          {fieldsNeedingReview.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {`${fieldsNeedingReview.length} 個欄位需要確認`}
              </span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          重新掃描
        </Button>
      </div>

      {/* 表單欄位 */}
      <div className="space-y-4">
        {/* 發票類型與編號 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className={labelClassName}>
              發票類型
              {needsReview('type') && (
                <span className="ml-2 text-amber-500 text-xs">
                  請確認
                </span>
              )}
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as InvoiceType })}
              className={getFieldClassName('type')}
            >
              <option value="OUTPUT">銷項發票</option>
              <option value="INPUT">進項發票</option>
            </select>
          </div>

          <div>
            <label htmlFor="number" className={labelClassName}>
              發票號碼 <span className="text-red-500">*</span>
              {needsReview('number') && (
                <span className="ml-2 text-amber-500 text-xs">
                  請確認
                </span>
              )}
            </label>
            <input
              type="text"
              id="number"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="AA-12345678"
              required
              className={getFieldClassName('number')}
            />
          </div>
        </div>

        {/* 日期 */}
        <div>
          <label htmlFor="date" className={labelClassName}>
            發票日期 <span className="text-red-500">*</span>
            {needsReview('date') && (
              <span className="ml-2 text-amber-500 text-xs">
                請確認
              </span>
            )}
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className={getFieldClassName('date')}
          />
        </div>

        {/* 交易對象 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="counterpartyName" className={labelClassName}>
              交易對象
              {needsReview('counterparty_name') && (
                <span className="ml-2 text-amber-500 text-xs">
                  請確認
                </span>
              )}
            </label>
            <input
              type="text"
              id="counterpartyName"
              value={formData.counterpartyName}
              onChange={(e) => setFormData({ ...formData, counterpartyName: e.target.value })}
              placeholder="輸入公司名稱"
              className={getFieldClassName('counterparty_name')}
            />
          </div>

          <div>
            <label htmlFor="counterpartyTaxId" className={labelClassName}>
              統一編號
              {needsReview('counterparty_tax_id') && (
                <span className="ml-2 text-amber-500 text-xs">
                  請確認
                </span>
              )}
            </label>
            <input
              type="text"
              id="counterpartyTaxId"
              value={formData.counterpartyTaxId}
              onChange={(e) => setFormData({ ...formData, counterpartyTaxId: e.target.value })}
              placeholder="12345678"
              className={getFieldClassName('counterparty_tax_id')}
            />
          </div>
        </div>

        {/* 金額 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="untaxedAmount" className={labelClassName}>
              未稅金額 <span className="text-red-500">*</span>
              {needsReview('untaxed_amount') && (
                <span className="ml-2 text-amber-500 text-xs">
                  請確認
                </span>
              )}
            </label>
            <input
              type="number"
              id="untaxedAmount"
              min="0"
              step="1"
              value={formData.untaxedAmount}
              onChange={(e) => setFormData({ ...formData, untaxedAmount: e.target.value })}
              placeholder="0"
              required
              className={getFieldClassName('untaxed_amount')}
            />
          </div>

          <div>
            <label htmlFor="taxAmount" className={labelClassName}>
              稅額
              {needsReview('tax_amount') && (
                <span className="ml-2 text-amber-500 text-xs">
                  請確認
                </span>
              )}
            </label>
            <input
              type="number"
              id="taxAmount"
              min="0"
              step="1"
              value={formData.taxAmount}
              onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
              placeholder="0"
              className={getFieldClassName('tax_amount')}
            />
          </div>

          <div>
            <label htmlFor="totalAmount" className={labelClassName}>
              含稅金額
              {needsReview('total_amount') && (
                <span className="ml-2 text-amber-500 text-xs">
                  請確認
                </span>
              )}
            </label>
            <input
              type="number"
              id="totalAmount"
              min="0"
              step="1"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              placeholder="0"
              className={`${getFieldClassName('total_amount')} font-medium`}
            />
          </div>
        </div>

        {/* 摘要 */}
        <div>
          <label htmlFor="description" className={labelClassName}>
            摘要
            {needsReview('description') && (
              <span className="ml-2 text-amber-500 text-xs">
                請確認
              </span>
            )}
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="輸入交易說明"
            rows={3}
            className={getFieldClassName('description')}
          />
        </div>
      </div>

      {/* 按鈕 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={handleReset}>
          取消
        </Button>
        <Button onClick={handleSave}>儲存</Button>
      </div>
    </div>
  )

  // 渲染儲存中
  const renderSaving = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <svg className="w-16 h-16 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
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
      <p className="mt-4 text-lg font-medium text-slate-700">儲存中...</p>
    </div>
  )

  return (
    <Card>
      <CardContent className="pt-6">
        {step === 'upload' && renderUploadArea()}
        {step === 'scanning' && renderScanning()}
        {step === 'review' && renderReviewForm()}
        {step === 'saving' && renderSaving()}
      </CardContent>
    </Card>
  )
}
