'use client'

import { useState, useRef, useEffect } from 'react'
import { usePDFDownload } from '@/lib/pdf/hooks/usePDFDownload'
import type { PDFDocumentProps, PDFLocale } from '@/lib/pdf/types'

interface PDFDownloadButtonProps {
  quotation: PDFDocumentProps['quotation']
  company: PDFDocumentProps['company']
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
}

const LOCALE_OPTIONS: { value: PDFLocale; labelZh: string; labelEn: string }[] = [
  { value: 'zh', labelZh: '中文版', labelEn: 'Chinese' },
  { value: 'en', labelZh: '英文版', labelEn: 'English' },
  { value: 'both', labelZh: '中英對照', labelEn: 'Bilingual' },
]

export function PDFDownloadButton({
  quotation,
  company,
  className = '',
  variant = 'default',
}: PDFDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { download, isLoading } = usePDFDownload({
    onError: (err) => {
      console.error('PDF download error:', err)
    },
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDownload = async (locale: PDFLocale) => {
    setIsOpen(false)
    await download({ quotation, company, locale })
  }

  const baseClasses = 'px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  const variantClasses = {
    default: 'bg-indigo-600 text-white hover:bg-indigo-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
  }

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`${baseClasses} ${variantClasses[variant]}`}
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        下載 PDF
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {LOCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleDownload(option.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {option.labelZh}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
