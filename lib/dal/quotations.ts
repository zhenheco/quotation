/**
 * 報價單資料存取層 (DAL)
 */

import { D1Client } from '@/lib/db/d1-client'
import type { BrandColors } from '@/types/brand.types'
import { DEFAULT_BRAND_COLORS } from '@/types/brand.types'

interface QuotationRow {
  id: string
  user_id: string
  company_id: string | null
  customer_id: string
  quotation_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'approved'
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes: string | null
  payment_method: string | null
  payment_notes: string | null
  created_at: string
  updated_at: string
}

interface CompanyBrandingRow {
  company_logo_url: string | null
  company_signature_url: string | null
  company_passbook_url: string | null
  company_name: string
  company_tax_id: string | null
  company_phone: string | null
  company_email: string | null
  company_website: string | null
  company_address: string | null
  company_bank_name: string | null
  company_bank_code: string | null
  company_bank_account: string | null
  company_brand_colors: string | null
}

interface QuotationItemRow {
  id: string
  quotation_id: string
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  created_at: string
  updated_at: string
}

export interface Quotation {
  id: string
  user_id: string
  company_id: string | null
  customer_id: string
  quotation_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'approved'
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
  company_brand_colors: BrandColors
}

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string | null
  description: { zh: string; en: string }
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  created_at: string
  updated_at: string
}

/**
 * 將資料庫行轉換為 Quotation 物件
 */
function parseQuotationRow(row: QuotationRow): Quotation {
  let notes: { zh: string; en: string } | null = null

  if (row.notes) {
    try {
      notes = JSON.parse(row.notes)
    } catch (error) {
      console.warn(`Invalid JSON in quotations.notes for id=${row.id}:`, error)
      notes = { zh: row.notes, en: row.notes }
    }
  }

  return {
    ...row,
    notes,
    payment_method: row.payment_method,
    payment_notes: row.payment_notes
  }
}

/**
 * 將資料庫行轉換為 QuotationItem 物件
 */
function parseQuotationItemRow(row: QuotationItemRow): QuotationItem {
  let description: { zh: string; en: string }

  try {
    description = JSON.parse(row.description)
  } catch (error) {
    console.warn(`Invalid JSON in quotation_items.description for id=${row.id}:`, error)
    description = { zh: row.description || '', en: row.description || '' }
  }

  return {
    ...row,
    description
  }
}

export async function getQuotations(
  db: D1Client,
  userId: string,
  companyId?: string,
  status?: Quotation['status']
): Promise<Quotation[]> {
  let sql = 'SELECT * FROM quotations WHERE user_id = ?'
  const params: unknown[] = [userId]

  if (companyId) {
    sql += ' AND company_id = ?'
    params.push(companyId)
  }

  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  sql += ' ORDER BY created_at DESC'

  const rows = await db.query<QuotationRow>(sql, params)
  return rows.map(parseQuotationRow)
}

export async function getQuotationById(
  db: D1Client,
  userId: string,
  quotationId: string
): Promise<QuotationWithCompany | null> {
  const sql = `
    SELECT
      q.*,
      c.logo_url as company_logo_url,
      c.signature_url as company_signature_url,
      c.passbook_url as company_passbook_url,
      c.name as company_name,
      c.tax_id as company_tax_id,
      c.phone as company_phone,
      c.email as company_email,
      c.website as company_website,
      c.address as company_address,
      c.bank_name as company_bank_name,
      c.bank_code as company_bank_code,
      c.bank_account as company_bank_account,
      c.brand_colors as company_brand_colors
    FROM quotations q
    LEFT JOIN companies c ON q.company_id = c.id
    WHERE q.id = ? AND q.user_id = ?
  `

  const row = await db.queryOne<QuotationRow & CompanyBrandingRow>(sql, [quotationId, userId])

  if (!row) return null

  const quotation = parseQuotationRow(row)

  let brandColors: BrandColors = DEFAULT_BRAND_COLORS
  if (row.company_brand_colors) {
    try {
      brandColors = JSON.parse(row.company_brand_colors) as BrandColors
    } catch {
      console.warn(`Invalid JSON in companies.brand_colors`)
    }
  }

  let companyAddress: { zh: string; en: string } | null = null
  if (row.company_address) {
    try {
      companyAddress = JSON.parse(row.company_address) as { zh: string; en: string }
    } catch {
      companyAddress = { zh: row.company_address, en: row.company_address }
    }
  }

  return {
    ...quotation,
    company_logo_url: row.company_logo_url,
    company_signature_url: row.company_signature_url,
    company_passbook_url: row.company_passbook_url,
    company_name: row.company_name ? JSON.parse(row.company_name) as { zh: string; en: string } : { zh: '', en: '' },
    company_tax_id: row.company_tax_id,
    company_phone: row.company_phone,
    company_email: row.company_email,
    company_website: row.company_website,
    company_address: companyAddress,
    company_bank_name: row.company_bank_name,
    company_bank_code: row.company_bank_code,
    company_bank_account: row.company_bank_account,
    company_brand_colors: brandColors,
  }
}

