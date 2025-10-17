'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import PDFDownloadButton from '@/components/PDFDownloadButton'
import EmailSendButton from '@/components/EmailSendButton'

interface QuotationDetailProps {
  quotation: any
  items: any[]
  locale: string
}

export default function QuotationDetail({ quotation, items, locale }: QuotationDetailProps) {
  const t = useTranslations()
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      router.refresh()
    } catch (error) {
      console.error('Error updating status:', error)
      alert(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[status as keyof typeof statusColors]}`}>
        {t(`status.${status}`)}
      </span>
    )
  }

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
              {t('quotation.issueDate')}: {new Date(quotation.issue_date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(quotation.status)}
            <EmailSendButton
              quotationId={quotation.id}
              recipientEmail={quotation.customers?.email || ''}
              locale={locale as 'zh' | 'en'}
              onSuccess={() => router.refresh()}
            />
            <PDFDownloadButton
              quotationId={quotation.id}
              locale={locale as 'zh' | 'en'}
              variant="primary"
              showLanguageOptions={true}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
              {t('quotation.customer')}
            </h3>
            <p className="text-gray-900 font-medium">
              {quotation.customers?.name[locale as 'zh' | 'en']}
            </p>
            <p className="text-gray-600 text-sm">{quotation.customers?.email}</p>
            {quotation.customers?.phone && (
              <p className="text-gray-600 text-sm">{quotation.customers.phone}</p>
            )}
            {quotation.customers?.address && (
              <p className="text-gray-600 text-sm mt-2">
                {quotation.customers.address[locale as 'zh' | 'en']}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
              {t('quotation.details')}
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-600">{t('quotation.validUntil')}:</span>{' '}
                <span className="text-gray-900">
                  {new Date(quotation.valid_until).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')}
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{t('quotation.items')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('product.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quotation.quantity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quotation.unitPrice')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quotation.discount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quotation.subtotal')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {item.products?.name[locale as 'zh' | 'en']}
                    </div>
                    {item.products?.description && (
                      <div className="text-xs text-gray-500 mt-1">
                        {item.products.description[locale as 'zh' | 'en']}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {quotation.currency} {item.unit_price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.discount > 0 ? `${quotation.currency} ${item.discount.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {quotation.currency} {item.subtotal.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="max-w-md ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('quotation.subtotal')}:</span>
              <span className="text-gray-900 font-medium">
                {quotation.currency} {quotation.subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {t('quotation.tax')} ({quotation.tax_rate}%):
              </span>
              <span className="text-gray-900 font-medium">
                {quotation.currency} {quotation.tax_amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>{t('quotation.total')}:</span>
              <span>{quotation.currency} {quotation.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quotation.notes && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('quotation.notes')}</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{quotation.notes}</p>
        </div>
      )}

      {/* Status Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('quotation.updateStatus')}</h3>
        <div className="flex gap-3">
          {quotation.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('sent')}
              disabled={isUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('quotation.markAsSent')}
            </button>
          )}
          {quotation.status === 'sent' && (
            <>
              <button
                onClick={() => handleStatusChange('accepted')}
                disabled={isUpdating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('quotation.markAsAccepted')}
              </button>
              <button
                onClick={() => handleStatusChange('rejected')}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('quotation.markAsRejected')}
              </button>
            </>
          )}
          {(quotation.status === 'accepted' || quotation.status === 'rejected') && (
            <button
              onClick={() => handleStatusChange('draft')}
              disabled={isUpdating}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('quotation.markAsDraft')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
