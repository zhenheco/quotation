'use client'

import React from 'react'
import { safeToLocaleString } from '@/lib/utils/formatters'

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
  const paidPercentage = (totalPaid / totalAmount) * 100
  const pendingPercentage = (totalPending / totalAmount) * 100
  const overduePercentage = (totalOverdue / totalAmount) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">付款進度</span>
        <span className="font-semibold">{paymentCompletionRate.toFixed(1)}%</span>
      </div>

      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
        {paidPercentage > 0 && (
          <div
            className="bg-green-500 h-full"
            style={{ width: `${paidPercentage}%` }}
            title={`已收款: ${safeToLocaleString(totalPaid)} ${currency}`}
          />
        )}
        {overduePercentage > 0 && (
          <div
            className="bg-red-500 h-full"
            style={{ width: `${overduePercentage}%` }}
            title={`已逾期: ${safeToLocaleString(totalOverdue)} ${currency}`}
          />
        )}
        {pendingPercentage > 0 && (
          <div
            className="bg-yellow-400 h-full"
            style={{ width: `${pendingPercentage}%` }}
            title={`待收款: ${safeToLocaleString(totalPending)} ${currency}`}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">
            已收款: {safeToLocaleString(totalPaid)} {currency}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-gray-600">
            待收款: {safeToLocaleString(totalPending)} {currency}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">
            已逾期: {safeToLocaleString(totalOverdue)} {currency}
          </span>
        </div>
      </div>
    </div>
  )
}
