'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { QuotationWithCustomer, PaymentTerm } from '@/hooks/useQuotations'
import type { QuotationPDFData } from '@/lib/pdf/quotation-pdf-generator'
import type { PDFLocale } from '@/lib/pdf/pdf-translations'

export function usePDFGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const fontBytesRef = useRef<ArrayBuffer | null>(null)
  const fontLoadingRef = useRef<Promise<ArrayBuffer> | null>(null)

  useEffect(() => {
    if (!fontLoadingRef.current) {
      fontLoadingRef.current = fetch('/fonts/NotoSansTC-Regular.ttf')
        .then((res) => res.arrayBuffer())
        .then((bytes) => {
          fontBytesRef.current = bytes
          return bytes
        })
        .catch((err) => {
          console.error('Failed to preload font:', err)
          throw err
        })
    }
  }, [])

  const generatePDF = useCallback(
    async (
      quotation: QuotationWithCustomer,
      paymentTerms: PaymentTerm[] | undefined,
      locale: PDFLocale
    ) => {
      setIsGenerating(true)
      setProgress(0)
      setError(null)

      try {
        setProgress(10)

        if (!fontBytesRef.current) {
          setProgress(20)
          if (fontLoadingRef.current) {
            await fontLoadingRef.current
          } else {
            const res = await fetch('/fonts/NotoSansTC-Regular.ttf')
            fontBytesRef.current = await res.arrayBuffer()
          }
        }
        setProgress(40)

        const { generateQuotationPDF } = await import(
          '@/lib/pdf/quotation-pdf-generator'
        )
        setProgress(60)

        const pdfData = mapQuotationToPDFData(quotation, paymentTerms)

        const pdfBytes = await generateQuotationPDF(
          pdfData,
          locale,
          fontBytesRef.current!
        )
        setProgress(90)

        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${quotation.quotation_number}_${locale}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setProgress(100)
      } catch (err) {
        console.error('PDF generation failed:', err)
        setError(err instanceof Error ? err : new Error('PDF 生成失敗'))
        throw err
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  return { generatePDF, isGenerating, progress, error }
}

function mapQuotationToPDFData(
  quotation: QuotationWithCustomer,
  paymentTerms: PaymentTerm[] | undefined
): QuotationPDFData {
  return {
    quotationNumber: quotation.quotation_number,
    issueDate: quotation.issue_date,
    validUntil: quotation.valid_until,
    customerName: quotation.customer_name || null,
    items: (quotation.items || []).map((item) => ({
      description:
        typeof item.description === 'string'
          ? { zh: item.description, en: item.description }
          : item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.subtotal,
    })),
    subtotal: quotation.subtotal,
    taxRate: quotation.tax_rate,
    taxAmount: quotation.tax_amount,
    totalAmount: quotation.total_amount,
    currency: quotation.currency,
    notes: quotation.notes
      ? typeof quotation.notes === 'string'
        ? { zh: quotation.notes, en: quotation.notes }
        : quotation.notes
      : null,
    paymentTerms: paymentTerms?.map((term) => ({
      termNumber: term.term_number,
      termName: term.term_name,
      percentage: term.percentage,
      amount: term.amount,
      dueDate: term.due_date,
    })),
    companyName: quotation.company_name
      ? typeof quotation.company_name === 'string'
        ? { zh: quotation.company_name, en: quotation.company_name }
        : quotation.company_name
      : null,
    companyLogoUrl: quotation.company_logo_url,
    companySignatureUrl: quotation.company_signature_url,
  }
}
