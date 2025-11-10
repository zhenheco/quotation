/**
 * 公司資料存取層 (DAL)
 */

import { D1Client } from '@/lib/db/d1-client'

export interface Company {
  id: string
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
  created_at: string
  updated_at: string
}

interface CompanyRow {
  id: string
  name: string
  logo_url: string | null
  signature_url: string | null
  passbook_url: string | null
  tax_id: string | null
  bank_name: string | null
  bank_account: string | null
  bank_code: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  created_at: string
  updated_at: string
}

function parseCompanyRow(row: CompanyRow): Company {
  return {
    ...row,
    name: JSON.parse(row.name),
    address: row.address ? JSON.parse(row.address) : null
  }
}

export async function getUserCompanies(
  db: D1Client,
  userId: string
): Promise<Company[]> {
  const sql = `
    SELECT c.* FROM companies c
    INNER JOIN company_members cm ON c.id = cm.company_id
    WHERE cm.user_id = ? AND cm.is_active = 1
    ORDER BY c.created_at DESC
  `

  const rows = await db.query<CompanyRow>(sql, [userId])
  return rows.map(parseCompanyRow)
}

export async function getCompanyById(
  db: D1Client,
  companyId: string
): Promise<Company | null> {
  const row = await db.queryOne<CompanyRow>(
    'SELECT * FROM companies WHERE id = ?',
    [companyId]
  )

  return row ? parseCompanyRow(row) : null
}

export async function createCompany(
  db: D1Client,
  data: {
    id?: string
    name: { zh: string; en: string }
    logo_url?: string
    signature_url?: string
    passbook_url?: string
    tax_id?: string
    bank_name?: string
    bank_account?: string
    bank_code?: string
    address?: { zh: string; en: string }
    phone?: string
    email?: string
    website?: string
  }
): Promise<Company> {
  const id = data.id || crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO companies (
      id, name, logo_url, signature_url, passbook_url, tax_id,
      bank_name, bank_account, bank_code, address, phone, email, website,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      JSON.stringify(data.name),
      data.logo_url || null,
      data.signature_url || null,
      data.passbook_url || null,
      data.tax_id || null,
      data.bank_name || null,
      data.bank_account || null,
      data.bank_code || null,
      data.address ? JSON.stringify(data.address) : null,
      data.phone || null,
      data.email || null,
      data.website || null,
      now,
      now
    ]
  )

  const company = await getCompanyById(db, id)
  if (!company) {
    throw new Error('Failed to create company')
  }

  return company
}

export async function updateCompany(
  db: D1Client,
  companyId: string,
  data: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>
): Promise<Company> {
  const updates: string[] = []
  const params: unknown[] = []

  if (data.name) {
    updates.push('name = ?')
    params.push(JSON.stringify(data.name))
  }
  if (data.address !== undefined) {
    updates.push('address = ?')
    params.push(data.address ? JSON.stringify(data.address) : null)
  }

  const simpleFields = [
    'logo_url', 'signature_url', 'passbook_url', 'tax_id',
    'bank_name', 'bank_account', 'bank_code', 'phone', 'email', 'website'
  ]

  for (const field of simpleFields) {
    if (data[field as keyof typeof data] !== undefined) {
      updates.push(`${field} = ?`)
      params.push(data[field as keyof typeof data])
    }
  }

  if (updates.length === 0) {
    const company = await getCompanyById(db, companyId)
    if (!company) {
      throw new Error('Company not found')
    }
    return company
  }

  updates.push('updated_at = ?')
  params.push(new Date().toISOString())
  params.push(companyId)

  await db.execute(
    `UPDATE companies SET ${updates.join(', ')} WHERE id = ?`,
    params
  )

  const company = await getCompanyById(db, companyId)
  if (!company) {
    throw new Error('Company not found after update')
  }

  return company
}
