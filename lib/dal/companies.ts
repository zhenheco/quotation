/**
 * 公司資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

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

export async function getUserCompanies(
  db: SupabaseClient,
  userId: string
): Promise<Company[]> {
  const { data, error } = await db
    .from('companies')
    .select(`
      *,
      company_members!inner (user_id, is_active)
    `)
    .eq('company_members.user_id', userId)
    .eq('company_members.is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get companies: ${error.message}`)
  }

  return (data || []).map(company => ({
    ...company,
    company_members: undefined,
  }))
}

export async function getCompanyById(
  db: SupabaseClient,
  companyId: string
): Promise<Company | null> {
  const { data, error } = await db
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get company: ${error.message}`)
  }

  return data
}

export async function createCompany(
  db: SupabaseClient,
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
  const now = new Date().toISOString()

  const { data: company, error } = await db
    .from('companies')
    .insert({
      id: data.id || crypto.randomUUID(),
      name: data.name,
      logo_url: data.logo_url || null,
      signature_url: data.signature_url || null,
      passbook_url: data.passbook_url || null,
      tax_id: data.tax_id || null,
      bank_name: data.bank_name || null,
      bank_account: data.bank_account || null,
      bank_code: data.bank_code || null,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create company: ${error.message}`)
  }

  return company
}

export async function updateCompany(
  db: SupabaseClient,
  companyId: string,
  data: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>
): Promise<Company> {
  const { data: company, error } = await db
    .from('companies')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', companyId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update company: ${error.message}`)
  }

  return company
}

export async function deleteCompany(
  db: SupabaseClient,
  companyId: string
): Promise<void> {
  const { error, count } = await db
    .from('companies')
    .delete()
    .eq('id', companyId)

  if (error) {
    throw new Error(`Failed to delete company: ${error.message}`)
  }

  if (count === 0) {
    throw new Error('Company not found or already deleted')
  }
}

export interface UserProfile {
  full_name: string
  display_name: string
  email: string | null
  avatar_url: string | null
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role_id: string | null
  role_name?: string
  is_owner: boolean
  is_active: boolean
  joined_at: string
  updated_at: string
  user_profile?: UserProfile
}

export async function getCompanyMembers(
  db: SupabaseClient,
  companyId: string
): Promise<CompanyMember[]> {
  const { data: members, error } = await db
    .from('company_members')
    .select(`*, roles (name)`)
    .eq('company_id', companyId)
    .order('is_owner', { ascending: false })
    .order('joined_at')

  if (error) {
    throw new Error(`Failed to get company members: ${error.message}`)
  }

  if (!members || members.length === 0) return []

  const userIds = members.map(m => m.user_id)

  const { data: profiles } = await db
    .from('user_profiles')
    .select('user_id, full_name, display_name, email, avatar_url')
    .in('user_id', userIds)

  const profileMap = new Map(
    (profiles || []).map(p => [p.user_id, p as UserProfile])
  )

  const { data: authData } = await db.auth.admin.listUsers()
  const authUsers = authData?.users || []
  const authUserMap = new Map(
    authUsers.map(u => [u.id, {
      full_name: (u.user_metadata?.full_name || u.user_metadata?.name || '') as string,
      display_name: (u.user_metadata?.name || u.user_metadata?.full_name || '') as string,
      email: u.email || null,
      avatar_url: (u.user_metadata?.avatar_url || u.user_metadata?.picture || null) as string | null,
    }])
  )

  return members.map(member => {
    const profile = profileMap.get(member.user_id) || authUserMap.get(member.user_id)
    return {
      ...member,
      role_name: (member.roles as { name: string } | null)?.name,
      user_profile: profile,
      roles: undefined,
    }
  })
}

export async function getCompanyMember(
  db: SupabaseClient,
  companyId: string,
  userId: string
): Promise<CompanyMember | null> {
  const { data, error } = await db
    .from('company_members')
    .select(`
      *,
      roles (name)
    `)
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get company member: ${error.message}`)
  }

  if (!data) return null

  return {
    ...data,
    role_name: (data.roles as { name: string } | null)?.name,
    roles: undefined,
  }
}

export async function addCompanyMember(
  db: SupabaseClient,
  companyId: string,
  userId: string,
  roleId?: string,
  isOwner = false
): Promise<void> {
  const now = new Date().toISOString()

  const { error } = await db
    .from('company_members')
    .insert({
      id: crypto.randomUUID(),
      company_id: companyId,
      user_id: userId,
      role_id: roleId || null,
      is_owner: isOwner,
      is_active: true,
      joined_at: now,
      updated_at: now
    })

  if (error) {
    throw new Error(`Failed to add company member: ${error.message}`)
  }
}

export async function updateCompanyMemberRole(
  db: SupabaseClient,
  companyId: string,
  userId: string,
  newRoleId: string
): Promise<CompanyMember> {
  const { data, error } = await db
    .from('company_members')
    .update({
      role_id: newRoleId,
      updated_at: new Date().toISOString()
    })
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update company member role: ${error.message}`)
  }

  return data
}

export async function removeCompanyMember(
  db: SupabaseClient,
  companyId: string,
  userId: string
): Promise<void> {
  const { error } = await db
    .from('company_members')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('company_id', companyId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to remove company member: ${error.message}`)
  }
}

export async function isCompanyMember(
  db: SupabaseClient,
  companyId: string,
  userId: string
): Promise<boolean> {
  const { data } = await db
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  return data !== null
}

export async function isCompanyOwner(
  db: SupabaseClient,
  companyId: string,
  userId: string
): Promise<boolean> {
  const { data } = await db
    .from('company_members')
    .select('is_owner')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  return data?.is_owner === true
}

export interface CompanyStats {
  active_members: number
  total_customers: number
  total_quotations: number
}

export async function getCompanyStats(
  db: SupabaseClient,
  companyId: string
): Promise<CompanyStats> {
  const [membersResult, customersResult, quotationsResult] = await Promise.all([
    db.from('company_members').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
    db.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    db.from('quotations').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  ])

  return {
    active_members: membersResult.count || 0,
    total_customers: customersResult.count || 0,
    total_quotations: quotationsResult.count || 0,
  }
}

export async function getManageableCompanies(
  db: SupabaseClient,
  userId: string
): Promise<Company[]> {
  const { data: userRoles } = await db
    .from('user_roles')
    .select(`
      roles (name)
    `)
    .eq('user_id', userId)

  const isSuperAdmin = userRoles?.some(
    ur => ((ur.roles as unknown) as { name: string } | null)?.name === 'super_admin'
  )

  if (isSuperAdmin) {
    const { data, error } = await db
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get companies: ${error.message}`)
    }

    return data || []
  }

  const { data, error } = await db
    .from('companies')
    .select(`
      *,
      company_members!inner (user_id, is_owner, is_active)
    `)
    .eq('company_members.user_id', userId)
    .eq('company_members.is_active', true)
    .eq('company_members.is_owner', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get manageable companies: ${error.message}`)
  }

  return (data || []).map(company => ({
    ...company,
    company_members: undefined,
  }))
}
