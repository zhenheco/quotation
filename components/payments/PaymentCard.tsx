'use client'

import React from 'react'
import type { CollectedPaymentRecord, UnpaidPaymentRecord } from '@/types/extended.types'
import { safeToLocaleString } from '@/lib/utils/formatters'

// 付款頻率標籤
const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  one_time: '一次性',
  monthly: '每月',
  quarterly: '每季',
  semi_annually: '每半年',
  annually: '每年',
}

// 付款方式標籤
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: '現金',
  transfer: '轉帳',
  check: '支票',
  credit_card: '信用卡',
}

// 付款條款標籤
const PAYMENT_TERMS_LABELS: Record<string, string> = {
  net_30: '30 天內付款',
  net_60: '60 天內付款',
  net_90: '90 天內付款',
  due_on_receipt: '收到即付',
  monthly: '每月付款',
  quarterly: '每季付款',
}

interface CollectedPaymentCardProps {
  payment: CollectedPaymentRecord
}

export function CollectedPaymentCard({ payment }: CollectedPaymentCardProps) {
  // 固定使用繁體中文
  const locale = 'zh'
  const customerName = payment.customer_name_zh

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
          <span className="text-gray-600">付款日期</span>
          <span className="font-medium">
            {new Date(payment.payment_date).toLocaleDateString(locale)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">金額</span>
          <span className="font-semibold text-green-600">
            {safeToLocaleString(payment.amount)} {payment.currency}
          </span>
        </div>
        {payment.payment_frequency && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">付款頻率</span>
            <span className="text-gray-900">
              {PAYMENT_FREQUENCY_LABELS[payment.payment_frequency] || payment.payment_frequency}
            </span>
          </div>
        )}
        {payment.payment_method && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">付款方式</span>
            <span className="text-gray-900">
              {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

interface UnpaidPaymentCardProps {
  payment: UnpaidPaymentRecord
  onRecordPayment: () => void
  onSendReminder: () => void
  onMarkOverdue: () => void
}

export function UnpaidPaymentCard({
  payment,
  onRecordPayment,
  onSendReminder,
  onMarkOverdue,
}: UnpaidPaymentCardProps) {
  // 固定使用繁體中文
  const locale = 'zh'
  const customerName = payment.customer_name_zh
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
            逾期: {payment.days_overdue} 天
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">到期日</span>
          <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {new Date(payment.due_date).toLocaleDateString(locale)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">金額</span>
          <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
            {safeToLocaleString(payment.amount)} {payment.currency}
          </span>
        </div>
        {payment.payment_terms && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">付款頻率</span>
            <span className="text-gray-900">
              {PAYMENT_TERMS_LABELS[payment.payment_terms] || payment.payment_terms}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onRecordPayment}
          className="flex-1 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors"
        >
          記錄付款
        </button>
        <button
          onClick={onSendReminder}
          className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
        >
          發送提醒
        </button>
        {!isOverdue && (
          <button
            onClick={onMarkOverdue}
            className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
          >
            標記逾期
          </button>
        )}
      </div>
    </div>
  )
}
