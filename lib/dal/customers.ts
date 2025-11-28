/**
 * 客戶資料存取層 (DAL)
 *
 * 功能：
 * 1. 所有函式強制 userId 參數（多租戶隔離）
 * 2. JSON 欄位自動序列化/反序列化
 * 3. TypeScript 類型安全
 * 4. 參數化查詢（防 SQL Injection）
 */

import { D1Client } from '@/lib/db/d1-client'

export interface Customer {
  id: string
  user_id: string
  company_id: string | null
  name: { zh: string; en: string }
  email: string
  phone: string | null
  address: { zh: string; en: string } | null
  tax_id: string | null
  contact_person: { zh: string; en: string } | null
  created_at: string
  updated_at: string
}

interface CustomerRow {
  id: string
  user_id: string
  company_id: string | null
  name: string
  email: string
  phone: string | null
  address: string | null
  tax_id: string | null
  contact_person: string | null
  created_at: string
  updated_at: string
}

/**
 * 將資料庫行轉換為 Customer 物件
 */
function parseCustomerRow(row: CustomerRow): Customer {
  return {
    ...row,
    name: JSON.parse(row.name),
    address: row.address ? JSON.parse(row.address) : null,
    contact_person: row.contact_person ? JSON.parse(row.contact_person) : null
  }
}

/**
 * 取得使用者的所有客戶
 */
export async function getCustomers(
  db: D1Client,
  userId: string,
  companyId?: string
): Promise<Customer[]> {
  let sql = 'SELECT * FROM customers WHERE user_id = ?'
  const params: unknown[] = [userId]

  if (companyId) {
    sql += ' AND company_id = ?'
    params.push(companyId)
  }

  sql += ' ORDER BY created_at DESC'

  const rows = await db.query<CustomerRow>(sql, params)
  return rows.map(parseCustomerRow)
}

/**
 * 根據 ID 取得單一客戶
 */
export async function getCustomerById(
  db: D1Client,
  userId: string,
  customerId: string
): Promise<Customer | null> {
  const row = await db.queryOne<CustomerRow>(
    'SELECT * FROM customers WHERE id = ? AND user_id = ?',
    [customerId, userId]
  )

  return row ? parseCustomerRow(row) : null
}

/**
 * 建立新客戶
 */
export async function createCustomer(
  db: D1Client,
  userId: string,
  data: {
    id?: string
    company_id?: string
    name: { zh: string; en: string }
    email: string
    phone?: string
    address?: { zh: string; en: string }
    tax_id?: string
    contact_person?: { zh: string; en: string }
  }
): Promise<Customer> {
  const id = data.id || crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO customers (
      id, user_id, company_id, name, email, phone, address, tax_id, contact_person, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.company_id || null,
      JSON.stringify(data.name),
      data.email,
      data.phone || null,
      data.address ? JSON.stringify(data.address) : null,
      data.tax_id || null,
      data.contact_person ? JSON.stringify(data.contact_person) : null,
      now,
      now
    ]
  )

  const customer = await getCustomerById(db, userId, id)
  if (!customer) {
    throw new Error('Failed to create customer')
  }

  return customer
}

/**
 * 更新客戶
 */
export async function updateCustomer(
  db: D1Client,
  userId: string,
  customerId: string,
  data: Partial<{
    name: { zh: string; en: string }
    email: string
    phone: string
    address: { zh: string; en: string }
    tax_id: string
    contact_person: { zh: string; en: string }
    company_id: string
  }>
): Promise<Customer> {
  const updates: string[] = []
  const params: unknown[] = []

  if (data.name) {
    updates.push('name = ?')
    params.push(JSON.stringify(data.name))
  }
  if (data.email !== undefined) {
    updates.push('email = ?')
    params.push(data.email)
  }
  if (data.phone !== undefined) {
    updates.push('phone = ?')
    params.push(data.phone)
  }
  if (data.address !== undefined) {
    updates.push('address = ?')
    params.push(data.address ? JSON.stringify(data.address) : null)
  }
  if (data.tax_id !== undefined) {
    updates.push('tax_id = ?')
    params.push(data.tax_id)
  }
  if (data.contact_person !== undefined) {
    updates.push('contact_person = ?')
    params.push(data.contact_person ? JSON.stringify(data.contact_person) : null)
  }
  if (data.company_id !== undefined) {
    updates.push('company_id = ?')
    params.push(data.company_id)
  }

  if (updates.length === 0) {
    const customer = await getCustomerById(db, userId, customerId)
    if (!customer) {
      throw new Error('Customer not found')
    }
    return customer
  }

  updates.push('updated_at = ?')
  params.push(new Date().toISOString())

  params.push(customerId, userId)

  await db.execute(
    `UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  )

  const customer = await getCustomerById(db, userId, customerId)
  if (!customer) {
    throw new Error('Customer not found after update')
  }

  return customer
}

/**
 * 刪除客戶
 */
export async function deleteCustomer(
  db: D1Client,
  userId: string,
  customerId: string
): Promise<void> {
  const result = await db.execute(
    'DELETE FROM customers WHERE id = ? AND user_id = ?',
    [customerId, userId]
  )

  if (result.count === 0) {
    throw new Error('Customer not found or already deleted')
  }
}

/**
 * 批量獲取客戶（解決 N+1 查詢問題）
 *
 * 用於一次獲取多個客戶資料，避免在迴圈中多次查詢資料庫
 */
export async function getCustomersByIds(
  db: D1Client,
  userId: string,
  customerIds: string[]
): Promise<Map<string, Customer>> {
  if (customerIds.length === 0) {
    return new Map()
  }

  // 移除重複的 ID
  const uniqueIds = [...new Set(customerIds)]

  // 建立佔位符
  const placeholders = uniqueIds.map(() => '?').join(',')

  const rows = await db.query<CustomerRow>(
    `SELECT * FROM customers WHERE user_id = ? AND id IN (${placeholders})`,
    [userId, ...uniqueIds]
  )

  // 轉換為 Map 方便查詢
  const customerMap = new Map<string, Customer>()
  for (const row of rows) {
    customerMap.set(row.id, parseCustomerRow(row))
  }

  return customerMap
}

/**
 * 搜尋客戶（依名稱或 Email）
 */
export async function searchCustomers(
  db: D1Client,
  userId: string,
  query: string,
  companyId?: string
): Promise<Customer[]> {
  let sql = `
    SELECT * FROM customers
    WHERE user_id = ?
    AND (email LIKE ? OR name LIKE ?)
  `
  const params: unknown[] = [userId, `%${query}%`, `%${query}%`]

  if (companyId) {
    sql += ' AND company_id = ?'
    params.push(companyId)
  }

  sql += ' ORDER BY created_at DESC LIMIT 50'

  const rows = await db.query<CustomerRow>(sql, params)
  return rows.map(parseCustomerRow)
}
