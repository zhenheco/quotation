import { PDFPage, PDFFont, rgb, PDFDocument } from 'pdf-lib'
import { pdfTranslations, type PDFLocale } from './pdf-translations'
import { formatAmount } from '@/lib/utils/formatters'

function toFullWidthNumbers(str: string): string {
  const halfToFull: Record<string, string> = {
    '0': '０', '1': '１', '2': '２', '3': '３', '4': '４',
    '5': '５', '6': '６', '7': '７', '8': '８', '9': '９',
    ',': '，', '.': '．', ' ': '　'
  }
  return str.split('').map(char => halfToFull[char] || char).join('')
}

function formatPDFNumber(value: number | undefined | null, currency: string): string {
  const amount = formatAmount(value, currency)
  return toFullWidthNumbers(amount)
}

function formatPDFAmount(value: number | undefined | null, currency: string): string {
  return `${currency}　${formatPDFNumber(value, currency)}`
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN_LEFT = 50
const MARGIN_RIGHT = 50
const MARGIN_TOP = 50
const MARGIN_BOTTOM = 50
const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

export interface QuotationPDFData {
  quotationNumber: string
  issueDate: string
  validUntil: string
  customerName: { zh: string; en: string } | null
  items: Array<{
    description: { zh: string; en: string }
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  currency: string
  notes?: { zh: string; en: string } | null
  paymentTerms?: Array<{
    termNumber: number
    termName?: string | null
    percentage: number
    amount: number
    dueDate?: string | null
  }>
  companyName?: { zh: string; en: string } | null
  companyLogoUrl?: string | null
  companySignatureUrl?: string | null
  bankName?: string | null
  bankAccount?: string | null
  bankCode?: string | null
  passbookUrl?: string | null
}

function formatDate(dateStr: string, locale: PDFLocale): string {
  const date = new Date(dateStr)
  if (locale === 'zh') {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export async function drawHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  data: QuotationPDFData,
  locale: PDFLocale,
  font: PDFFont
): Promise<number> {
  const t = pdfTranslations[locale]
  let y = A4_HEIGHT - MARGIN_TOP

  if (data.companyLogoUrl) {
    try {
      const response = await fetch(data.companyLogoUrl)
      const imageBytes = await response.arrayBuffer()

      let image
      if (data.companyLogoUrl.toLowerCase().includes('.png')) {
        image = await pdfDoc.embedPng(imageBytes)
      } else {
        image = await pdfDoc.embedJpg(imageBytes)
      }

      const maxWidth = 120
      const maxHeight = 60
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
      const width = image.width * scale
      const height = image.height * scale

      const logoX = (A4_WIDTH - width) / 2

      page.drawImage(image, {
        x: logoX,
        y: y - height,
        width,
        height,
      })

      y -= height + 15
    } catch (error) {
      console.error('Failed to load logo image:', error)
    }
  }

  const titleWidth = font.widthOfTextAtSize(t.title, 24)
  const titleX = (A4_WIDTH - titleWidth) / 2

  page.drawText(t.title, {
    x: titleX,
    y,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 35

  page.drawText(`${t.quotationNumber}: ${data.quotationNumber}`, {
    x: MARGIN_LEFT,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 18

  page.drawText(`${t.issueDate}: ${formatDate(data.issueDate, locale)}`, {
    x: MARGIN_LEFT,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  })

  page.drawText(`${t.validUntil}: ${formatDate(data.validUntil, locale)}`, {
    x: MARGIN_LEFT + 200,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 30

  return y
}

export function drawCustomerInfo(
  page: PDFPage,
  data: QuotationPDFData,
  startY: number,
  locale: PDFLocale,
  font: PDFFont
): number {
  const t = pdfTranslations[locale]
  let y = startY

  page.drawText(t.customer, {
    x: MARGIN_LEFT,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 18

  const customerName = data.customerName
    ? locale === 'zh'
      ? data.customerName.zh
      : data.customerName.en
    : '-'

  page.drawText(customerName, {
    x: MARGIN_LEFT,
    y,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 30

  return y
}

export function drawItemsTable(
  page: PDFPage,
  data: QuotationPDFData,
  startY: number,
  locale: PDFLocale,
  font: PDFFont
): number {
  const t = pdfTranslations[locale]
  let y = startY

  page.drawText(t.items, {
    x: MARGIN_LEFT,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 25

  const colWidths = [250, 60, 100, 100]
  const colX = [
    MARGIN_LEFT,
    MARGIN_LEFT + colWidths[0],
    MARGIN_LEFT + colWidths[0] + colWidths[1],
    MARGIN_LEFT + colWidths[0] + colWidths[1] + colWidths[2],
  ]

  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 5,
    width: CONTENT_WIDTH,
    height: 25,
    color: rgb(0.95, 0.95, 0.95),
  })

  const headers = [t.description, t.quantity, t.unitPrice, t.amount]
  headers.forEach((header, i) => {
    page.drawText(header, {
      x: colX[i] + 5,
      y: y + 3,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
  })
  y -= 25

  for (const item of data.items) {
    const description =
      locale === 'zh' ? item.description.zh : item.description.en

    const descLines = wrapText(description, 240, font, 10)
    const rowHeight = Math.max(20, descLines.length * 14 + 6)

    page.drawLine({
      start: { x: MARGIN_LEFT, y: y + 3 },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: y + 3 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    })

    descLines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: colX[0] + 5,
        y: y - 10 - lineIndex * 14,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      })
    })

    page.drawText(item.quantity.toString(), {
      x: colX[1] + 5,
      y: y - 10,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })

    page.drawText(formatPDFNumber(item.unitPrice, data.currency), {
      x: colX[2] + 5,
      y: y - 10,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })

    page.drawText(formatPDFNumber(item.subtotal, data.currency), {
      x: colX[3] + 5,
      y: y - 10,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })

    y -= rowHeight
  }

  return y - 10
}

export function drawFinancialSummary(
  page: PDFPage,
  data: QuotationPDFData,
  startY: number,
  locale: PDFLocale,
  font: PDFFont
): number {
  const t = pdfTranslations[locale]
  let y = startY
  const rightX = MARGIN_LEFT + CONTENT_WIDTH - 150

  page.drawText(`${t.subtotal}:`, {
    x: rightX,
    y,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  })
  page.drawText(formatPDFAmount(data.subtotal, data.currency), {
    x: rightX + 80,
    y,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 18

  page.drawText(`${t.tax} (${data.taxRate}%):`, {
    x: rightX,
    y,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  })
  page.drawText(formatPDFAmount(data.taxAmount, data.currency), {
    x: rightX + 80,
    y,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 22

  page.drawLine({
    start: { x: rightX, y: y + 8 },
    end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: y + 8 },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
  })

  page.drawText(`${t.total}:`, {
    x: rightX,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  })
  page.drawText(formatPDFAmount(data.totalAmount, data.currency), {
    x: rightX + 80,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 30

  return y
}

export function drawPaymentTerms(
  page: PDFPage,
  paymentTerms: QuotationPDFData['paymentTerms'],
  startY: number,
  locale: PDFLocale,
  font: PDFFont,
  currency: string
): number {
  if (!paymentTerms || paymentTerms.length === 0) return startY

  const t = pdfTranslations[locale]
  let y = startY

  page.drawText(t.paymentTerms, {
    x: MARGIN_LEFT,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 25

  const colWidths = [80, 100, 150, 150]
  const colX = [
    MARGIN_LEFT,
    MARGIN_LEFT + colWidths[0],
    MARGIN_LEFT + colWidths[0] + colWidths[1],
    MARGIN_LEFT + colWidths[0] + colWidths[1] + colWidths[2],
  ]

  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 5,
    width: 480,
    height: 22,
    color: rgb(0.95, 0.95, 0.95),
  })

  const headers = [t.termNumber, t.percentage, t.dueDate, t.termAmount]
  headers.forEach((header, i) => {
    page.drawText(header, {
      x: colX[i] + 5,
      y: y + 2,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    })
  })
  y -= 22

  for (const term of paymentTerms) {
    page.drawLine({
      start: { x: MARGIN_LEFT, y: y + 3 },
      end: { x: MARGIN_LEFT + 480, y: y + 3 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    })

    page.drawText(`${locale === 'zh' ? '第' : ''}${term.termNumber}${locale === 'zh' ? '期' : ''}`, {
      x: colX[0] + 5,
      y: y - 10,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    })

    page.drawText(`${term.percentage}%`, {
      x: colX[1] + 5,
      y: y - 10,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    })

    page.drawText(term.dueDate ? formatDate(term.dueDate, locale) : '-', {
      x: colX[2] + 5,
      y: y - 10,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    })

    page.drawText(formatPDFAmount(term.amount, currency), {
      x: colX[3] + 5,
      y: y - 10,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    })

    y -= 20
  }

  return y - 10
}

export function drawNotes(
  page: PDFPage,
  notes: { zh: string; en: string } | null | undefined,
  startY: number,
  locale: PDFLocale,
  font: PDFFont
): number {
  if (!notes) return startY

  const t = pdfTranslations[locale]
  let y = startY

  page.drawText(t.notes, {
    x: MARGIN_LEFT,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 18

  const noteText = locale === 'zh' ? notes.zh : notes.en
  if (noteText) {
    const lines = wrapText(noteText, CONTENT_WIDTH - 10, font, 10)
    for (const line of lines) {
      page.drawText(line, {
        x: MARGIN_LEFT,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      })
      y -= 14
    }
  }

  return y - 10
}

export async function drawBankInfo(
  pdfDoc: PDFDocument,
  page: PDFPage,
  data: QuotationPDFData,
  startY: number,
  locale: PDFLocale,
  font: PDFFont
): Promise<number> {
  const hasBankInfo = data.bankName || data.bankAccount || data.bankCode
  const hasPassbook = data.passbookUrl

  if (!hasBankInfo && !hasPassbook) return startY

  const t = pdfTranslations[locale]
  let y = startY

  page.drawText(t.bankInfo, {
    x: MARGIN_LEFT,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 20

  if (data.bankName) {
    page.drawText(`${t.bankName}: ${data.bankName}`, {
      x: MARGIN_LEFT,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
    y -= 16
  }

  if (data.bankAccount) {
    page.drawText(`${t.bankAccount}: ${data.bankAccount}`, {
      x: MARGIN_LEFT,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
    y -= 16
  }

  if (data.bankCode) {
    page.drawText(`${t.bankCode}: ${data.bankCode}`, {
      x: MARGIN_LEFT,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
    y -= 16
  }

  if (hasPassbook) {
    y -= 10

    try {
      const response = await fetch(data.passbookUrl!)
      const imageBytes = await response.arrayBuffer()

      let image
      if (data.passbookUrl!.toLowerCase().includes('.png')) {
        image = await pdfDoc.embedPng(imageBytes)
      } else {
        image = await pdfDoc.embedJpg(imageBytes)
      }

      const maxWidth = 200
      const maxHeight = 120
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
      const width = image.width * scale
      const height = image.height * scale

      page.drawImage(image, {
        x: MARGIN_LEFT,
        y: y - height,
        width,
        height,
      })

      y -= height + 10
    } catch (error) {
      console.error('Failed to load passbook image:', error)
    }
  }

  return y - 10
}

export async function drawCompanySignature(
  pdfDoc: PDFDocument,
  page: PDFPage,
  signatureUrl: string | null | undefined,
  startY: number,
  locale: PDFLocale,
  font: PDFFont
): Promise<number> {
  if (!signatureUrl) return startY

  const t = pdfTranslations[locale]
  let y = startY

  page.drawText(t.companySignature, {
    x: MARGIN_LEFT,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  })
  y -= 20

  try {
    const response = await fetch(signatureUrl)
    const imageBytes = await response.arrayBuffer()

    let image
    if (signatureUrl.toLowerCase().includes('.png')) {
      image = await pdfDoc.embedPng(imageBytes)
    } else {
      image = await pdfDoc.embedJpg(imageBytes)
    }

    const maxWidth = 150
    const maxHeight = 80
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
    const width = image.width * scale
    const height = image.height * scale

    page.drawImage(image, {
      x: MARGIN_LEFT,
      y: y - height,
      width,
      height,
    })

    y -= height + 10
  } catch (error) {
    console.error('Failed to load signature image:', error)
  }

  return y
}

function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number
): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }

    let currentLine = ''
    const chars = paragraph.split('')

    for (const char of chars) {
      const testLine = currentLine + char
      const width = font.widthOfTextAtSize(testLine, fontSize)

      if (width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}

export { A4_WIDTH, A4_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM }
