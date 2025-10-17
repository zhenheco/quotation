'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface ShareButtonProps {
  quotationId: string
  locale: 'zh' | 'en'
}

export default function ShareButton({ quotationId, locale }: ShareButtonProps) {
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isShared, setIsShared] = useState(false)
  const [shareInfo, setShareInfo] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 檢查分享狀態
  useEffect(() => {
    if (isOpen) {
      fetchShareStatus()
    }
  }, [isOpen])

  const fetchShareStatus = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/quotations/${quotationId}/share`)

      if (!response.ok) {
        throw new Error('Failed to fetch share status')
      }

      const data = await response.json()

      if (data.isShared) {
        setIsShared(true)
        setShareUrl(data.shareUrl)
        setShareInfo(data)
      } else {
        setIsShared(false)
        setShareUrl(null)
        setShareInfo(null)
      }
    } catch (err) {
      console.error('Error fetching share status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const generateShareLink = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/quotations/${quotationId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiresInDays: null, // 永久有效，如需過期設定天數
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate share link')
      }

      const data = await response.json()
      setShareUrl(data.shareUrl)
      setIsShared(true)
      setShareInfo(data)
    } catch (err) {
      console.error('Error generating share link:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const deactivateShareLink = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/quotations/${quotationId}/share`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to deactivate share link')
      }

      setShareUrl(null)
      setIsShared(false)
      setShareInfo(null)
    } catch (err) {
      console.error('Error deactivating share link:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert(t('share.copyFailed'))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (locale === 'zh') {
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  return (
    <>
      {/* 分享按鈕 */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {t('share.share')}
      </button>

      {/* 分享對話框 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景遮罩 */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsOpen(false)}
            />

            {/* 對話框 */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {t('share.shareQuotation')}
                    </h3>
                    <div className="mt-4">
                      {isLoading ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                        </div>
                      ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      ) : isShared && shareUrl ? (
                        <div className="space-y-4">
                          {/* 分享連結 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('share.shareLink')}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                              />
                              <button
                                onClick={copyToClipboard}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                {copied ? (
                                  <span className="inline-flex items-center gap-1">
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
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                    {t('share.copied')}
                                  </span>
                                ) : (
                                  t('share.copy')
                                )}
                              </button>
                            </div>
                          </div>

                          {/* 分享資訊 */}
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t('share.viewCount')}:</span>
                              <span className="text-gray-900 font-medium">
                                {shareInfo.viewCount || 0}
                              </span>
                            </div>
                            {shareInfo.lastViewedAt && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  {t('share.lastViewed')}:
                                </span>
                                <span className="text-gray-900 font-medium">
                                  {formatDate(shareInfo.lastViewedAt)}
                                </span>
                              </div>
                            )}
                            {shareInfo.expiresAt && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">{t('share.expiresAt')}:</span>
                                <span className="text-gray-900 font-medium">
                                  {formatDate(shareInfo.expiresAt)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 停用按鈕 */}
                          <button
                            onClick={deactivateShareLink}
                            disabled={isLoading}
                            className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('share.deactivate')}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            {t('share.description')}
                          </p>
                          <button
                            onClick={generateShareLink}
                            disabled={isLoading}
                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('share.generateLink')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:ml-3 sm:w-auto sm:text-sm cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