export async function createQuotation(
  db: D1Client,
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
    subtotal?: number
    tax_rate?: number
    tax_amount?: number
    total_amount?: number
    notes?: { zh: string; en: string }
    payment_method?: string
    payment_notes?: string
  }
): Promise<Quotation> {
  const id = data.id || crypto.randomUUID()
  const now = new Date().toISOString()

  console.log('[DAL] createQuotation - input data:', JSON.stringify(data, null, 2))
  console.log('[DAL] createQuotation - notes type:', typeof data.notes, data.notes)
  console.log('[DAL] createQuotation - notes serialized:', data.notes ? JSON.stringify(data.notes) : null)

  await db.execute(
    `INSERT INTO quotations (
      id, user_id, company_id, customer_id, quotation_number, status,
      issue_date, valid_until, currency, subtotal, tax_rate, tax_amount, total_amount,
      notes, payment_method, payment_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.company_id || null,
      data.customer_id,
      data.quotation_number,
      data.status || 'draft',
      data.issue_date,
      data.valid_until,
      data.currency,
      data.subtotal || 0,
      data.tax_rate || 5.0,
      data.tax_amount || 0,
      data.total_amount || 0,
      data.notes ? JSON.stringify(data.notes) : null,
      data.payment_method || null,
      data.payment_notes || null,
      now,
      now
    ]
  )

  const quotation = await getQuotationById(db, userId, id)
  if (!quotation) {
    throw new Error('Failed to create quotation')
  }

  return quotation
}

export async function updateQuotation(
  db: D1Client,
  userId: string,
  quotationId: string,
  data: Partial<Omit<Quotation, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Quotation> {
  const updates: string[] = []
  const params: unknown[] = []

  const simpleFields = [
    'company_id', 'customer_id', 'quotation_number', 'status',
    'issue_date', 'valid_until', 'currency', 'subtotal', 'tax_rate',
    'tax_amount', 'total_amount', 'payment_method', 'payment_notes'
  ]

  for (const field of simpleFields) {
    if (data[field as keyof typeof data] !== undefined) {
      updates.push(`${field} = ?`)
      params.push(data[field as keyof typeof data])
    }
  }

  if (data.notes !== undefined) {
    updates.push('notes = ?')
    params.push(data.notes ? JSON.stringify(data.notes) : null)
  }

  if (updates.length === 0) {
    const quotation = await getQuotationById(db, userId, quotationId)
    if (!quotation) {
      throw new Error('Quotation not found')
    }
    return quotation
  }

  updates.push('updated_at = ?')
  params.push(new Date().toISOString())

  params.push(quotationId, userId)

  await db.execute(
    `UPDATE quotations SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  )

  const quotation = await getQuotationById(db, userId, quotationId)
  if (!quotation) {
    throw new Error('Quotation not found after update')
  }

  return quotation
}

export async function deleteQuotation(
  db: D1Client,
  userId: string,
  quotationId: string
): Promise<void> {
  const result = await db.execute(
    'DELETE FROM quotations WHERE id = ? AND user_id = ?',
    [quotationId, userId]
  )

  if (result.count === 0) {
    throw new Error('Quotation not found or already deleted')
  }
}

// Quotation Items

export async function getQuotationItems(
  db: D1Client,
  quotationId: string
): Promise<QuotationItem[]> {
  const rows = await db.query<QuotationItemRow>(
    'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY created_at',
    [quotationId]
  )
  return rows.map(parseQuotationItemRow)
}

export async function createQuotationItem(
  db: D1Client,
  data: {
    id?: string
    quotation_id: string
    product_id?: string
    description: { zh: string; en: string }
    quantity: number
    unit_price: number
    discount?: number
    subtotal: number
  }
): Promise<QuotationItem> {
  const id = data.id || crypto.randomUUID()
  const now = new Date().toISOString()

  console.log('[DAL] createQuotationItem - input data:', JSON.stringify(data, null, 2))
  console.log('[DAL] createQuotationItem - description type:', typeof data.description, data.description)
  console.log('[DAL] createQuotationItem - description serialized:', JSON.stringify(data.description))

  await db.execute(
    `INSERT INTO quotation_items (
      id, quotation_id, product_id, description, quantity, unit_price, discount, subtotal, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.quotation_id,
      data.product_id || null,
      JSON.stringify(data.description),
      data.quantity,
      data.unit_price,
      data.discount || 0,
      data.subtotal,
      now,
      now
    ]
  )

  const row = await db.queryOne<QuotationItemRow>(
    'SELECT * FROM quotation_items WHERE id = ?',
    [id]
  )

  if (!row) {
    throw new Error('Failed to create quotation item')
  }

  return parseQuotationItemRow(row)
}

export async function deleteQuotationItem(
  db: D1Client,
  itemId: string
): Promise<void> {
  await db.execute('DELETE FROM quotation_items WHERE id = ?', [itemId])
}

/**
 * 生成報價單號碼
 */
export async function generateQuotationNumber(
  db: D1Client,
  userId: string
): Promise<string> {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const prefix = `QT${year}${month}`

  const lastQuotation = await db.queryOne<{ quotation_number: string }>(
    `SELECT quotation_number
     FROM quotations
     WHERE user_id = ? AND quotation_number LIKE ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, `${prefix}%`]
  )

  if (!lastQuotation) {
    return `${prefix}-0001`
  }

  const lastNumber = parseInt(lastQuotation.quotation_number.split('-')[1] || '0')
  const nextNumber = String(lastNumber + 1).padStart(4, '0')

  return `${prefix}-${nextNumber}`
}

/**
 * 驗證客戶所有權
 */
export async function validateCustomerOwnership(
  db: D1Client,
  customerId: string,
  userId: string
): Promise<boolean> {
  const customer = await db.queryOne<{ id: string }>(
    'SELECT id FROM customers WHERE id = ? AND user_id = ?',
    [customerId, userId]
  )

  return customer !== null
}
