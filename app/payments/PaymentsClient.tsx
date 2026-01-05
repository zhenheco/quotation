'use client'

import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { CurrentMonthReceivablesTable } from '@/components/payments/CurrentMonthReceivablesTable'
import AddPaymentScheduleModal from '@/components/payments/AddPaymentScheduleModal'
import {
  usePaymentStatistics,
  usePaymentReminders,
  useCurrentMonthReceivables,
} from '@/hooks/usePayments'
import { safeToLocaleString } from '@/lib/utils/formatters'

export default function PaymentsClient() {
  const { data: statistics, isLoading: loadingStats, refetch: refetchStatistics } = usePaymentStatistics()
  const { data: reminders } = usePaymentReminders()
  const { refetch: refetchReceivables } = useCurrentMonthReceivables()

  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const handleAddScheduleSuccess = () => {
    refetchStatistics()
    refetchReceivables()
  }

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex-shrink-0">
        <PageHeader
          title="收款管理"
          description="管理付款排程和收款紀錄"
          action={{
            label: '新增排程',
            onClick: () => setIsAddModalOpen(true)
          }}
        />
      </div>

      {reminders && reminders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-shrink-0">
          <h3 className="font-semibold text-blue-900 mb-2">
            即將到期提醒
          </h3>
          <div className="space-y-2">
            {reminders.slice(0, 3).map((reminder) => (
              <div key={reminder.contract_id} className="text-sm text-blue-800">
                {reminder.customer_name} - {safeToLocaleString(reminder.next_collection_amount)} ({reminder.days_until_due} 天後到期)
              </div>
            ))}
          </div>
        </div>
      )}

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-1">本月已收款</p>
            <p className="text-2xl font-bold text-green-600">
              {safeToLocaleString(statistics.current_month.total_collected)} {statistics.current_month.currency}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 mb-1">待收款</p>
            <p className="text-2xl font-bold text-yellow-600">
              {safeToLocaleString(statistics.current_month.total_pending)} {statistics.current_month.currency}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600 mb-1">逾期未收</p>
            <p className="text-2xl font-bold text-red-600">
              {safeToLocaleString(statistics.current_month.total_overdue)} {statistics.current_month.currency}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">應收總額</p>
            <p className="text-2xl font-bold text-blue-600">
              {safeToLocaleString(statistics.current_month.total_receivable)} {statistics.current_month.currency}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 flex-shrink-0">
        <input
          type="text"
          placeholder="搜尋客戶..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <CurrentMonthReceivablesTable searchQuery={searchQuery} />
      </div>

      <AddPaymentScheduleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddScheduleSuccess}
      />
    </div>
  )
}
