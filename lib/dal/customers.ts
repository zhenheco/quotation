/**
 * 客戶資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

export interface Customer {
  id: string
  user_id: string
  company_id: string | null
  name: { zh: string; en: string }
  email: string
  phone: string | null
  address: { zh: string; en: string } | null
  tax_id: string | null
  contact_person: { name: string; phone: string; email: string } | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getCustomers(
  db: SupabaseClient,
  userId: string,
  companyId?: string
): Promise<Customer[]> {
  let query = db
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get customers: ${error.message}`)
  }

  return data || []
}

export async function getCustomerById(
  db: SupabaseClient,
  userId: string,
  customerId: string
): Promise<Customer | null> {
  const { data, error } = await db
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get customer: ${error.message}`)
  }

  return data
}

export async function createCustomer(
  db: SupabaseClient,
  userId: string,
  data: {
    id?: string
    company_id?: string
    name: { zh: string; en: string }
    email: string
    phone?: string
    address?: { zh: string; en: string }
    tax_id?: string
    contact_person?: { name: string; phone: string; email: string }
    notes?: string
  }
): Promise<Customer> {
  const now = new Date().toISOString()

  const { data: customer, error } = await db
    .from('customers')
    .insert({
      id: data.id || crypto.randomUUID(),
      user_id: userId,
      company_id: data.company_id || null,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      tax_id: data.tax_id || null,
      contact_person: data.contact_person || null,
      notes: data.notes || null,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`)
  }

  return customer
}

export async function updateCustomer(
  db: SupabaseClient,
  userId: string,
  customerId: string,
  data: Partial<{
    name: { zh: string; en: string }
    email: string
    phone: string
    address: { zh: string; en: string }
    tax_id: string
    contact_person: { name: string; phone: string; email: string }
    notes: string
    company_id: string
  }>
): Promise<Customer> {
  const { data: customer, error } = await db
    .from('customers')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', customerId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update customer: ${error.message}`)
  }

  return customer
}

export async function deleteCustomer(
  db: SupabaseClient,
  userId: string,
  customerId: string
): Promise<void> {
  const { error, count } = await db
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete customer: ${error.message}`)
  }

  if (count === 0) {
    throw new Error('Customer not found or already deleted')
  }
}

export async function getCustomersByIds(
  db: SupabaseClient,
  userId: string,
  customerIds: string[]
): Promise<Map<string, Customer>> {
  if (customerIds.length === 0) {
    return new Map()
  }

  const uniqueIds = [...new Set(customerIds)]

  const { data, error } = await db
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`Failed to get customers: ${error.message}`)
  }

  const customerMap = new Map<string, Customer>()
  for (const customer of data || []) {
    customerMap.set(customer.id, customer)
  }

  return customerMap
}

export async function searchCustomers(
  db: SupabaseClient,
  userId: string,
  query: string,
  companyId?: string
): Promise<Customer[]> {
  let dbQuery = db
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (companyId) {
    dbQuery = dbQuery.eq('company_id', companyId)
  }

  const { data, error } = await dbQuery

  if (error) {
    throw new Error(`Failed to search customers: ${error.message}`)
  }

  return data || []
}
