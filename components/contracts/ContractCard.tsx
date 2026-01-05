'use client'

import React from 'react'
import type { CustomerContractWithCustomer } from '@/types/extended.types'
import PaymentProgressBar from './PaymentProgressBar'
import { useContractProgress } from '@/hooks/useContracts'
import { safeToLocaleString } from '@/lib/utils/formatters'

// 合約狀態翻譯
const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: '進行中',
  expired: '已過期',
  terminated: '已終止',
  draft: '草稿',
}

// 付款條件翻譯
const PAYMENT_TERMS_LABELS: Record<string, string> = {
  monthly: '每月',
  quarterly: '每季',
  yearly: '每年',
  one_time: '一次性',
}

interface ContractCardProps {
  contract: CustomerContractWithCustomer
  locale: string
  onViewDetails?: () => void
  onRecordPayment?: () => void
  onSendReminder?: () => void
  onDelete?: () => void | Promise<void>
}

export default function ContractCard({
  contract,
  locale,
  onViewDetails,
  onRecordPayment,
  onSendReminder,
  onDelete,
}: ContractCardProps) {

  // Fetch payment progress for this contract
  const { data: progress } = useContractProgress(contract.id)

  const isOverdue = contract.status === 'active' && new Date(contract.end_date) < new Date()
  const daysOverdue = isOverdue
    ? Math.floor((new Date().getTime() - new Date(contract.end_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const customerName = locale === 'zh' ? contract.customer.company_name_zh : contract.customer.company_name_en

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
      isOverdue ? 'border-red-500' : contract.status === 'active' ? 'border-green-500' : 'border-gray-300'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{contract.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{customerName}</p>
          <p className="text-xs text-gray-500 mt-1">{contract.contract_number}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            contract.status === 'active' ? 'bg-green-100 text-green-800' :
            contract.status === 'expired' ? 'bg-gray-100 text-gray-800' :
            contract.status === 'terminated' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {CONTRACT_STATUS_LABELS[contract.status] || contract.status}
          </span>
          {isOverdue && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
              逾期天數: {daysOverdue}
            </span>
          )}
        </div>
      </div>

      {progress && (
        <PaymentProgressBar
          totalAmount={progress.total_amount}
          totalPaid={progress.total_paid}
          totalPending={progress.total_pending}
          totalOverdue={progress.total_overdue}
          currency={progress.currency}
          paymentCompletionRate={progress.payment_completion_rate}
        />
      )}

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
        <div>
          <p className="text-xs text-gray-500">簽約日期</p>
          <p className="text-sm font-medium">{new Date(contract.signed_date || contract.start_date).toLocaleDateString(locale)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">結束日期</p>
          <p className="text-sm font-medium">{new Date(contract.end_date).toLocaleDateString(locale)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">合約金額</p>
          <p className="text-sm font-medium">{safeToLocaleString(contract.total_amount)} {contract.currency}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">付款頻率</p>
          <p className="text-sm font-medium">
            {contract.payment_terms ? (PAYMENT_TERMS_LABELS[contract.payment_terms] || contract.payment_terms) : '-'}
          </p>
        </div>
      </div>

      {contract.next_collection_date && contract.next_collection_amount && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs font-medium text-blue-900 mb-1">下次收款</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {new Date(contract.next_collection_date).toLocaleDateString(locale)}
            </span>
            <span className="text-sm font-semibold text-blue-900">
              {safeToLocaleString(contract.next_collection_amount)} {contract.currency}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={onViewDetails}
          className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          查看詳情
        </button>
        {contract.status === 'active' && (
          <>
            <button
              onClick={onRecordPayment}
              className="flex-1 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              記錄收款
            </button>
            <button
              onClick={onSendReminder}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              發送提醒
            </button>
          </>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            刪除
          </button>
        )}
      </div>
    </div>
  )
}
