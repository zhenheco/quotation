'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

interface PaymentProgressBarProps {
  totalAmount: number
  totalPaid: number
  totalPending: number
  totalOverdue: number
  currency: string
  paymentCompletionRate: number
}

export default function PaymentProgressBar({
  totalAmount,
  totalPaid,
  totalPending,
  totalOverdue,
  currency,
  paymentCompletionRate,
}: PaymentProgressBarProps) {
  const t = useTranslations()

  const paidPercentage = (totalPaid / totalAmount) * 100
  const pendingPercentage = (totalPending / totalAmount) * 100
  const overduePercentage = (totalOverdue / totalAmount) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t('contracts.payment_progress')}</span>
        <span className="font-semibold">{paymentCompletionRate.toFixed(1)}%</span>
      </div>

      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
        {paidPercentage > 0 && (
          <div
            className="bg-green-500 h-full"
            style={{ width: `${paidPercentage}%` }}
            title={`${t('payments.received')}: ${totalPaid.toLocaleString()} ${currency}`}
          />
        )}
        {overduePercentage > 0 && (
          <div
            className="bg-red-500 h-full"
            style={{ width: `${overduePercentage}%` }}
            title={`${t('payments.overdue')}: ${totalOverdue.toLocaleString()} ${currency}`}
          />
        )}
        {pendingPercentage > 0 && (
          <div
            className="bg-yellow-400 h-full"
            style={{ width: `${pendingPercentage}%` }}
            title={`${t('payments.pending')}: ${totalPending.toLocaleString()} ${currency}`}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">
            {t('payments.received')}: {totalPaid.toLocaleString()} {currency}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-gray-600">
            {t('payments.pending')}: {totalPending.toLocaleString()} {currency}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">
            {t('payments.overdue')}: {totalOverdue.toLocaleString()} {currency}
          </span>
        </div>
      </div>
    </div>
  )
}
