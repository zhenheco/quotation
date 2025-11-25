'use client'

import { use, useState } from 'react'

export const dynamic = 'force-dynamic'
import { useTranslations } from 'next-intl'
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

export default function PaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()

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
          title={t('payments.title')}
          description={t('payments.description')}
          action={{
            label: t('payments.addSchedule.button'),
            onClick: () => setIsAddModalOpen(true)
          }}
        />
      </div>

      {reminders && reminders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-shrink-0">
          <h3 className="font-semibold text-blue-900 mb-2">
            {t('payments.upcomingReminders')}
          </h3>
          <div className="space-y-2">
            {reminders.slice(0, 3).map((reminder) => (
              <div key={reminder.contract_id} className="text-sm text-blue-800">
                {reminder.customer_name} - {safeToLocaleString(reminder.next_collection_amount)} ({reminder.days_until_due} {t('payments.daysUntilDue')})
              </div>
            ))}
          </div>
        </div>
      )}

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-1">{t('payments.statistics.current_month_collected')}</p>
            <p className="text-2xl font-bold text-green-600">
              {safeToLocaleString(statistics.current_month.total_collected)} {statistics.current_month.currency}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 mb-1">{t('payments.statistics.total_pending')}</p>
            <p className="text-2xl font-bold text-yellow-600">
              {safeToLocaleString(statistics.current_month.total_pending)} {statistics.current_month.currency}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600 mb-1">{t('payments.statistics.total_overdue')}</p>
            <p className="text-2xl font-bold text-red-600">
              {safeToLocaleString(statistics.current_month.total_overdue)} {statistics.current_month.currency}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">{t('payments.statistics.total_receivable')}</p>
            <p className="text-2xl font-bold text-blue-600">
              {safeToLocaleString(statistics.current_month.total_receivable)} {statistics.current_month.currency}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 flex-shrink-0">
        <input
          type="text"
          placeholder={t('payments.search_customer')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <CurrentMonthReceivablesTable locale={locale} searchQuery={searchQuery} />
      </div>

      <AddPaymentScheduleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddScheduleSuccess}
        locale={locale}
      />
    </div>
  )
}
