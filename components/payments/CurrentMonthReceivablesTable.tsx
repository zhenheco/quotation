'use client'

import React, { useState, useMemo } from 'react'
import {
  useCurrentMonthReceivables,
  useMarkScheduleAsCollected,
  useUpdatePaymentSchedule,
  useDeletePaymentSchedule,
  type CurrentMonthReceivable
} from '@/hooks/usePayments'
import { safeToLocaleString } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import EditPaymentScheduleModal from './EditPaymentScheduleModal'

// 付款狀態翻譯
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: '待收款',
  paid: '已收款',
  overdue: '已逾期',
}

// 狀態對應的樣式
const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
}

/**
 * 取得狀態 badge 的樣式類別
 */
function getStatusBadgeClass(status: string): string {
  return PAYMENT_STATUS_STYLES[status] ?? PAYMENT_STATUS_STYLES.pending
}

interface CurrentMonthReceivablesTableProps {
  searchQuery?: string
}

export function CurrentMonthReceivablesTable({ searchQuery = '' }: CurrentMonthReceivablesTableProps) {
  // 固定使用繁體中文
  const locale = 'zh'
  const { data, isLoading, error, refetch } = useCurrentMonthReceivables()
  const markAsCollected = useMarkScheduleAsCollected()
  const updateSchedule = useUpdatePaymentSchedule()
  const deleteSchedule = useDeletePaymentSchedule()

  const [editingSchedule, setEditingSchedule] = useState<CurrentMonthReceivable | null>(null)
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null)

  const { unpaidItems, paidItems } = useMemo(() => {
    if (!data?.receivables) {
      return { unpaidItems: [], paidItems: [] }
    }

    const filteredReceivables = data.receivables.filter((item) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      const customerName = locale === 'zh' ? item.customer_name_zh : item.customer_name_en
      return (
        customerName.toLowerCase().includes(query) ||
        (item.quotation_number?.toLowerCase().includes(query) ?? false)
      )
    })

    const unpaid: CurrentMonthReceivable[] = []
    const paid: CurrentMonthReceivable[] = []
    filteredReceivables.forEach((item) => {
      if (item.status === 'paid') {
        paid.push(item)
      } else {
        unpaid.push(item)
      }
    })
    return { unpaidItems: unpaid, paidItems: paid }
  }, [data?.receivables, searchQuery, locale])

  const handleCheckboxChange = async (item: CurrentMonthReceivable) => {
    if (item.status === 'paid') {
      try {
        await updateSchedule.mutateAsync({
          scheduleId: item.id,
          input: {
            status: 'pending',
            paid_date: null,
            payment_id: null,
          },
        })
        toast.success('已取消收款')
      } catch (err) {
        toast.error((err as Error).message || '取消收款失敗')
      }
    } else {
      try {
        await markAsCollected.mutateAsync({
          scheduleId: item.id,
          input: {
            payment_date: new Date().toISOString(),
          },
        })
        toast.success('已標記為已收款')
      } catch (err) {
        const errorMessage = (err as { response?: { status?: number } }).response?.status === 400
          ? '該排程已收款'
          : (err as { response?: { status?: number } }).response?.status === 404
          ? '找不到該排程'
          : '標記收款失敗'
        toast.error(errorMessage)
      }
    }
  }

  const handleDelete = async (scheduleId: string) => {
    try {
      await deleteSchedule.mutateAsync(scheduleId)
      toast.success('已刪除排程')
      setDeletingScheduleId(null)
    } catch (err) {
      toast.error((err as Error).message || '刪除排程失敗')
    }
  }

  const isPending = markAsCollected.isPending || updateSchedule.isPending || deleteSchedule.isPending

  const renderTableRow = (item: CurrentMonthReceivable) => (
    <tr key={item.id} className="hover:bg-gray-50">
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={item.status === 'paid'}
          onChange={() => handleCheckboxChange(item)}
          disabled={isPending}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
          aria-label={item.status === 'paid' ? '取消收款' : '標記為已收款'}
        />
      </td>
      <td className="px-4 py-4 text-sm text-gray-900">
        {item.quotation_number || '-'}
      </td>
      <td className="px-4 py-4 text-sm text-gray-900">
        {locale === 'zh' ? item.customer_name_zh : item.customer_name_en}
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">
        第 {item.schedule_number} 期 / 共 {item.total_schedules} 期
      </td>
      <td className="px-4 py-4 text-sm font-medium text-gray-900">
        {safeToLocaleString(item.amount)} {item.currency}
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">
        {new Date(item.due_date).toLocaleDateString(locale)}
      </td>
      <td className="px-4 py-4">
        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(item.status)}`}>
          {PAYMENT_STATUS_LABELS[item.status] || item.status}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingSchedule(item)}
            className="text-blue-600 hover:text-blue-800 text-sm"
            title="編輯排程"
          >
            編輯
          </button>
          {item.status !== 'paid' && (
            <button
              onClick={() => setDeletingScheduleId(item.id)}
              className="text-red-600 hover:text-red-800 text-sm"
              title="刪除排程"
            >
              刪除
            </button>
          )}
        </div>
      </td>
    </tr>
  )

  const renderMobileCard = (item: CurrentMonthReceivable) => (
    <div key={item.id} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <div className="mt-1">
            <input
              type="checkbox"
              checked={item.status === 'paid'}
              onChange={() => handleCheckboxChange(item)}
              disabled={isPending}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {locale === 'zh' ? item.customer_name_zh : item.customer_name_en}
            </h4>
            {item.quotation_number && (
              <p className="text-xs text-gray-500 mt-1">{item.quotation_number}</p>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(item.status)}`}>
          {PAYMENT_STATUS_LABELS[item.status] || item.status}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">期數</span>
          <span className="text-gray-900">
            第 {item.schedule_number} 期 / 共 {item.total_schedules} 期
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">金額</span>
          <span className="font-medium text-gray-900">
            {safeToLocaleString(item.amount)} {item.currency}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">到期日</span>
          <span className="text-gray-900">
            {new Date(item.due_date).toLocaleDateString(locale)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t">
        <button
          onClick={() => setEditingSchedule(item)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          編輯
        </button>
        {item.status !== 'paid' && (
          <button
            onClick={() => setDeletingScheduleId(item.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            刪除
          </button>
        )}
      </div>
    </div>
  )

  const renderTableHeader = () => (
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
          ✓
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          報價單號
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          客戶名稱
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          期數
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          金額
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          到期日
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          收款狀態
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
          操作
        </th>
      </tr>
    </thead>
  )

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">載入資料時發生錯誤</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重試
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.receivables.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-gray-600">本月無應收款項</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">本月應收款項</h3>
          <p className="text-sm text-gray-600 mt-1">
            總計 {data.summary.total_count} 筆，待收款 {data.summary.pending_count} 筆，已收款 {data.summary.paid_count} 筆，逾期 {data.summary.overdue_count} 筆
          </p>
        </div>

        {/* 未收款區域 */}
        {unpaidItems.length > 0 && (
          <>
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
              <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                <span className="text-lg">⏳</span>
                未收款 ({unpaidItems.length})
              </h4>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                {renderTableHeader()}
                <tbody className="bg-white divide-y divide-gray-200">
                  {unpaidItems.map(renderTableRow)}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-200">
              {unpaidItems.map(renderMobileCard)}
            </div>
          </>
        )}

        {/* 已收款區域 */}
        {paidItems.length > 0 && (
          <>
            <div className="px-4 py-3 bg-green-50 border-b border-green-100 border-t">
              <h4 className="font-medium text-green-800 flex items-center gap-2">
                <span className="text-lg">✅</span>
                已收款 ({paidItems.length})
              </h4>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                {renderTableHeader()}
                <tbody className="bg-white divide-y divide-gray-200">
                  {paidItems.map(renderTableRow)}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-200">
              {paidItems.map(renderMobileCard)}
            </div>
          </>
        )}

        {/* 如果沒有未收款和已收款項目 */}
        {unpaidItems.length === 0 && paidItems.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            本月無應收款項
          </div>
        )}
      </div>

      {editingSchedule && (
        <EditPaymentScheduleModal
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
        />
      )}

      {deletingScheduleId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">確認刪除</h3>
            <p className="text-gray-600 mb-6">確定要刪除此收款排程嗎？此操作無法復原。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingScheduleId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                disabled={deleteSchedule.isPending}
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deletingScheduleId)}
                className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                disabled={deleteSchedule.isPending}
              >
                {deleteSchedule.isPending ? '刪除中...' : '刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
