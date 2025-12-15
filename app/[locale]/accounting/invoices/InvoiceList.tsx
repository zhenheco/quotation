'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useInvoices } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface InvoiceListProps {
  locale: string
}

// 簡易金額格式化
function formatAmount(amount: number): string {
  return `NT$ ${amount.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function InvoiceList({ locale }: InvoiceListProps) {
  const t = useTranslations()
  const { company } = useCompany()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading, error } = useInvoices(
    {
      companyId: company?.id || '',
      status: statusFilter as 'DRAFT' | 'VERIFIED' | 'POSTED' | 'VOIDED' | undefined,
      page,
      pageSize: 20,
    },
    !!company?.id
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        {t('common.error')}: {error.message}
      </div>
    )
  }

  const invoices = data?.invoices || []
  const total = data?.total || 0

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      VERIFIED: 'bg-blue-100 text-blue-800',
      POSTED: 'bg-green-100 text-green-800',
      VOIDED: 'bg-red-100 text-red-800',
    }
    const statusLabels: Record<string, string> = {
      DRAFT: '草稿',
      VERIFIED: '已審核',
      POSTED: '已過帳',
      VOIDED: '已作廢',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100'}`}>
        {statusLabels[status] || status}
      </span>
    )
  }

  const getTypeBadge = (type: string) => {
    return type === 'OUTPUT'
      ? <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">銷項</span>
      : <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">進項</span>
  }

  return (
    <div>
      {/* 篩選器 */}
      <div className="p-4 border-b flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">全部狀態</option>
          <option value="DRAFT">草稿</option>
          <option value="VERIFIED">已審核</option>
          <option value="POSTED">已過帳</option>
          <option value="VOIDED">已作廢</option>
        </select>
      </div>

      {/* 列表 */}
      {invoices.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          {t('common.noData')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  發票號碼
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  類型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  往來對象
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/${locale}/accounting/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(invoice.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.date).toLocaleDateString('zh-TW')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.counterparty_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    {formatAmount(invoice.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/${locale}/accounting/invoices/${invoice.id}`}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {t('common.view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分頁 */}
      {total > 20 && (
        <div className="px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-500">
            顯示 {invoices.length} 筆，共 {total} 筆
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一頁
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={invoices.length < 20}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
