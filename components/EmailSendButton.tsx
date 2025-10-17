'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface EmailSendButtonProps {
  quotationId: string
  recipientEmail: string
  locale: 'zh' | 'en'
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function EmailSendButton({
  quotationId,
  recipientEmail,
  locale,
  onSuccess,
  onError,
}: EmailSendButtonProps) {
  const t = useTranslations()
  const [isSending, setIsSending] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState(recipientEmail)
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [newCcEmail, setNewCcEmail] = useState('')
  const [selectedLocale, setSelectedLocale] = useState<'zh' | 'en'>(locale)

  const handleSend = async () => {
    if (!email) {
      onError?.(t('email.recipientRequired'))
      return
    }

    setIsSending(true)

    try {
      const response = await fetch(`/api/quotations/${quotationId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: email,
          locale: selectedLocale,
          ccEmails,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('email.sendFailed'))
      }

      setShowModal(false)
      onSuccess?.()

      // 顯示成功訊息
      alert(t('email.sendSuccess'))
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('email.sendFailed'))
    } finally {
      setIsSending(false)
    }
  }

  const addCcEmail = () => {
    if (newCcEmail && !ccEmails.includes(newCcEmail)) {
      setCcEmails([...ccEmails, newCcEmail])
      setNewCcEmail('')
    }
  }

  const removeCcEmail = (emailToRemove: string) => {
    setCcEmails(ccEmails.filter(e => e !== emailToRemove))
  }

  return (
    <>
      {/* 發送按鈕 */}
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        {t('email.sendQuotation')}
      </button>

      {/* Email 發送對話框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('email.sendQuotation')}</h3>

            {/* 主要收件人 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('email.recipient')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('email.enterEmail')}
              />
            </div>

            {/* 副本收件人 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('email.cc')} ({t('common.optional')})
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={newCcEmail}
                  onChange={(e) => setNewCcEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCcEmail()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('email.addCc')}
                />
                <button
                  onClick={addCcEmail}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  {t('common.add')}
                </button>
              </div>
              {ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ccEmails.map((ccEmail) => (
                    <span
                      key={ccEmail}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-sm"
                    >
                      {ccEmail}
                      <button
                        onClick={() => removeCcEmail(ccEmail)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 語言選擇 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('email.language')}
              </label>
              <select
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value as 'zh' | 'en')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="zh">{t('language.chinese')}</option>
                <option value="en">{t('language.english')}</option>
              </select>
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isSending}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSend}
                disabled={isSending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isSending && (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isSending ? t('email.sending') : t('common.send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}