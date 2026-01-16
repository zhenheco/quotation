'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { QuotationWithCustomer, PaymentTerm } from '@/hooks/useQuotations'
import { parseNotes } from '@/lib/utils/notes-parser'
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

/**
 * 解析 notes 為雙語格式
 * 處理 JSON 字串、雙語物件、純字串等各種格式
 * 包含處理雙層巢狀的情況（物件內的值可能也是 JSON 字串）
 */
function parseNotesToBilingual(
  notes: unknown
): { zh: string; en: string } | null {
  if (!notes) return null

  // 如果是字串，先嘗試用 parseNotes 解析
  if (typeof notes === 'string') {
    const parsed = parseNotes(notes)
    if (parsed) {
      return { zh: parsed, en: parsed }
    }
    return null
  }

  // 如果是物件格式
  if (
    typeof notes === 'object' &&
    notes !== null &&
    'zh' in notes
  ) {
    const obj = notes as { zh: unknown; en?: unknown }

    // 處理 zh 值（可能是字串或 JSON 字串）
    let zhValue = ''
    if (typeof obj.zh === 'string') {
      // 使用 parseNotes 處理可能的 JSON 字串和換行符
      zhValue = parseNotes(obj.zh) || obj.zh
    }

    // 處理 en 值
    let enValue = zhValue
    if (obj.en && typeof obj.en === 'string') {
      enValue = parseNotes(obj.en) || obj.en
    }

    if (zhValue) {
      return { zh: zhValue, en: enValue }
    }
  }

  return null
}

function mapQuotationToPDFData(
  quotation: QuotationWithCustomer,
  paymentTerms: PaymentTerm[] | undefined
): QuotationPDFData {
  // 確保 items 是陣列
  const items = Array.isArray(quotation.items) ? quotation.items : []

  // 確保 customer_name 結構正確
  let customerName: { zh: string; en: string } | null = null
  if (quotation.customer_name) {
    if (typeof quotation.customer_name === 'object' && 'zh' in quotation.customer_name) {
      customerName = quotation.customer_name as { zh: string; en: string }
    } else if (typeof quotation.customer_name === 'string') {
      customerName = { zh: quotation.customer_name, en: quotation.customer_name }
    }
  }

  return {
    quotationNumber: quotation.quotation_number,
    issueDate: quotation.issue_date,
    validUntil: quotation.valid_until,
    customerName,
    items: items.map((item) => ({
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
    notes: parseNotesToBilingual(quotation.notes),
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
    bankName: quotation.company_bank_name || null,
    bankAccount: quotation.company_bank_account || null,
    bankCode: quotation.company_bank_code || null,
    passbookUrl: quotation.company_passbook_url || null,
  }
}
