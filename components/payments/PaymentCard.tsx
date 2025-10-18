'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import type { CollectedPaymentRecord, UnpaidPaymentRecord } from '@/types/extended.types'

interface CollectedPaymentCardProps {
  payment: CollectedPaymentRecord
  locale: string
}

export function CollectedPaymentCard({ payment, locale }: CollectedPaymentCardProps) {
  const t = useTranslations()
  const customerName = locale === 'zh' ? payment.customer_name_zh : payment.customer_name_en

  return (
    <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{customerName}</h4>
          {payment.related_number && (
            <p className="text-xs text-gray-500 mt-1">{payment.related_number}</p>
          )}
        </div>
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
          {payment.payment_type_display}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('payments.payment_date')}</span>
          <span className="font-medium">
            {new Date(payment.payment_date).toLocaleDateString(locale)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('payments.amount')}</span>
          <span className="font-semibold text-green-600">
            {payment.amount.toLocaleString()} {payment.currency}
          </span>
        </div>
        {payment.payment_frequency && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('payments.payment_frequency.title')}</span>
            <span className="text-gray-900">
              {t(`payments.payment_frequency.${payment.payment_frequency}`)}
            </span>
          </div>
        )}
        {payment.payment_method && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('payments.payment_method')}</span>
            <span className="text-gray-900">
              {t(`payments.payment_method.${payment.payment_method}`)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

interface UnpaidPaymentCardProps {
  payment: UnpaidPaymentRecord
  locale: string
  onRecordPayment: () => void
  onSendReminder: () => void
  onMarkOverdue: () => void
}

export function UnpaidPaymentCard({
  payment,
  locale,
  onRecordPayment,
  onSendReminder,
  onMarkOverdue,
}: UnpaidPaymentCardProps) {
  const t = useTranslations()
  const customerName = locale === 'zh' ? payment.customer_name_zh : payment.customer_name_en
  const isOverdue = payment.days_overdue > 0

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 p-4 ${
      isOverdue ? 'border-red-500' : 'border-yellow-400'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{customerName}</h4>
          <p className="text-xs text-gray-500 mt-1">{payment.contract_number}</p>
        </div>
        {isOverdue && (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
            {t('payments.overdue')}: {payment.days_overdue}d
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('payments.due_date')}</span>
          <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {new Date(payment.due_date).toLocaleDateString(locale)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('payments.amount')}</span>
          <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
            {payment.amount.toLocaleString()} {payment.currency}
          </span>
        </div>
        {payment.payment_terms && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('contracts.payment_frequency')}</span>
            <span className="text-gray-900">
              {t(`contracts.payment_terms.${payment.payment_terms}`)}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onRecordPayment}
          className="flex-1 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors"
        >
          {t('payments.record_payment')}
        </button>
        <button
          onClick={onSendReminder}
          className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
        >
          {t('payments.send_reminder')}
        </button>
        {!isOverdue && (
          <button
            onClick={onMarkOverdue}
            className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
          >
            {t('payments.mark_overdue')}
          </button>
        )}
      </div>
    </div>
  )
}
