'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  useQuotation,
  useUpdateQuotation,
  useSendQuotation,
  useConvertToContract,
  useExportQuotationPDF,
  type QuotationStatus,
} from '@/hooks/useQuotations'
import { toast } from 'sonner'

interface QuotationDetailProps {
  quotationId: string
  locale: string
}

export default function QuotationDetail({ quotationId, locale }: QuotationDetailProps) {
  const t = useTranslations()
  const router = useRouter()

  // Hooks
  const { data: quotation, isLoading, error } = useQuotation(quotationId)
  const updateQuotation = useUpdateQuotation(quotationId)
  const sendQuotation = useSendQuotation(quotationId)
  const convertToContract = useConvertToContract(quotationId)
  const exportPDF = useExportQuotationPDF(quotationId)

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    try {
      await updateQuotation.mutateAsync({ status: newStatus })
      toast.success(`狀態已更新為 ${t(`status.${newStatus}`)}`)
    } catch (error) {
      toast.error('更新狀態失敗')
      console.error('Error updating status:', error)
    }
  }

  const handleSend = async () => {
    try {
      await sendQuotation.mutateAsync()
      toast.success('報價單已發送')
    } catch (error) {
      toast.error('發送失敗')
      console.error('Error sending quotation:', error)
    }
  }

  const handleConvertToContract = async () => {
    if (!confirm('確定要將此報價單轉換為合約？')) return

    try {
      await convertToContract.mutateAsync()
      toast.success('已成功轉換為合約')
      router.push(`/${locale}/contracts`)
    } catch (error) {
      toast.error('轉換失敗')
      console.error('Error converting to contract:', error)
    }
  }

  const handleExportPDF = async (pdfLocale: 'zh' | 'en') => {
    try {
      await exportPDF.mutateAsync(pdfLocale)
      toast.success(`已匯出 ${pdfLocale === 'zh' ? '中文' : '英文'} PDF`)
    } catch (error) {
      toast.error('匯出失敗')
      console.error('Error exporting PDF:', error)
    }
  }

  // 判斷報價單是否已過期
  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
  }

  const getStatusBadge = (status: QuotationStatus, validUntil: string) => {
    let displayStatus = status

    // 如果狀態是 sent 或 draft 且已經過期，顯示為 expired
    if ((status === 'sent' || status === 'draft') && isExpired(validUntil)) {
      displayStatus = 'expired' as QuotationStatus
    }

    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[displayStatus as keyof typeof statusColors] || 'bg-orange-100 text-orange-800'}`}>
        {t(`status.${displayStatus}`)}
      </span>
    )
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

  const isUpdating = updateQuotation.isPending || sendQuotation.isPending || convertToContract.isPending

  return (
    <div className="space-y-6">
      {/* Quotation Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {quotation.quotation_number}
            </h2>
            <p className="text-gray-600 mt-1">
              {t('quotation.issueDate')}: {locale === 'zh'
                ? new Date(quotation.issue_date).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : new Date(quotation.issue_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(quotation.status, quotation.valid_until)}
            <button
              onClick={() => router.push(`/${locale}/quotations/${quotation.id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {t('common.edit')}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleExportPDF('zh')}
                disabled={exportPDF.isPending}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {exportPDF.isPending ? '匯出中...' : '匯出中文PDF'}
              </button>
              <button
                onClick={() => handleExportPDF('en')}
                disabled={exportPDF.isPending}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {exportPDF.isPending ? '匯出中...' : '匯出英文PDF'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
              {t('quotation.customer')}
            </h3>
            <p className="text-gray-900 font-medium">
              {quotation.customer_name
                ? (locale === 'zh' ? quotation.customer_name.zh : quotation.customer_name.en)
                : quotation.customer_id}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
              {t('quotation.details')}
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-600">{t('quotation.validUntil')}:</span>{' '}
                <span className="text-gray-900">
                  {locale === 'zh'
                    ? new Date(quotation.valid_until).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : new Date(quotation.valid_until).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                </span>
              </p>
              <p>
                <span className="text-gray-600">{t('quotation.currency')}:</span>{' '}
                <span className="text-gray-900">{quotation.currency}</span>
              </p>
              <p>
                <span className="text-gray-600">{t('quotation.tax')}:</span>{' '}
                <span className="text-gray-900">{quotation.tax_rate}%</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('quotation.summary')}</h3>
        <div className="max-w-md space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('quotation.subtotal')}:</span>
            <span className="text-gray-900 font-medium">
              {quotation.currency} {quotation.subtotal?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {t('quotation.tax')} ({quotation.tax_rate}%):
            </span>
            <span className="text-gray-900 font-medium">
              {quotation.currency} {quotation.tax_amount?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>{t('quotation.total')}:</span>
            <span>{quotation.currency} {quotation.total?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quotation.notes && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('quotation.notes')}</h3>
          <p className="text-gray-600 whitespace-pre-wrap">
            {typeof quotation.notes === 'string'
              ? quotation.notes
              : (quotation.notes as Record<string, string>)[locale as 'zh' | 'en']}
          </p>
        </div>
      )}

      {/* Status Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('quotation.actions')}</h3>
        <div className="flex gap-3 flex-wrap">
          {quotation.status === 'draft' && (
            <button
              onClick={handleSend}
              disabled={isUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {t('quotation.markAsSent')}
            </button>
          )}
          {quotation.status === 'sent' && (
            <>
              <button
                onClick={() => handleStatusChange('accepted')}
                disabled={isUpdating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {t('quotation.markAsAccepted')}
              </button>
              <button
                onClick={() => handleStatusChange('rejected')}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {t('quotation.markAsRejected')}
              </button>
            </>
          )}
          {quotation.status === 'accepted' && (
            <button
              onClick={handleConvertToContract}
              disabled={isUpdating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {t('quotation.convertToContract')}
            </button>
          )}
          {(quotation.status === 'accepted' || quotation.status === 'rejected') && (
            <button
              onClick={() => handleStatusChange('draft')}
              disabled={isUpdating}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {t('quotation.markAsDraft')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
