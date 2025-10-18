'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import type { CustomerContractWithCustomer } from '@/types/extended.types'
import PaymentProgressBar from './PaymentProgressBar'

interface ContractCardProps {
  contract: CustomerContractWithCustomer
  progress: any
  locale: string
  onViewDetails?: () => void
  onRecordPayment?: () => void
  onSendReminder?: () => void
}

export default function ContractCard({
  contract,
  progress,
  locale,
  onViewDetails,
  onRecordPayment,
  onSendReminder,
}: ContractCardProps) {
  const t = useTranslations()

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
            {t(`contracts.status.${contract.status}`)}
          </span>
          {isOverdue && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
              {t('contracts.overdue_days')}: {daysOverdue}
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
          <p className="text-xs text-gray-500">{t('contracts.signed_date')}</p>
          <p className="text-sm font-medium">{new Date(contract.signed_date || contract.start_date).toLocaleDateString(locale)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('contracts.end_date')}</p>
          <p className="text-sm font-medium">{new Date(contract.end_date).toLocaleDateString(locale)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('contracts.total_amount')}</p>
          <p className="text-sm font-medium">{contract.total_amount.toLocaleString()} {contract.currency}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('contracts.payment_frequency')}</p>
          <p className="text-sm font-medium">
            {contract.payment_terms ? t(`contracts.payment_terms.${contract.payment_terms}`) : '-'}
          </p>
        </div>
      </div>

      {contract.next_collection_date && contract.next_collection_amount && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs font-medium text-blue-900 mb-1">{t('contracts.next_collection')}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {new Date(contract.next_collection_date).toLocaleDateString(locale)}
            </span>
            <span className="text-sm font-semibold text-blue-900">
              {contract.next_collection_amount.toLocaleString()} {contract.currency}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={onViewDetails}
          className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          {t('contracts.view_details')}
        </button>
        {contract.status === 'active' && (
          <>
            <button
              onClick={onRecordPayment}
              className="flex-1 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              {t('contracts.record_payment')}
            </button>
            <button
              onClick={onSendReminder}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('contracts.send_reminder')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
