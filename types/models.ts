/**
 * Database Models - Explicit type definitions
 *
 * 由於 database.types.ts 只有 placeholder 類型，
 * 這個檔案提供明確的模型類型定義
 */

export interface BilingualText {
  zh: string
  en: string
}

// ============================================================================
// Customer Types
// ============================================================================

export interface Customer {
  id: string
  user_id: string
  name: BilingualText
  email: string
  phone: string | null
  address: BilingualText | null
  tax_id: string | null
  contact_person: BilingualText | null
  created_at: string
  updated_at: string
}

export interface CreateCustomerData {
  user_id: string
  name: BilingualText
  email: string
  phone?: string | null
  address?: BilingualText | null
  tax_id?: string | null
  contact_person?: BilingualText | null
}

export interface UpdateCustomerData {
  name?: BilingualText
  email?: string
  phone?: string | null
  address?: BilingualText | null
  tax_id?: string | null
  contact_person?: BilingualText | null
}

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: string
  user_id: string
  sku: string
  name: BilingualText
  description: BilingualText | null
  unit_price: number
  currency: string
  category: string | null
  base_price: number
  base_currency: string
  cost_price: number | null
  cost_currency: string | null
  profit_margin: number | null
  supplier: string | null
  supplier_code: string | null
  created_at: string
  updated_at: string
}

export interface CreateProductData {
  user_id: string
  sku: string
  name: BilingualText
  description?: BilingualText | null
  unit_price: number
  currency: string
  category?: string | null
  base_price: number
  cost_price?: number | null
  cost_currency?: string | null
  profit_margin?: number | null
  supplier?: string | null
  supplier_code?: string | null
}

export interface UpdateProductData {
  sku?: string
  name?: BilingualText
  description?: BilingualText | null
  unit_price?: number
  currency?: string
  category?: string | null
  base_price?: number
  cost_price?: number | null
  cost_currency?: string | null
  profit_margin?: number | null
  supplier?: string | null
  supplier_code?: string | null
}

// ============================================================================
// Quotation Types
// ============================================================================

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'ach_transfer'
  | 'credit_card'
  | 'check'
  | 'cryptocurrency'
  | 'other'

export interface Quotation {
  id: string
  user_id: string
  quotation_number: string
  customer_id: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'approved'
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes: BilingualText | null
  payment_method: PaymentMethod | null
  payment_notes: string | null
  created_at: string
  updated_at: string
}

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string | null
  description: BilingualText
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  created_at: string
  updated_at: string
}

export interface CreateQuotationData {
  user_id: string
  quotation_number: string
  customer_id: string
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'approved'
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes?: BilingualText | null
  payment_method?: PaymentMethod | null
  payment_notes?: string | null
}

export interface CreateQuotationItemData {
  quotation_id: string
  product_id?: string
  description: BilingualText
  quantity: number
  unit_price: number
  discount?: number
  subtotal: number
}

export interface UpdateQuotationData {
  customer_id?: string
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'approved'
  issue_date?: string
  valid_until?: string
  currency?: string
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total_amount?: number
  notes?: BilingualText | null
  payment_method?: PaymentMethod | null
  payment_notes?: string | null
}

// ============================================================================
// Quotation Version Types
// ============================================================================

export interface QuotationVersion {
  id: string
  quotation_id: string
  version_number: number
  changed_by: string
  changed_at: string
  changes: Record<string, unknown>
}

// ============================================================================
// Exchange Rate Types
// ============================================================================

export interface ExchangeRate {
  from_currency: string
  to_currency: string
  rate: number
  updated_at: string
}

// ============================================================================
// Payment Term Types
// ============================================================================

export interface PaymentTerm {
  id: string
  quotation_id: string
  term_number: number
  term_name: string
  percentage: number
  amount: number
  due_date: string | null
  paid_amount: number | null
  paid_date: string | null
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  created_at: string
  updated_at: string
}

export interface CreatePaymentTermData {
  quotation_id: string
  term_name: string
  percentage: number
  amount: number
  due_date?: string | null
  status?: 'unpaid' | 'partial' | 'paid' | 'overdue'
}

export interface UpdatePaymentTermData {
  term_name?: string
  percentage?: number
  amount?: number
  due_date?: string | null
  paid_amount?: number | null
  paid_date?: string | null
  status?: 'unpaid' | 'partial' | 'paid' | 'overdue'
}

// ============================================================================
// Company Types
// ============================================================================

export interface Company {
  id: string
  user_id: string
  name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
  created_at: string
  updated_at: string
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export interface CreateCompanyData {
  user_id: string
  name: string
  logo_url?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  tax_id?: string | null
}

export interface UpdateCompanyData {
  name?: string
  logo_url?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  tax_id?: string | null
}
