/**
 * PDF 生成服務
 * 使用 @react-pdf/renderer 生成報價單 PDF
 */

import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import QuotationPDFTemplate from './QuotationPDFTemplate'

export interface QuotationPDFData {
  quotation: {
    quotation_number: string
    issue_date: string
    valid_until: string
    status: string
    currency: string
    subtotal: number
    tax_rate: number
    tax_amount: number
    total_amount: number
    notes?: { zh: string; en: string }
  }
  items: Array<{
    id: string
    product: {
      name: { zh: string; en: string }
      description?: { zh: string; en: string }
    }
    quantity: number
    unit_price: number
    discount: number
    subtotal: number
  }>
  customer?: {
    name: { zh: string; en: string }
    email: string
    phone?: string
    address?: { zh: string; en: string }
  }
  company?: {
    name: { zh: string; en: string }
    email?: string
    phone?: string
    address?: { zh: string; en: string }
  }
  locale: 'zh' | 'en'
}

/**
 * 生成報價單 PDF
 */
export async function generateQuotationPDF(data: QuotationPDFData): Promise<Blob> {
  const { quotation, items, locale } = data

  // 準備模板數據
  const templateData = {
    quotation,
    items,
    locale,
  }

  // 渲染 PDF 到 Buffer
  const pdfDoc = createElement(QuotationPDFTemplate, templateData)
  const pdfBuffer = await renderToBuffer(pdfDoc)

  // 轉換為 Blob
  return new Blob([pdfBuffer], { type: 'application/pdf' })
}

/**
 * 生成多個 PDF（批次匯出用）
 */
export async function generateMultiplePDFs(
  quotations: QuotationPDFData[]
): Promise<Blob[]> {
  const promises = quotations.map((data) => generateQuotationPDF(data))
  return Promise.all(promises)
}
