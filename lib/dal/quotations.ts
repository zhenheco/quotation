/**
 * 報價單資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

export interface Quotation {
  id: string
  user_id: string
  company_id: string | null
  customer_id: string
  quotation_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'approved' | 'expired'
  issue_date: string
  valid_until: string
  currency: string
  exchange_rate: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes: { zh: string; en: string } | null
  terms: { zh: string; en: string } | null
  sent_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
}

export interface QuotationWithCompany extends Quotation {
  company_logo_url: string | null
  company_signature_url: string | null
  company_passbook_url: string | null
  company_name: { zh: string; en: string }
  company_tax_id: string | null
  company_phone: string | null
  company_email: string | null
  company_website: string | null
  company_address: { zh: string; en: string } | null
  company_bank_name: string | null
  company_bank_code: string | null
  company_bank_account: string | null
}

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string | null
  description: { zh: string; en: string }
  quantity: number
  unit: string
  unit_price: number
  discount: number
  subtotal: number
  sort_order: number
  created_at: string
}

export async function getQuotations(
  db: SupabaseClient,
  userId: string,
  companyId?: string,
  status?: Quotation['status']
): Promise<Quotation[]> {
  let query = db
    .from('quotations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get quotations: ${error.message}`)
  }

  return data || []
}

export async function getQuotationById(
  db: SupabaseClient,
  userId: string,
  quotationId: string
): Promise<QuotationWithCompany | null> {
  const { data, error } = await db
    .from('quotations')
    .select(`
      *,
      companies (
        logo_url,
        name,
        tax_id,
        phone,
        email,
        website,
        address
      )
    `)
    .eq('id', quotationId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get quotation: ${error.message}`)
  }

  if (!data) return null

  const company = data.companies as {
    logo_url: string | null
    name: { zh: string; en: string }
    tax_id: string | null
    phone: string | null
    email: string | null
    website: string | null
    address: { zh: string; en: string } | null
  } | null

  return {
    ...data,
    companies: undefined,
    company_logo_url: company?.logo_url || null,
    company_signature_url: null,
    company_passbook_url: null,
    company_name: company?.name || { zh: '', en: '' },
    company_tax_id: company?.tax_id || null,
    company_phone: company?.phone || null,
    company_email: company?.email || null,
    company_website: company?.website || null,
    company_address: company?.address || null,
    company_bank_name: null,
    company_bank_code: null,
    company_bank_account: null,
  }
}

export async function createQuotation(
  db: SupabaseClient,
  userId: string,
  data: {
    id?: string
    company_id?: string
    customer_id: string
    quotation_number: string
    status?: Quotation['status']
    issue_date: string
    valid_until: string
    currency: string
    exchange_rate?: number
    subtotal?: number
    tax_rate?: number
    tax_amount?: number
    total_amount?: number
    notes?: { zh: string; en: string }
    terms?: { zh: string; en: string }
  }
): Promise<Quotation> {
  const now = new Date().toISOString()

  const { data: quotation, error } = await db
    .from('quotations')
    .insert({
      id: data.id || crypto.randomUUID(),
      user_id: userId,
      company_id: data.company_id || null,
      customer_id: data.customer_id,
      quotation_number: data.quotation_number,
      status: data.status || 'draft',
      issue_date: data.issue_date,
      valid_until: data.valid_until,
      currency: data.currency,
      exchange_rate: data.exchange_rate || 1,
      subtotal: data.subtotal || 0,
      tax_rate: data.tax_rate || 5.0,
      tax_amount: data.tax_amount || 0,
      total_amount: data.total_amount || 0,
      notes: data.notes || null,
      terms: data.terms || null,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create quotation: ${error.message}`)
  }

  return quotation
}

export async function updateQuotation(
  db: SupabaseClient,
  userId: string,
  quotationId: string,
  data: Partial<Omit<Quotation, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Quotation> {
  const { data: quotation, error } = await db
    .from('quotations')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', quotationId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update quotation: ${error.message}`)
  }

  return quotation
}

export async function deleteQuotation(
  db: SupabaseClient,
  userId: string,
  quotationId: string
): Promise<void> {
  const { error, count } = await db
    .from('quotations')
    .delete()
    .eq('id', quotationId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete quotation: ${error.message}`)
  }

  if (count === 0) {
    throw new Error('Quotation not found or already deleted')
  }
}

export async function getQuotationItems(
  db: SupabaseClient,
  quotationId: string
): Promise<QuotationItem[]> {
  const { data, error } = await db
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('sort_order')

  if (error) {
    throw new Error(`Failed to get quotation items: ${error.message}`)
  }

  return data || []
}

export async function createQuotationItem(
  db: SupabaseClient,
  data: {
    id?: string
    quotation_id: string
    product_id?: string
    description: { zh: string; en: string }
    quantity: number
    unit?: string
    unit_price: number
    discount?: number
    subtotal: number
    sort_order?: number
  }
): Promise<QuotationItem> {
  const now = new Date().toISOString()

  const { data: item, error } = await db
    .from('quotation_items')
    .insert({
      id: data.id || crypto.randomUUID(),
      quotation_id: data.quotation_id,
      product_id: data.product_id || null,
      description: data.description,
      quantity: data.quantity,
      unit: data.unit || 'piece',
      unit_price: data.unit_price,
      discount: data.discount || 0,
      subtotal: data.subtotal,
      sort_order: data.sort_order || 0,
      created_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create quotation item: ${error.message}`)
  }

  return item
}

export async function deleteQuotationItem(
  db: SupabaseClient,
  itemId: string
): Promise<void> {
  const { error } = await db
    .from('quotation_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    throw new Error(`Failed to delete quotation item: ${error.message}`)
  }
}

export async function generateQuotationNumber(
  db: SupabaseClient,
  userId: string
): Promise<string> {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const prefix = `QT${year}${month}`

  const { data } = await db
    .from('quotations')
    .select('quotation_number')
    .eq('user_id', userId)
    .like('quotation_number', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) {
    return `${prefix}-0001`
  }

  const lastNumber = parseInt(data[0].quotation_number.split('-')[1] || '0')
  const nextNumber = String(lastNumber + 1).padStart(4, '0')

  return `${prefix}-${nextNumber}`
}

export async function validateCustomerOwnership(
  db: SupabaseClient,
  customerId: string,
  userId: string
): Promise<boolean> {
  const { data } = await db
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .eq('user_id', userId)
    .single()

  return data !== null
}
