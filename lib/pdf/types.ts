/**
 * PDF 生成相關的類型定義
 */

export interface QuotationPDFData {
  quotation: {
    id: string
    quotation_number: string
    issue_date: string
    valid_until: string
    status: 'draft' | 'sent' | 'accepted' | 'rejected'
    currency: string
    exchange_rate: number
    subtotal: number
    tax_rate: number
    tax_amount: number
    total_amount: number
    notes?: { zh: string; en: string } | null
  }
  customer: {
    name: { zh: string; en: string }
    email: string
    phone?: string | null
    address?: { zh: string; en: string } | null
  }
  items: Array<{
    id: string
    product: {
      name: { zh: string; en: string }
      description?: { zh: string; en: string } | null
    }
    quantity: number
    unit_price: number
    discount: number
    subtotal: number
  }>
  company?: {
    name: { zh: string; en: string }
    address?: { zh: string; en: string }
    phone?: string
    email?: string
    website?: string
  }
}

export interface PDFLanguage {
  locale: 'zh' | 'en'
  translations: {
    quotation: string
    quotationNumber: string
    issueDate: string
    validUntil: string
    customer: string
    customerInfo: string
    billTo: string
    itemDescription: string
    quantity: string
    unitPrice: string
    discount: string
    subtotal: string
    tax: string
    total: string
    notes: string
    status: {
      draft: string
      sent: string
      accepted: string
      rejected: string
    }
    footer: string
    page: string
    of: string
  }
}
