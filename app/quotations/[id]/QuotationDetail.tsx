'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  useQuotation,
  useUpdateQuotation,
  usePaymentTerms,
  type QuotationStatus,
  type PaymentTerm,
} from '@/hooks/useQuotations'
import { usePDFGenerator } from '@/hooks/usePDFGenerator'
import { useCreateOrderFromQuotation } from '@/hooks/useOrders'
import { toast } from 'sonner'
import { ShoppingCart } from 'lucide-react'
import { formatAmount } from '@/lib/utils/formatters'
import { parseNotes } from '@/lib/utils/notes-parser'
import type { PDFLocale } from '@/lib/pdf/pdf-translations'

interface QuotationDetailProps {
  quotationId: string
}

/** 付款方式對應表 */
const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash: '現金',
  bank_transfer: '銀行轉帳',
  ach_transfer: 'ACH 轉帳',
  credit_card: '信用卡',
  check: '支票',
  cryptocurrency: '加密貨幣',
  other: '其他',
}

export default function QuotationDetail({ quotationId }: QuotationDetailProps) {
  const router = useRouter()
  const [pdfLocale, setPdfLocale] = useState<PDFLocale>('zh')

  // Hooks
  const { data: quotation, isLoading, error, refetch } = useQuotation(quotationId)
  const updateQuotation = useUpdateQuotation(quotationId)
  const { data: paymentTerms } = usePaymentTerms(quotationId)
  const { generatePDF, isGenerating, progress } = usePDFGenerator()
  const createOrder = useCreateOrderFromQuotation()

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      sent: '已發送',
      accepted: '已接受',
      rejected: '已拒絕',
      expired: '已過期',
    }
    return statusMap[status] || status
  }

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    try {
      await updateQuotation.mutateAsync({ status: newStatus })
      // 強制重新取得最新資料，確保 UI 正確顯示
      await refetch()
      toast.success(`狀態已更新為${getStatusText(newStatus)}`)
    } catch (error) {
      toast.error('更新狀態失敗')
      console.error('Error updating status:', error)
    }
  }

  const handleDownloadPDF = async () => {
    if (!quotation) return
    try {
      await generatePDF(quotation, paymentTerms, pdfLocale)
      toast.success('PDF 下載成功')
    } catch {
      toast.error('PDF 產生失敗')
    }
  }

  // 處理轉換為訂單
  const handleCreateOrder = async () => {
    if (!quotation) return

    if (quotation.status !== 'accepted') {
      toast.error('請先將報價單狀態改為「已接受」')
      return
    }

    try {
      const order = await createOrder.mutateAsync(quotation.id)
      toast.success('訂單已建立成功！')
      router.push(`/orders/${order.id}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '建立訂單失敗'
      toast.error(`建立訂單失敗: ${errorMessage}`, { duration: 10000 })
    }
  }

  // 載入狀態
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // 錯誤狀態
  if (error || !quotation) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">載入報價單失敗：{error?.message || '報價單不存在'}</p>
      </div>
    )
  }

  const isUpdating = updateQuotation.isPending

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center gap-3 no-print">
        <h1 className="text-2xl font-bold text-gray-900">
          {quotation.quotation_number} 詳情
        </h1>
      </div>

      {/* Quotation Header */}
      <div className="bg-white rounded-lg shadow p-6 quotation-header">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <p className="text-gray-600">
                開立日期: {new Date(quotation.issue_date).toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">狀態:</span>
                <select
                  value={quotation.status}
                  onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
                  disabled={isUpdating}
                  className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <option value="draft">草稿</option>
                  <option value="sent">已發送</option>
                  <option value="accepted">已接受</option>
                  <option value="rejected">已拒絕</option>
                  <option value="expired">已過期</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 no-print">
            {/* 轉訂單按鈕 */}
            <button
              onClick={handleCreateOrder}
              disabled={createOrder.isPending || quotation.status !== 'accepted'}
              className={`px-4 py-2 text-white rounded-lg transition-colors inline-flex items-center gap-2 ${
                quotation.status === 'accepted'
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed opacity-60'
              }`}
              title={quotation.status !== 'accepted' ? `目前狀態: ${quotation.status}，請先改為「已接受」` : '點擊將報價單轉為訂單'}
            >
              <ShoppingCart className="w-4 h-4" />
              {createOrder.isPending ? '建立中...' : quotation.status === 'accepted' ? '轉訂單' : '轉訂單（需已接受）'}
            </button>
            <button
              onClick={() => router.push(`/quotations/${quotation.id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              編輯
            </button>
            <select
              value={pdfLocale}
              onChange={(e) => setPdfLocale(e.target.value as PDFLocale)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {progress}%
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  下載 PDF
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
              客戶
            </h3>
            <p className="text-gray-900 font-medium">
              {quotation.customer_name
                ? quotation.customer_name.zh
                : quotation.customer_id}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
              詳細資訊
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-600">有效期限:</span>{' '}
                <span className="text-gray-900">
                  {new Date(quotation.valid_until).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </p>
              <p>
                <span className="text-gray-600">幣別:</span>{' '}
                <span className="text-gray-900">{quotation.currency}</span>
              </p>
              <p>
                <span className="text-gray-600">稅率:</span>{' '}
                <span className="text-gray-900">{quotation.tax_rate}%</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Items - 報價項目 */}
      <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none total-section">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            報價項目
          </h3>
        </div>

        {/* Items Table */}
        {quotation.items && quotation.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    說明
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    數量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    單價
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotation.items.map((item: { id: string; description: { zh: string; en: string }; quantity: number; unit_price: number; discount: number; subtotal: number }) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {typeof item.description === 'string'
                          ? item.description
                          : (item.description as Record<string, string>)['zh']}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {quotation.currency} {formatAmount(item.unit_price, quotation.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quotation.currency} {formatAmount(item.subtotal, quotation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary - 小計/稅金/總計 */}
        <div className="p-6 flex justify-end">
          <div className="space-y-2 text-right">
            <div className="text-sm">
              <span className="text-gray-600">小計:</span>{' '}
              <span className="text-gray-900 font-medium">
                {quotation.currency} {formatAmount(quotation.subtotal, quotation.currency)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">
                稅金 ({quotation.tax_rate}%):
              </span>{' '}
              <span className="text-gray-900 font-medium">
                {quotation.currency} {formatAmount(quotation.tax_amount, quotation.currency)}
              </span>
            </div>
            <div className="text-lg font-bold border-t pt-2">
              <span>總計:</span>{' '}
              <span>{quotation.currency} {formatAmount(quotation.total_amount, quotation.currency)}</span>
            </div>
          </div>
        </div>

        {/* Payment Terms - 付款條件 */}
        {paymentTerms && paymentTerms.length > 0 && (
          <div className="px-6 pb-6 pt-2 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              付款條件
            </h4>
            <div className="space-y-2">
              {paymentTerms.map((term: PaymentTerm) => (
                <div key={term.id} className="flex flex-col sm:flex-row sm:justify-between text-sm gap-1 sm:gap-0">
                  <span className="text-gray-600 break-words">
                    第 {term.term_number} 期
                    {' '}({term.percentage}%)
                    {term.due_date && (
                      <span className="sm:ml-2 block sm:inline mt-0.5 sm:mt-0">
                        - {new Date(term.due_date).toLocaleDateString('zh-TW', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    )}
                  </span>
                  <span className="text-gray-900 font-medium whitespace-nowrap">
                    {quotation.currency} {formatAmount(term.amount, quotation.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Company Signature */}
        {(quotation as { company_signature_url?: string | null }).company_signature_url && (
          <div className="flex justify-end px-6 pb-6 signature-section">
            <div className="flex flex-col items-end">
              <Image
                src={(quotation as { company_signature_url?: string | null }).company_signature_url as string}
                alt="Company Stamp"
                width={150}
                height={150}
                className="max-w-[150px] max-h-[150px] print:max-w-[120px] object-contain signature"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <span className="text-xs text-gray-500 mt-1 print:hidden">
                公司印章
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {quotation.notes && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">備註</h3>
          <p className="text-gray-600 whitespace-pre-wrap">
            {parseNotes(quotation.notes)}
          </p>
        </div>
      )}

      {/* Payment Information */}
      {(() => {
        const paymentMethod = (quotation as { payment_method?: string }).payment_method
        const paymentNotes = (quotation as { payment_notes?: string }).payment_notes
        if (!paymentMethod && !paymentNotes) return null
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">付款資訊</h3>
            <div className="space-y-3">
              {paymentMethod && (
                <div>
                  <span className="text-sm text-gray-600">付款方式:</span>{' '}
                  <span className="text-sm text-gray-900 font-medium">
                    {PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod}
                  </span>
                </div>
              )}
              {paymentNotes && (
                <div>
                  <span className="text-sm text-gray-600">付款備註:</span>
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                    {paymentNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Contract Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          合約檔案
        </h3>
        <div className="space-y-4">
          {quotation.contract_file_url ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    合約已上傳
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date().toLocaleDateString('zh-TW')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={quotation.contract_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  檢視
                </a>
                <button
                  onClick={() => {
                    if (confirm('確定要刪除此合約檔案嗎？')) {
                      // TODO: Implement delete
                    }
                  }}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  刪除
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">
                尚未上傳合約
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
