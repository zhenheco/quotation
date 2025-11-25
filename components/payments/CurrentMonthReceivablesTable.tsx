'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
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

interface CurrentMonthReceivablesTableProps {
  locale: string
}

export function CurrentMonthReceivablesTable({ locale }: CurrentMonthReceivablesTableProps) {
  const t = useTranslations()
  const { data, isLoading, error } = useCurrentMonthReceivables()
  const markAsCollected = useMarkScheduleAsCollected()
  const updateSchedule = useUpdatePaymentSchedule()
  const deleteSchedule = useDeletePaymentSchedule()

  const [editingSchedule, setEditingSchedule] = useState<CurrentMonthReceivable | null>(null)
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null)

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
        toast.success(t('payments.uncollect_success'))
      } catch (error) {
        toast.error((error as Error).message || t('payments.uncollect_error'))
      }
    } else {
      try {
        await markAsCollected.mutateAsync({
          scheduleId: item.id,
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
  }

  const handleDelete = async (scheduleId: string) => {
    try {
      await deleteSchedule.mutateAsync(scheduleId)
      toast.success(t('payments.delete_success'))
      setDeletingScheduleId(null)
    } catch (error) {
      toast.error((error as Error).message || t('payments.delete_error'))
    }
  }

  const isPending = markAsCollected.isPending || updateSchedule.isPending || deleteSchedule.isPending

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
    <>
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
                  {t('payments.collection_status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.receivables.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={item.status === 'paid'}
                      onChange={() => handleCheckboxChange(item)}
                      disabled={isPending}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      aria-label={item.status === 'paid' ? t('payments.uncollect') : t('payments.mark_as_collected')}
                    />
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
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingSchedule(item)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title={t('payments.edit_schedule')}
                      >
                        {t('common.edit')}
                      </button>
                      {item.status !== 'paid' && (
                        <button
                          onClick={() => setDeletingScheduleId(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          title={t('payments.delete_schedule')}
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
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
              <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                <button
                  onClick={() => setEditingSchedule(item)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {t('common.edit')}
                </button>
                {item.status !== 'paid' && (
                  <button
                    onClick={() => setDeletingScheduleId(item.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingSchedule && (
        <EditPaymentScheduleModal
          schedule={editingSchedule}
          locale={locale}
          onClose={() => setEditingSchedule(null)}
        />
      )}

      {deletingScheduleId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('payments.delete_confirm_title')}</h3>
            <p className="text-gray-600 mb-6">{t('payments.delete_confirm_message')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingScheduleId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                disabled={deleteSchedule.isPending}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deletingScheduleId)}
                className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                disabled={deleteSchedule.isPending}
              >
                {deleteSchedule.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
