import type { BrandColors } from '@/types/brand.types'

export type PDFLocale = 'zh' | 'en' | 'both'

export interface PDFCompany {
  name: { zh: string; en: string }
  logo_url: string | null
  signature_url: string | null
  passbook_url: string | null
  tax_id: string | null
  bank_name: string | null
  bank_account: string | null
  bank_code: string | null
  address: { zh: string; en: string } | null
  phone: string | null
  email: string | null
  website: string | null
  brand_colors: BrandColors
}

export interface PDFCustomer {
  name: string
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  contact_person: string | null
}

export interface PDFQuotationItem {
  description: { zh: string; en: string }
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}

export interface PDFQuotation {
  quotation_number: string
  status: string
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes: { zh: string; en: string } | null
  payment_method: string | null
  payment_notes: string | null
  items: PDFQuotationItem[]
  customer: PDFCustomer
}

export interface PDFDocumentProps {
  quotation: PDFQuotation
  company: PDFCompany
  locale: PDFLocale
}
