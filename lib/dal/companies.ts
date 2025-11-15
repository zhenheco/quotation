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
  let name: { zh: string; en: string }
  try {
    name = JSON.parse(row.name)
    // 確保 name 有正確的結構
    if (!name || typeof name !== 'object') {
      name = { zh: '', en: '' }
    }
    name = {
      zh: name.zh || '',
      en: name.en || ''
    }
  } catch {
    name = { zh: '', en: '' }
  }

  let address: { zh: string; en: string } | null = null
  if (row.address) {
    try {
      address = JSON.parse(row.address)
    } catch {
      address = null
    }
  }

  return {
    ...row,
    name,
    address
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

export async function deleteCompany(
  db: D1Client,
  companyId: string
): Promise<void> {
  const result = await db.execute(
    'DELETE FROM companies WHERE id = ?',
    [companyId]
  )

  if (result.count === 0) {
    throw new Error('Company not found or already deleted')
  }
}

// Company Members

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role_id: string
  role_name?: string
  is_owner: number
  is_active: number
  joined_at: string
  updated_at: string
}

export async function getCompanyMembers(
  db: D1Client,
  companyId: string
): Promise<CompanyMember[]> {
  const sql = `
    SELECT
      cm.*,
      r.name as role_name
    FROM company_members cm
    LEFT JOIN roles r ON cm.role_id = r.id
    WHERE cm.company_id = ?
    ORDER BY cm.is_owner DESC, cm.joined_at ASC
  `

  return await db.query<CompanyMember>(sql, [companyId])
}

export async function getCompanyMember(
  db: D1Client,
  companyId: string,
  userId: string
): Promise<CompanyMember | null> {
  const sql = `
    SELECT
      cm.*,
      r.name as role_name
    FROM company_members cm
    LEFT JOIN roles r ON cm.role_id = r.id
    WHERE cm.company_id = ? AND cm.user_id = ?
  `

  return await db.queryOne<CompanyMember>(sql, [companyId, userId])
}

export async function addCompanyMember(
  db: D1Client,
  companyId: string,
  userId: string,
  roleIdOrName: string = 'owner'
): Promise<void> {
  let roleId = roleIdOrName

  if (roleIdOrName === 'owner' || roleIdOrName === 'member') {
    const role = await db.queryOne<{ id: string }>(
      'SELECT id FROM roles WHERE name = ?',
      [roleIdOrName === 'owner' ? 'company_owner' : 'salesperson']
    )
    if (role) {
      roleId = role.id
    }
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO company_members (id, company_id, user_id, role_id, is_owner, is_active, joined_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, companyId, userId, roleId, roleIdOrName === 'owner' ? 1 : 0, now, now]
  )
}

export async function updateCompanyMemberRole(
  db: D1Client,
  companyId: string,
  userId: string,
  newRoleId: string
): Promise<CompanyMember> {
  const now = new Date().toISOString()

  await db.execute(
    `UPDATE company_members
     SET role_id = ?, updated_at = ?
     WHERE company_id = ? AND user_id = ?`,
    [newRoleId, now, companyId, userId]
  )

  const member = await getCompanyMember(db, companyId, userId)
  if (!member) {
    throw new Error('Member not found after update')
  }

  return member
}

export async function removeCompanyMember(
  db: D1Client,
  companyId: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString()

  await db.execute(
    `UPDATE company_members
     SET is_active = 0, updated_at = ?
     WHERE company_id = ? AND user_id = ?`,
    [now, companyId, userId]
  )
}

export async function isCompanyMember(
  db: D1Client,
  companyId: string,
  userId: string
): Promise<boolean> {
  const member = await db.queryOne<{ id: string }>(
    'SELECT id FROM company_members WHERE company_id = ? AND user_id = ? AND is_active = 1',
    [companyId, userId]
  )

  return member !== null
}

export async function isCompanyOwner(
  db: D1Client,
  companyId: string,
  userId: string
): Promise<boolean> {
  const member = await db.queryOne<{ is_owner: number }>(
    'SELECT is_owner FROM company_members WHERE company_id = ? AND user_id = ? AND is_active = 1',
    [companyId, userId]
  )

  return member?.is_owner === 1
}

export interface CompanyStats {
  active_members: number
  total_customers: number
  total_quotations: number
  total_contracts?: number
  total_revenue?: number
}

export async function getCompanyStats(
  db: D1Client,
  companyId: string
): Promise<CompanyStats> {
  const statsResult = await db.query<{
    active_members: number
    total_customers: number
    total_quotations: number
  }>(`
    SELECT
      (SELECT COUNT(*) FROM company_members WHERE company_id = ? AND is_active = 1) as active_members,
      (SELECT COUNT(*) FROM customers WHERE company_id = ?) as total_customers,
      (SELECT COUNT(*) FROM quotations WHERE company_id = ?) as total_quotations
  `, [companyId, companyId, companyId])

  return statsResult[0] || {
    active_members: 0,
    total_customers: 0,
    total_quotations: 0
  }
}

export async function getManageableCompanies(
  db: D1Client,
  userId: string
): Promise<Company[]> {
  const isSuperAdminResult = await db.queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM user_roles ur
    INNER JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ? AND r.name = 'super_admin'
  `, [userId])

  const isSuperAdmin = isSuperAdminResult && isSuperAdminResult.count > 0

  let rows: CompanyRow[]

  if (isSuperAdmin) {
    rows = await db.query<CompanyRow>('SELECT * FROM companies ORDER BY created_at DESC')
  } else {
    const sql = `
      SELECT c.* FROM companies c
      INNER JOIN company_members cm ON c.id = cm.company_id
      WHERE cm.user_id = ? AND cm.is_active = 1 AND cm.is_owner = 1
      ORDER BY c.created_at DESC
    `
    rows = await db.query<CompanyRow>(sql, [userId])
  }

  return rows.map(parseCompanyRow)
}
