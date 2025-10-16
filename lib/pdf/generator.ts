/**
 * PDF 生成服務
 * 使用 @react-pdf/renderer 生成報價單 PDF
 */

import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import QuotationPDFTemplate from './QuotationPDFTemplate'

export interface QuotationPDFData {
  quotation: any
  items: any[]
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
