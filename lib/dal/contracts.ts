/**
 * 合約資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

export interface Contract {
  id: string
  user_id: string
  company_id: string | null
  customer_id: string
  quotation_id: string | null
  contract_number: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'expired'
  total_amount: number
  currency: string
  payment_collected: number
  created_at: string
  updated_at: string
}

export async function getContracts(
  db: SupabaseClient,
  userId: string,
  companyId?: string
): Promise<Contract[]> {
  let query = db
    .from('customer_contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get contracts: ${error.message}`)
  }

  return data || []
}

export async function getContractById(
  db: SupabaseClient,
  userId: string,
  contractId: string
): Promise<Contract | null> {
  const { data, error } = await db
    .from('customer_contracts')
    .select('*')
    .eq('id', contractId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get contract: ${error.message}`)
  }

  return data
}

export async function createContract(
  db: SupabaseClient,
  userId: string,
  data: Omit<Contract, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Contract> {
  const now = new Date().toISOString()

  const { data: contract, error } = await db
    .from('customer_contracts')
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      ...data,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create contract: ${error.message}`)
  }

  return contract
}

export interface ContractWithOverduePayments extends Contract {
  customer_name: string
  overdue_schedules_count: number
  total_overdue_amount: number
  oldest_overdue_days: number
}

export async function getContractsWithOverduePayments(
  db: SupabaseClient,
  userId: string
): Promise<ContractWithOverduePayments[]> {
  const { data: contracts, error } = await db
    .from('customer_contracts')
    .select(`
      *,
      customers (name),
      payment_schedules!inner (id, amount, paid_amount, due_date, status)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('payment_schedules.status', 'overdue')

  if (error) {
    throw new Error(`Failed to get contracts with overdue payments: ${error.message}`)
  }

  if (!contracts) return []

  const today = new Date()

  return contracts.map(contract => {
    const schedules = contract.payment_schedules as Array<{
      id: string
      amount: number
      paid_amount: number
      due_date: string
      status: string
    }>

    const overdueAmount = schedules.reduce(
      (sum, s) => sum + (s.amount - (s.paid_amount || 0)),
      0
    )

    const oldestDays = Math.max(
      ...schedules.map(s => {
        const dueDate = new Date(s.due_date)
        return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      })
    )

    const customerData = contract.customers as { name: { zh: string; en: string } | string } | null
    let customerName = ''
    if (customerData) {
      if (typeof customerData.name === 'string') {
        try {
          const parsed = JSON.parse(customerData.name)
          customerName = parsed.zh || parsed.en || ''
        } catch {
          customerName = customerData.name
        }
      } else {
        customerName = customerData.name.zh || customerData.name.en || ''
      }
    }

    return {
      ...contract,
      customers: undefined,
      payment_schedules: undefined,
      customer_name: customerName,
      overdue_schedules_count: schedules.length,
      total_overdue_amount: overdueAmount,
      oldest_overdue_days: oldestDays,
    } as ContractWithOverduePayments
  })
}

export interface PaymentProgress {
  contract_id: string
  total_amount: number
  total_paid: number
  total_remaining: number
  progress_percentage: number
  total_schedules: number
  paid_schedules: number
  pending_schedules: number
  overdue_schedules: number
  currency: string
}

export async function getContractPaymentProgress(
  db: SupabaseClient,
  userId: string,
  contractId: string
): Promise<PaymentProgress | null> {
  const contract = await getContractById(db, userId, contractId)
  if (!contract) return null

  const { data: schedules, error } = await db
    .from('payment_schedules')
    .select('status, amount, paid_amount')
    .eq('contract_id', contractId)

  if (error) {
    throw new Error(`Failed to get payment schedules: ${error.message}`)
  }

  const allSchedules = schedules || []
  const totalPaid = allSchedules.reduce((sum, s) => sum + (s.paid_amount || 0), 0)
  const totalRemaining = contract.total_amount - totalPaid
  const progressPercentage = contract.total_amount > 0
    ? Math.round((totalPaid / contract.total_amount) * 100)
    : 0

  return {
    contract_id: contract.id,
    total_amount: contract.total_amount,
    total_paid: totalPaid,
    total_remaining: totalRemaining,
    progress_percentage: progressPercentage,
    total_schedules: allSchedules.length,
    paid_schedules: allSchedules.filter(s => s.status === 'paid').length,
    pending_schedules: allSchedules.filter(s => s.status === 'pending').length,
    overdue_schedules: allSchedules.filter(s => s.status === 'overdue').length,
    currency: contract.currency,
  }
}

export async function generateContractNumber(
  db: SupabaseClient,
  userId: string
): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `C${year}`

  const { data } = await db
    .from('customer_contracts')
    .select('contract_number')
    .eq('user_id', userId)
    .like('contract_number', `${prefix}-%`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) {
    return `${prefix}-001`
  }

  const lastNumber = parseInt(data[0].contract_number.split('-')[1] || '0')
  const nextNumber = String(lastNumber + 1).padStart(3, '0')

  return `${prefix}-${nextNumber}`
}

export async function updateContractNextCollection(
  db: SupabaseClient,
  userId: string,
  contractId: string,
  data: {
    next_collection_date: string
    next_collection_amount: number
  }
): Promise<Contract> {
  const { data: contract, error } = await db
    .from('customer_contracts')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', contractId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update contract: ${error.message}`)
  }

  return contract
}
