'use client'

import { use, useState } from 'react'
import { useTranslations } from 'next-intl'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { CollectedPaymentCard, UnpaidPaymentCard } from '@/components/payments/PaymentCard'
import {
  useCollectedPayments,
  useUnpaidPayments,
  usePaymentStatistics,
  usePaymentReminders,
  useMarkPaymentAsOverdue,
} from '@/hooks/usePayments'
import { toast } from 'sonner'

export default function PaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()

  const { data: collectedPayments, isLoading: loadingCollected, error: errorCollected } = useCollectedPayments()
  const { data: unpaidPayments, isLoading: loadingUnpaid, error: errorUnpaid } = useUnpaidPayments()
  const { data: statistics, isLoading: loadingStats } = usePaymentStatistics()
  const { data: reminders } = usePaymentReminders()
  const markAsOverdue = useMarkPaymentAsOverdue()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'deposit' | 'installment' | 'final' | 'recurring'>('all')

  const filteredCollected = (collectedPayments || []).filter((payment) => {
    if (selectedType !== 'all' && payment.payment_type !== selectedType) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const customerName = locale === 'zh' ? payment.customer_name_zh : payment.customer_name_en
      return customerName.toLowerCase().includes(query)
    }

    return true
  })

  const filteredUnpaid = (unpaidPayments || []).filter((payment) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const customerName = locale === 'zh' ? payment.customer_name_zh : payment.customer_name_en
      return customerName.toLowerCase().includes(query) || payment.contract_number.toLowerCase().includes(query)
    }

    return true
  })

  const loading = loadingCollected || loadingUnpaid || loadingStats

  const handleMarkAsOverdue = async (paymentId: string) => {
    try {
      await markAsOverdue.mutateAsync(paymentId)
      toast.success(t('payments.markedAsOverdue'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('payments.markOverdueError'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('payments.title')}
        description={t('payments.description')}
      />

      {reminders && reminders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            {t('payments.upcomingReminders')}
          </h3>
          <div className="space-y-2">
            {reminders.slice(0, 3).map((reminder) => (
              <div key={reminder.contract_id} className="text-sm text-blue-800">
                {reminder.customer_name} - {reminder.next_collection_amount.toLocaleString()} ({reminder.days_until_due} {t('payments.daysUntilDue')})
              </div>
            ))}
          </div>
        </div>
      )}

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">{t('payments.statistics.current_month_collected')}</p>
            <p className="text-2xl font-bold text-green-600">
              {statistics.current_month.total_collected.toLocaleString()} {statistics.current_month.currency}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">{t('payments.statistics.total_pending')}</p>
            <p className="text-2xl font-bold text-yellow-600">
              {statistics.current_month.total_pending.toLocaleString()} {statistics.current_month.currency}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">{t('payments.statistics.total_overdue')}</p>
            <p className="text-2xl font-bold text-red-600">
              {statistics.current_month.total_overdue.toLocaleString()} {statistics.current_month.currency}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">{t('payments.statistics.collection_rate')}</p>
            <p className="text-2xl font-bold text-blue-600">
              {((statistics.current_month.total_collected / (statistics.current_month.total_collected + statistics.current_month.total_pending)) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('payments.search_customer')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'deposit', 'installment', 'final', 'recurring'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? t('contracts.filter.all') : t(`payments.payment_type.${type}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <h3 className="font-semibold text-red-900 mb-1">{t('payments.unpaid_area')}</h3>
            <p className="text-sm text-red-800">
              {filteredUnpaid.length} {t('payments.pending')}
            </p>
          </div>

          {errorUnpaid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
              {errorUnpaid.message}
            </div>
          )}

          {filteredUnpaid.length === 0 ? (
            <EmptyState
              icon="💰"
              title={t('payments.emptyState.unpaid.title')}
              description={t('payments.emptyState.unpaid.description')}
            />
          ) : (
            <div className="space-y-4">
              {filteredUnpaid
                .sort((a, b) => b.days_overdue - a.days_overdue)
                .map((payment) => (
                  <UnpaidPaymentCard
                    key={payment.id}
                    payment={payment}
                    locale={locale}
                    onRecordPayment={() => {
                      window.location.href = `/${locale}/payments/new?contract_id=${payment.contract_id}`
                    }}
                    onSendReminder={() => {
                      toast.info(t('payments.reminderSent'))
                    }}
                    onMarkOverdue={() => {
                      handleMarkAsOverdue(payment.id)
                    }}
                  />
                ))}
            </div>
          )}
        </div>

        <div>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
            <h3 className="font-semibold text-green-900 mb-1">{t('payments.collected_area')}</h3>
            <p className="text-sm text-green-800">
              {filteredCollected.length} {t('payments.received')}
            </p>
          </div>

          {errorCollected && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
              {errorCollected.message}
            </div>
          )}

          {filteredCollected.length === 0 ? (
            <EmptyState
              icon="✅"
              title={t('payments.emptyState.collected.title')}
              description={t('payments.emptyState.collected.description')}
            />
          ) : (
            <div className="space-y-4">
              {filteredCollected
                .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                .map((payment) => (
                  <CollectedPaymentCard
                    key={payment.id}
                    payment={payment}
                    locale={locale}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
