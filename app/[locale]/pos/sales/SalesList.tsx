'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSales, useDailySummary } from '@/hooks/pos'
import { useTenant } from '@/hooks/useTenant'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface SalesListProps {
  locale: string
}

// 簡易金額格式化
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function SalesList({ locale }: SalesListProps) {
  const t = useTranslations()
  const { tenant, activeBranch } = useTenant()
  const [offset, setOffset] = useState(0)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const limit = 20

  const { data, isLoading, error } = useSales(
    {
      tenantId: tenant?.id || '',
      branchId: activeBranch?.id,
      status: statusFilter as 'PENDING' | 'COMPLETED' | 'VOIDED' | 'REFUNDED' | undefined,
      startDate: dateFilter,
      endDate: dateFilter,
      pageSize: limit,
      page: Math.floor(offset / limit) + 1,
    },
    !!tenant?.id
  )

  const { data: summary } = useDailySummary(
    tenant?.id || '',
    activeBranch?.id || '',
    dateFilter,
    !!tenant?.id && !!activeBranch?.id
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

  const sales = data?.transactions || []

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      VOIDED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-purple-100 text-purple-800',
    }
    const statusLabels: Record<string, string> = {
      PENDING: '處理中',
      COMPLETED: '已完成',
      VOIDED: '已作廢',
      REFUNDED: '已退款',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100'}`}>
        {statusLabels[status] || status}
      </span>
    )
  }

  return (
    <div>
      {/* 摘要卡片 */}
      {summary && (
        <div className="p-4 border-b bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">營業額</div>
            <div className="text-2xl font-bold text-green-600">
              {formatAmount(summary.totalSales)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">交易筆數</div>
            <div className="text-2xl font-bold">{summary.transactionCount || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">現金收入</div>
            <div className="text-2xl font-bold">{formatAmount(summary.cashAmount)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">刷卡收入</div>
            <div className="text-2xl font-bold">{formatAmount(summary.cardAmount)}</div>
          </div>
        </div>
      )}

      {/* 篩選器 */}
      <div className="p-4 border-b flex flex-wrap gap-4">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">全部狀態</option>
          <option value="PENDING">處理中</option>
          <option value="COMPLETED">已完成</option>
          <option value="VOIDED">已作廢</option>
          <option value="REFUNDED">已退款</option>
        </select>
      </div>

      {/* 列表 */}
      {sales.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          {t('common.noData')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  交易編號
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  會員
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  服務人員
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
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/${locale}/pos/sales/${sale.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {sale.transaction_no}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.member_name || '散客'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    {formatAmount(sale.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(sale.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/${locale}/pos/sales/${sale.id}`}
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
      {sales.length >= limit && (
        <div className="px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-500">
            顯示第 {offset + 1} 到 {offset + sales.length} 筆
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一頁
            </button>
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={sales.length < limit}
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
