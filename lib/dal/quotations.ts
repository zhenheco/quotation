/**
 * 報價單資料存取層 (DAL)
 */

import { D1Client } from '@/lib/db/d1-client'

export interface Quotation {
  id: string
  user_id: string
  company_id: string | null
  customer_id: string
  quotation_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string | null
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  created_at: string
  updated_at: string
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

  return await db.query<Quotation>(sql, params)
}

export async function getQuotationById(
  db: D1Client,
  userId: string,
  quotationId: string
): Promise<Quotation | null> {
  return await db.queryOne<Quotation>(
    'SELECT * FROM quotations WHERE id = ? AND user_id = ?',
    [quotationId, userId]
  )
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
    notes?: string
  }
): Promise<Quotation> {
  const id = data.id || crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO quotations (
      id, user_id, company_id, customer_id, quotation_number, status,
      issue_date, valid_until, currency, subtotal, tax_rate, tax_amount, total_amount,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.notes || null,
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

  const fields = [
    'company_id', 'customer_id', 'quotation_number', 'status',
    'issue_date', 'valid_until', 'currency', 'subtotal', 'tax_rate',
    'tax_amount', 'total_amount', 'notes'
  ]

  for (const field of fields) {
    if (data[field as keyof typeof data] !== undefined) {
      updates.push(`${field} = ?`)
      params.push(data[field as keyof typeof data])
    }
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
  return await db.query<QuotationItem>(
    'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY created_at',
    [quotationId]
  )
}

export async function createQuotationItem(
  db: D1Client,
  data: {
    id?: string
    quotation_id: string
    product_id?: string
    quantity: number
    unit_price: number
    discount?: number
    subtotal: number
  }
): Promise<QuotationItem> {
  const id = data.id || crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO quotation_items (
      id, quotation_id, product_id, quantity, unit_price, discount, subtotal, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.quotation_id,
      data.product_id || null,
      data.quantity,
      data.unit_price,
      data.discount || 0,
      data.subtotal,
      now,
      now
    ]
  )

  const item = await db.queryOne<QuotationItem>(
    'SELECT * FROM quotation_items WHERE id = ?',
    [id]
  )

  if (!item) {
    throw new Error('Failed to create quotation item')
  }

  return item
}

export async function deleteQuotationItem(
  db: D1Client,
  itemId: string
): Promise<void> {
  await db.execute('DELETE FROM quotation_items WHERE id = ?', [itemId])
}
