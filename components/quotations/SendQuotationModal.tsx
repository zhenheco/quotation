'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { QuotationWithCustomer } from '@/hooks/useQuotations'

interface SendQuotationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { subject: string; content: string }) => Promise<void>
  quotation: QuotationWithCustomer | null
  locale: string
  isLoading?: boolean
  isBatch?: boolean
  selectedCount?: number
}

export default function SendQuotationModal({
  isOpen,
  onClose,
  onConfirm,
  quotation,
  locale,
  isLoading = false,
  isBatch = false,
  selectedCount = 0,
}: SendQuotationModalProps) {
  const t = useTranslations()

  const defaultSubject = quotation
    ? `${t('quotation.sendConfirm.defaultSubject')} ${quotation.quotation_number}`
    : t('quotation.sendConfirm.batchSubject')

  const defaultContent = locale === 'zh'
    ? `親愛的客戶，\n\n感謝您的詢價。請查看附件中的報價單。\n\n如有任何問題，歡迎隨時與我們聯繫。\n\n祝商祺`
    : `Dear Customer,\n\nThank you for your inquiry. Please find the quotation attached.\n\nIf you have any questions, please feel free to contact us.\n\nBest regards`

  const [subject, setSubject] = useState(defaultSubject)
  const [content, setContent] = useState(defaultContent)

  const handleConfirm = async () => {
    await onConfirm({ subject, content })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isBatch
              ? t('batch.sendConfirm.title')
              : t('quotation.sendConfirm.title')}
          </h3>
          {isBatch && (
            <p className="text-sm text-gray-600 mt-2">
              {t('batch.sendConfirm.description', { count: selectedCount })}
            </p>
          )}
        </div>

        {!isBatch && quotation && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">
                  {t('quotation.quotationNumber')}:
                </span>
                <span className="ml-2 text-gray-900">
                  {quotation.quotation_number}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">
                  {t('quotation.customer')}:
                </span>
                <span className="ml-2 text-gray-900">
                  {locale === 'zh'
                    ? quotation.customer_name?.zh
                    : quotation.customer_name?.en}
                </span>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-gray-700">
                  {t('quotation.sendConfirm.customerEmail')}:
                </span>
                <span className="ml-2 text-gray-900">
                  {quotation.customer_email}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('quotation.sendConfirm.emailSubject')}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('quotation.sendConfirm.emailContent')}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            {isLoading
              ? t('quotation.sendConfirm.sending')
              : t('quotation.sendConfirm.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
