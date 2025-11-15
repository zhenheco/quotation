'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useCurrentMonthReceivables, useMarkScheduleAsCollected } from '@/hooks/usePayments'
import { safeToLocaleString } from '@/lib/utils/formatters'
import { toast } from 'sonner'

interface CurrentMonthReceivablesTableProps {
  locale: string
}

export function CurrentMonthReceivablesTable({ locale }: CurrentMonthReceivablesTableProps) {
  const t = useTranslations()
  const { data, isLoading, error } = useCurrentMonthReceivables()
  const markAsCollected = useMarkScheduleAsCollected()

  const handleMarkCollected = async (scheduleId: string) => {
    try {
      await markAsCollected.mutateAsync({
        scheduleId,
        input: {
          payment_date: new Date().toISOString(),
        },
      })
      toast.success(t('payments.mark_collected_success'))
    } catch (error) {
      const errorMessage = (error as { response?: { status?: number } }).response?.status === 400
        ? t('payments.already_paid')
        : (error as { response?: { status?: number } }).response?.status === 404
        ? t('payments.schedule_not_found')
        : t('payments.mark_collected_error')
      toast.error(errorMessage)
    }
  }

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
          <p className="text-red-600 mb-4">{t('payments.load_error')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('common.retry')}
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
          <p className="text-gray-600">{t('payments.no_receivables')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">{t('payments.current_month_receivables')}</h3>
        <p className="text-sm text-gray-600 mt-1">
          {t('payments.receivables_summary', {
            total: data.summary.total_count,
            pending: data.summary.pending_count,
            paid: data.summary.paid_count,
            overdue: data.summary.overdue_count,
          })}
        </p>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                ✓
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payments.quotation_number')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payments.customer_name')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payments.schedule')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payments.amount')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payments.due_date')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payments.status')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.receivables.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  {item.status === 'pending' || item.status === 'overdue' ? (
                    <input
                      type="checkbox"
                      onChange={() => handleMarkCollected(item.id)}
                      disabled={markAsCollected.isPending}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      aria-label={t('payments.mark_as_collected')}
                    />
                  ) : (
                    <span className="text-green-500 text-lg" aria-label={t('payments.collected')}>
                      ✓
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {item.quotation_number || '-'}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {locale === 'zh' ? item.customer_name_zh : item.customer_name_en}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {t('payments.schedule_info', {
                    current: item.schedule_number,
                    total: item.total_schedules,
                  })}
                </td>
                <td className="px-4 py-4 text-sm font-medium text-gray-900">
                  {safeToLocaleString(item.amount)} {item.currency}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {new Date(item.due_date).toLocaleDateString(locale)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      item.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {t(`payments.status.${item.status}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-200">
        {data.receivables.map((item) => (
          <div key={item.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  {item.status === 'pending' || item.status === 'overdue' ? (
                    <input
                      type="checkbox"
                      onChange={() => handleMarkCollected(item.id)}
                      disabled={markAsCollected.isPending}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  ) : (
                    <span className="text-green-500 text-lg">✓</span>
                  )}
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
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  item.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : item.status === 'overdue'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {t(`payments.status.${item.status}`)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('payments.schedule')}</span>
                <span className="text-gray-900">
                  {t('payments.schedule_info', {
                    current: item.schedule_number,
                    total: item.total_schedules,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('payments.amount')}</span>
                <span className="font-medium text-gray-900">
                  {safeToLocaleString(item.amount)} {item.currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('payments.due_date')}</span>
                <span className="text-gray-900">
                  {new Date(item.due_date).toLocaleDateString(locale)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
