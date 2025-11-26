import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { PDFLocale } from './pdf-translations'
import {
  type QuotationPDFData,
  drawHeader,
  drawCustomerInfo,
  drawItemsTable,
  drawFinancialSummary,
  drawPaymentTerms,
  drawNotes,
  drawCompanySignature,
  A4_WIDTH,
  A4_HEIGHT,
} from './pdf-layout'

export type { QuotationPDFData }

export async function generateQuotationPDF(
  data: QuotationPDFData,
  locale: PDFLocale,
  fontBytes: ArrayBuffer
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const font = await pdfDoc.embedFont(fontBytes, { subset: true })

  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])

  let y = drawHeader(page, data, locale, font)

  y = drawCustomerInfo(page, data, y, locale, font)

  y = drawItemsTable(page, data, y, locale, font)

  y = drawFinancialSummary(page, data, y, locale, font)

  if (data.paymentTerms && data.paymentTerms.length > 0) {
    y = drawPaymentTerms(page, data.paymentTerms, y, locale, font, data.currency)
  }

  if (data.notes) {
    y = drawNotes(page, data.notes, y, locale, font)
  }

  if (data.companySignatureUrl) {
    await drawCompanySignature(pdfDoc, page, data.companySignatureUrl, y, locale, font)
  }

  return pdfDoc.save()
}
