/**
 * PDF 下載按鈕組件
 * 支援單語和雙語 PDF 下載
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface PDFDownloadButtonProps {
  quotationId: string
  locale: 'zh' | 'en'
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
  showLanguageOptions?: boolean
}

export default function PDFDownloadButton({
  quotationId,
  locale,
  className = '',
  variant = 'primary',
  showLanguageOptions = true,
}: PDFDownloadButtonProps) {
  const t = useTranslations()
  const [isDownloading, setIsDownloading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleDownload = async (downloadLocale: 'zh' | 'en', both = false) => {
    setIsDownloading(true)
    setShowMenu(false)

    try {
      const params = new URLSearchParams({
        locale: downloadLocale,
        both: both.toString(),
      })

      const response = await fetch(
        `/api/quotations/${quotationId}/pdf?${params.toString()}`,
        {
          method: 'GET',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      // 取得 blob 並下載
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${quotationId}-${downloadLocale}${both ? '-bilingual' : ''}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  const getButtonStyles = () => {
    const base =
      'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

    switch (variant) {
      case 'primary':
        return `${base} bg-blue-600 text-white hover:bg-blue-700`
      case 'secondary':
        return `${base} bg-gray-600 text-white hover:bg-gray-700`
      case 'outline':
        return `${base} border-2 border-blue-600 text-blue-600 hover:bg-blue-50`
      default:
        return base
    }
  }

  // 簡單版本：直接下載當前語言的 PDF
  if (!showLanguageOptions) {
    return (
      <button
        onClick={() => handleDownload(locale)}
        disabled={isDownloading}
        className={`${getButtonStyles()} ${className}`}
      >
        {isDownloading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
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
            <span>{t('common.downloading')}</span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{t('quotation.downloadPDF')}</span>
          </>
        )}
      </button>
    )
  }

  // 完整版本：顯示語言選擇下拉選單
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isDownloading}
        className={`${getButtonStyles()} ${className}`}
      >
        {isDownloading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
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
            <span>{t('common.downloading')}</span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{t('quotation.downloadPDF')}</span>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {showMenu && !isDownloading && (
        <>
          {/* 遮罩層，點擊關閉選單 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* 下拉選單 */}
          <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <button
                onClick={() => handleDownload('zh')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>🇹🇼</span>
                <span>{t('quotation.downloadChinesePDF')}</span>
              </button>
              <button
                onClick={() => handleDownload('en')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>🇬🇧</span>
                <span>{t('quotation.downloadEnglishPDF')}</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => handleDownload(locale, true)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>🌏</span>
                <span>{t('quotation.downloadBilingualPDF')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
