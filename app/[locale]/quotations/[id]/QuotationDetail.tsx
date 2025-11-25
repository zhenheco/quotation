'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import {
  useQuotation,
  useUpdateQuotation,
  type QuotationStatus,
} from '@/hooks/useQuotations'
import { toast } from 'sonner'
import './print.css'
import { safeToLocaleString } from '@/lib/utils/formatters'
import { PDFDownloadButton } from '@/components/pdf/PDFDownloadButton'
import type { PDFCompany, PDFQuotation, PDFCustomer } from '@/lib/pdf/types'
import { DEFAULT_BRAND_COLORS } from '@/types/brand.types'

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

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    try {
      await updateQuotation.mutateAsync({ status: newStatus })
      toast.success(`狀態已更新為 ${t(`status.${newStatus}`)}`)
    } catch (error) {
      toast.error('更新狀態失敗')
      console.error('Error updating status:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getPDFData = (): { company: PDFCompany; quotation: PDFQuotation } | null => {
    if (!quotation) return null

    const q = quotation as {
      company_logo_url?: string | null
      company_signature_url?: string | null
      company_passbook_url?: string | null
      company_name?: { zh: string; en: string }
      company_tax_id?: string | null
      company_phone?: string | null
      company_email?: string | null
      company_website?: string | null
      company_address?: { zh: string; en: string } | null
      company_bank_name?: string | null
      company_bank_code?: string | null
      company_bank_account?: string | null
      company_brand_colors?: { primary: string; secondary: string; text: string }
      customer_name?: { zh: string; en: string }
      payment_method?: string
      payment_notes?: string
      items?: Array<{
        id: string
        description: { zh: string; en: string }
        quantity: number
        unit_price: number
        discount: number
        subtotal: number
      }>
    }

    const customer: PDFCustomer = {
      name: q.customer_name?.[locale as 'zh' | 'en'] || quotation.customer_id,
      email: null,
      phone: null,
      address: null,
      tax_id: null,
      contact_person: null,
    }

    const company: PDFCompany = {
      name: q.company_name || { zh: '', en: '' },
      logo_url: q.company_logo_url || null,
      signature_url: q.company_signature_url || null,
      passbook_url: q.company_passbook_url || null,
      tax_id: q.company_tax_id || null,
      bank_name: q.company_bank_name || null,
      bank_account: q.company_bank_account || null,
      bank_code: q.company_bank_code || null,
      address: q.company_address || null,
      phone: q.company_phone || null,
      email: q.company_email || null,
      website: q.company_website || null,
      brand_colors: q.company_brand_colors || DEFAULT_BRAND_COLORS,
    }

    const pdfQuotation: PDFQuotation = {
      quotation_number: quotation.quotation_number,
      status: quotation.status,
      issue_date: quotation.issue_date,
      valid_until: quotation.valid_until,
      currency: quotation.currency,
      subtotal: quotation.subtotal,
      tax_rate: quotation.tax_rate,
      tax_amount: quotation.tax_amount,
      total_amount: quotation.total_amount,
      notes: quotation.notes as { zh: string; en: string } | null,
      payment_method: q.payment_method || null,
      payment_notes: q.payment_notes || null,
      customer,
      items: (q.items || []).map((item) => ({
        description: typeof item.description === 'string'
          ? { zh: item.description, en: item.description }
          : item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        subtotal: item.subtotal,
      })),
    }

    return { company, quotation: pdfQuotation }
  }

  const pdfData = getPDFData()


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
      {/* Company Branding Header */}
      <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-0">
          {/* Logo Area - Left */}
          <div className="flex-shrink-0">
            {(quotation as { company_logo_url?: string | null }).company_logo_url ? (
              <Image
                src={(quotation as { company_logo_url?: string | null }).company_logo_url as string}
                alt={`${(quotation as { company_name?: { zh: string; en: string } }).company_name?.[locale as 'zh' | 'en'] || 'Company'} Logo`}
                width={200}
                height={80}
                className="max-w-[200px] max-h-[80px] md:max-w-[200px] print:max-w-[150px] object-contain company-logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="h-20 flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  {(quotation as { company_name?: { zh: string; en: string } }).company_name?.[locale as 'zh' | 'en'] || ''}
                </h1>
              </div>
            )}
          </div>

          {/* Company Info - Right */}
          <div className="text-left md:text-right company-info">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {(quotation as { company_name?: { zh: string; en: string } }).company_name?.[locale as 'zh' | 'en'] || ''}
            </h2>
            {(quotation as { company_tax_id?: string | null }).company_tax_id && (
              <p className="text-sm text-gray-600">
                {locale === 'zh' ? '統一編號' : 'Tax ID'}: {(quotation as { company_tax_id?: string | null }).company_tax_id}
              </p>
            )}
            {(quotation as { company_phone?: string | null }).company_phone && (
              <p className="text-sm text-gray-600">
                {locale === 'zh' ? '電話' : 'Phone'}: {(quotation as { company_phone?: string | null }).company_phone}
              </p>
            )}
            {(quotation as { company_email?: string | null }).company_email && (
              <p className="text-sm text-gray-600">
                {(quotation as { company_email?: string | null }).company_email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quotation Header */}
      <div className="bg-white rounded-lg shadow p-6 quotation-header">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {quotation.quotation_number}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-gray-600">
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
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{t('quotation.status')}:</span>
                <select
                  value={quotation.status}
                  onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
                  disabled={isUpdating}
                  className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <option value="draft">{t('status.draft')}</option>
                  <option value="sent">{t('status.sent')}</option>
                  <option value="signed">{t('status.signed')}</option>
                  <option value="expired">{t('status.expired')}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 no-print">
            <button
              onClick={() => router.push(`/${locale}/quotations/${quotation.id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {t('common.edit')}
            </button>
            {pdfData && (
              <PDFDownloadButton
                quotation={pdfData.quotation}
                company={pdfData.company}
                variant="default"
              />
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
              title={locale === 'zh' ? '點擊後選擇「另存為 PDF」即可儲存檔案' : 'Click and choose "Save as PDF" to save the file'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {t('quotation.print_or_save_pdf')}
            </button>
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

      {/* Items */}
      {quotation.items && quotation.items.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('quotation.items')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('quotation.item.description')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('quotation.item.quantity')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('quotation.item.unitPrice')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('quotation.item.discount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('quotation.item.subtotal')}
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
                          : (item.description as Record<string, string>)[locale as 'zh' | 'en']}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {quotation.currency} {safeToLocaleString(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.discount > 0 ? `${item.discount}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quotation.currency} {safeToLocaleString(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6 print:shadow-none total-section">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('quotation.summary')}</h3>
        <div className="max-w-md ml-auto space-y-2">
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
            <span>{quotation.currency} {quotation.total_amount?.toLocaleString() || '0'}</span>
          </div>
        </div>

        {/* Company Signature - Below Total */}
        {(quotation as { company_signature_url?: string | null }).company_signature_url && (
          <div className="flex justify-end mt-6 print:mt-4 signature-section">
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
                {locale === 'zh' ? '報價專用章' : 'Official Quotation Stamp'}
              </span>
            </div>
          </div>
        )}
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

      {/* Payment Information */}
      {((quotation as { payment_method?: string }).payment_method || (quotation as { payment_notes?: string }).payment_notes) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('quotation.paymentInfo')}</h3>
          <div className="space-y-3">
            {(quotation as { payment_method?: string }).payment_method && (
              <div>
                <span className="text-sm text-gray-600">{t('quotation.paymentMethod')}:</span>{' '}
                <span className="text-sm text-gray-900 font-medium">
                  {t(`quotation.paymentMethods.${(quotation as { payment_method?: string }).payment_method}` as never)}
                </span>
              </div>
            )}
            {(quotation as { payment_notes?: string }).payment_notes && (
              <div>
                <span className="text-sm text-gray-600">{t('quotation.paymentNotes')}:</span>
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                  {(quotation as { payment_notes?: string }).payment_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {locale === 'zh' ? '合約檔案' : 'Contract File'}
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
                    {locale === 'zh' ? '已上傳合約' : 'Contract Uploaded'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date().toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')}
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
                  {locale === 'zh' ? '檢視' : 'View'}
                </a>
                <button
                  onClick={() => {
                    if (confirm(locale === 'zh' ? '確定要刪除合約檔案？' : 'Delete contract file?')) {
                      // TODO: Implement delete
                    }
                  }}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  {locale === 'zh' ? '刪除' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">
                {locale === 'zh' ? '尚未上傳合約' : 'No contract uploaded'}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
