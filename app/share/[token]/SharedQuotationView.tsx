'use client'

import { useState } from 'react'

interface SharedQuotationViewProps {
  quotation: any
  items: any[]
  shareToken: any
}

export default function SharedQuotationView({
  quotation,
  items,
  shareToken,
}: SharedQuotationViewProps) {
  const [locale, setLocale] = useState<'zh' | 'en'>('zh')

  // 格式化日期
  const formatDate = (dateString: string, lang: 'zh' | 'en') => {
    const date = new Date(dateString)
    if (lang === 'zh') {
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  }

  // 判斷報價單是否已過期
  const isExpired = new Date(quotation.valid_until) < new Date()

  // 取得狀態徽章
  const getStatusBadge = () => {
    let status = quotation.status

    if ((status === 'sent' || status === 'draft') && isExpired) {
      status = 'expired'
    }

    const statusConfig = {
      draft: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        label: { zh: '草稿', en: 'Draft' },
      },
      sent: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: { zh: '已發送', en: 'Sent' },
      },
      accepted: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: { zh: '已接受', en: 'Accepted' },
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: { zh: '已拒絕', en: 'Rejected' },
      },
      expired: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        label: { zh: '已過期', en: 'Expired' },
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig]

    return (
      <span
        className={`px-3 py-1 text-sm font-medium rounded-full ${config.bg} ${config.text}`}
      >
        {config.label[locale]}
      </span>
    )
  }

  const labels = {
    zh: {
      quotation: '報價單',
      issueDate: '建立日期',
      validUntil: '有效期限',
      customer: '客戶',
      taxId: '統一編號',
      contactPerson: '聯絡人',
      details: '詳細資訊',
      currency: '幣別',
      tax: '稅金',
      items: '項目',
      productName: '產品名稱',
      quantity: '數量',
      unitPrice: '單價',
      discount: '折扣',
      subtotal: '小計',
      total: '總計',
      notes: '備註',
      poweredBy: '由以下系統提供',
    },
    en: {
      quotation: 'Quotation',
      issueDate: 'Issue Date',
      validUntil: 'Valid Until',
      customer: 'Customer',
      taxId: 'Tax ID',
      contactPerson: 'Contact Person',
      details: 'Details',
      currency: 'Currency',
      tax: 'Tax',
      items: 'Items',
      productName: 'Product Name',
      quantity: 'Quantity',
      unitPrice: 'Unit Price',
      discount: 'Discount',
      subtotal: 'Subtotal',
      total: 'Total',
      notes: 'Notes',
      poweredBy: 'Powered by',
    },
  }

  const t = labels[locale]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航列 */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">{t.quotation}</h1>
            <div className="flex items-center gap-3">
              {/* 語言切換 */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setLocale('zh')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    locale === 'zh'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  中文
                </button>
                <button
                  onClick={() => setLocale('en')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${
                    locale === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 報價單標題 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {quotation.quotation_number}
                </h2>
                <p className="text-gray-600 mt-1">
                  {t.issueDate}: {formatDate(quotation.issue_date, locale)}
                </p>
              </div>
              <div>{getStatusBadge()}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 客戶資訊 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                  {t.customer}
                </h3>
                <p className="text-gray-900 font-medium">
                  {quotation.customers?.name[locale]}
                </p>
                <p className="text-gray-600 text-sm">{quotation.customers?.email}</p>
                {quotation.customers?.phone && (
                  <p className="text-gray-600 text-sm">{quotation.customers.phone}</p>
                )}
                {quotation.customers?.address && (
                  <p className="text-gray-600 text-sm mt-2">
                    {quotation.customers.address[locale]}
                  </p>
                )}
                {quotation.customers?.tax_id && (
                  <p className="text-gray-600 text-sm mt-2">
                    {t.taxId}: {quotation.customers.tax_id}
                  </p>
                )}
                {quotation.customers?.contact_person && (
                  <p className="text-gray-600 text-sm">
                    {t.contactPerson}: {quotation.customers.contact_person[locale]}
                  </p>
                )}
              </div>

              {/* 報價單詳情 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                  {t.details}
                </h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-600">{t.validUntil}:</span>{' '}
                    <span className="text-gray-900">
                      {formatDate(quotation.valid_until, locale)}
                    </span>
                    {isExpired && (
                      <span className="ml-2 text-orange-600 font-medium">
                        ({locale === 'zh' ? '已過期' : 'Expired'})
                      </span>
                    )}
                  </p>
                  <p>
                    <span className="text-gray-600">{t.currency}:</span>{' '}
                    <span className="text-gray-900">{quotation.currency}</span>
                  </p>
                  <p>
                    <span className="text-gray-600">{t.tax}:</span>{' '}
                    <span className="text-gray-900">{quotation.tax_rate}%</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 項目列表 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{t.items}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.productName}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.quantity}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.unitPrice}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.discount}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.subtotal}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.products?.name[locale]}
                        </div>
                        {item.products?.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.products.description[locale]}
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
                        {item.discount > 0
                          ? `${quotation.currency} ${item.discount.toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quotation.currency} {item.subtotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 總計 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="max-w-md ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.subtotal}:</span>
                  <span className="text-gray-900 font-medium">
                    {quotation.currency} {quotation.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t.tax} ({quotation.tax_rate}%):
                  </span>
                  <span className="text-gray-900 font-medium">
                    {quotation.currency} {quotation.tax_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>{t.total}:</span>
                  <span>
                    {quotation.currency} {quotation.total_amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 備註 */}
          {quotation.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t.notes}</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          )}

          {/* 頁尾 */}
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              {t.poweredBy}{' '}
              <span className="font-medium text-gray-700">Quotation System</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
