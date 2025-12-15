'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSettlements } from '@/hooks/pos'
import { useTenant } from '@/hooks/useTenant'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface SettlementListProps {
  locale: string
}

// 簡易金額格式化
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function SettlementList({ locale }: SettlementListProps) {
  const t = useTranslations()
  const { activeBranch } = useTenant()
  const [offset, setOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const limit = 20

  // 取得最近 30 天
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  const { data, isLoading, error } = useSettlements(
    {
      branchId: activeBranch?.id || '',
      status: statusFilter as 'PENDING' | 'COUNTING' | 'VARIANCE' | 'APPROVED' | 'LOCKED' | undefined,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      pageSize: limit,
      page: Math.floor(offset / limit) + 1,
    },
    !!activeBranch?.id
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

  const settlements = data?.settlements || []

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      PENDING: 'bg-blue-100 text-blue-800',
      COUNTING: 'bg-yellow-100 text-yellow-800',
      VARIANCE: 'bg-orange-100 text-orange-800',
      APPROVED: 'bg-green-100 text-green-800',
      LOCKED: 'bg-gray-100 text-gray-800',
    }
    const statusLabels: Record<string, string> = {
      PENDING: '待處理',
      COUNTING: '點算中',
      VARIANCE: '有差異',
      APPROVED: '已核准',
      LOCKED: '已鎖定',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100'}`}>
        {statusLabels[status] || status}
      </span>
    )
  }

  const getDifferenceClass = (difference: number) => {
    if (difference === 0) return 'text-gray-500'
    if (difference > 0) return 'text-green-600'
    return 'text-red-600'
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
          <option value="PENDING">待處理</option>
          <option value="COUNTING">點算中</option>
          <option value="VARIANCE">有差異</option>
          <option value="APPROVED">已核准</option>
          <option value="LOCKED">已鎖定</option>
        </select>
      </div>

      {/* 列表 */}
      {settlements.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          {t('common.noData')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  結帳日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分店
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  營業額
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  應收現金
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  實收現金
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  差額
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
              {settlements.map((settlement) => {
                const actualCash = settlement.actual_cash || 0
                const expectedCash = settlement.expected_cash || 0
                const difference = actualCash - expectedCash
                return (
                  <tr key={settlement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/${locale}/pos/settlements/${settlement.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {new Date(settlement.settlement_date).toLocaleDateString('zh-TW')}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {formatAmount(settlement.total_sales)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {formatAmount(expectedCash)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {settlement.actual_cash != null
                        ? formatAmount(actualCash)
                        : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getDifferenceClass(difference)}`}>
                      {settlement.actual_cash != null
                        ? (difference >= 0 ? '+' : '') + formatAmount(difference)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(settlement.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/${locale}/pos/settlements/${settlement.id}`}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {t('common.view')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分頁 */}
      {settlements.length >= limit && (
        <div className="px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-500">
            顯示第 {offset + 1} 到 {offset + settlements.length} 筆
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
              disabled={settlements.length < limit}
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
