'use client'

import { useState, useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import { registerFonts } from '../fonts'
import { QuotationPDFDocument } from '../components/QuotationPDFDocument'
import type { PDFDocumentProps } from '../types'

interface UsePDFDownloadOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface UsePDFDownloadReturn {
  download: (props: PDFDocumentProps, filename?: string) => Promise<void>
  isLoading: boolean
  error: Error | null
}

export function usePDFDownload(options: UsePDFDownloadOptions = {}): UsePDFDownloadReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const download = useCallback(async (props: PDFDocumentProps, filename?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await registerFonts()

      const document = QuotationPDFDocument(props)
      const blob = await pdf(document).toBlob()

      const defaultFilename = `${props.quotation.quotation_number}_${props.locale === 'zh' ? '報價單' : 'quotation'}.pdf`
      const downloadFilename = filename || defaultFilename

      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = downloadFilename
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      URL.revokeObjectURL(url)

      options.onSuccess?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('PDF generation failed')
      setError(error)
      options.onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [options])

  return { download, isLoading, error }
}
