/**
 * 付款資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

export interface Payment {
  id: string
  user_id: string
  quotation_id: string | null
  contract_id: string | null
  customer_id: string
  payment_type: 'deposit' | 'installment' | 'final' | 'full'
  payment_date: string
  amount: number
  currency: string
  payment_method: string | null
  reference_number: string | null
  receipt_url: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaymentFilters {
  customer_id?: string
  quotation_id?: string
  contract_id?: string
  status?: string
  payment_type?: string
  company_id?: string
}

export interface PaymentWithRelations extends Payment {
  customer?: {
    id: string
    company_name_zh: string
    company_name_en: string
  }
  quotation?: {
    id: string
    quotation_number: string
    total: number
  }
  contract?: {
    id: string
    contract_number: string
    total_amount: number
  }
}

export async function getPayments(
  db: SupabaseClient,
  userId: string,
  companyId?: string
): Promise<Payment[]> {
  let query = db
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('payment_date', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get payments: ${error.message}`)
  }

  return data || []
}

export async function getPaymentsWithFilters(
  db: SupabaseClient,
  userId: string,
  filters: PaymentFilters = {}
): Promise<Payment[]> {
  let query = db
    .from('payments')
    .select('*')
    .eq('user_id', userId)

  if (filters.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }
  if (filters.quotation_id) {
    query = query.eq('quotation_id', filters.quotation_id)
  }
  if (filters.contract_id) {
    query = query.eq('contract_id', filters.contract_id)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.payment_type) {
    query = query.eq('payment_type', filters.payment_type)
  }
  if (filters.company_id) {
    query = query.eq('company_id', filters.company_id)
  }

  query = query.order('payment_date', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get payments: ${error.message}`)
  }

  return data || []
}

export async function getPaymentsWithRelations(
  db: SupabaseClient,
  userId: string,
  filters: PaymentFilters = {}
): Promise<PaymentWithRelations[]> {
  let query = db
    .from('payments')
    .select(`
      *,
      customers!inner (id, name),
      quotations (id, quotation_number, total_amount),
      customer_contracts (id, contract_number, total_amount)
    `)
    .eq('user_id', userId)

  if (filters.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }
  if (filters.quotation_id) {
    query = query.eq('quotation_id', filters.quotation_id)
  }
  if (filters.contract_id) {
    query = query.eq('contract_id', filters.contract_id)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.payment_type) {
    query = query.eq('payment_type', filters.payment_type)
  }
  if (filters.company_id) {
    query = query.eq('company_id', filters.company_id)
  }

  query = query.order('payment_date', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get payments with relations: ${error.message}`)
  }

  return (data || []).map(row => {
    const customer = row.customers as { id: string; name: { zh: string; en: string } } | null
    const quotation = row.quotations as { id: string; quotation_number: string; total_amount: number } | null
    const contract = row.customer_contracts as { id: string; contract_number: string; total_amount: number } | null

    return {
      ...row,
      customers: undefined,
      quotations: undefined,
      customer_contracts: undefined,
      customer: customer ? {
        id: customer.id,
        company_name_zh: customer.name?.zh || '',
        company_name_en: customer.name?.en || '',
      } : undefined,
      quotation: quotation ? {
        id: quotation.id,
        quotation_number: quotation.quotation_number,
        total: quotation.total_amount,
      } : undefined,
      contract: contract ? {
        id: contract.id,
        contract_number: contract.contract_number,
        total_amount: contract.total_amount,
      } : undefined,
    }
  })
}

export async function getPaymentById(
  db: SupabaseClient,
  userId: string,
  paymentId: string
): Promise<Payment | null> {
  const { data, error } = await db
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get payment: ${error.message}`)
  }

  return data
}

export async function createPayment(
  db: SupabaseClient,
  userId: string,
  data: Omit<Payment, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Payment> {
  const now = new Date().toISOString()

  const { data: payment, error } = await db
    .from('payments')
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
    throw new Error(`Failed to create payment: ${error.message}`)
  }

  return payment
}

export interface CollectedPaymentFilters {
  customer_id?: string
  start_date?: string
  end_date?: string
  payment_type?: string
}

export interface PaymentSchedule {
  id: string
  user_id: string
  contract_id: string | null
  quotation_id: string | null
  customer_id: string
  schedule_number: number
  due_date: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paid_amount: number
  paid_date: string | null
  payment_id: string | null
  notes: string | null
  description: string | null
  source_type: 'quotation' | 'manual' | 'contract'
  created_at: string
  updated_at: string
}

export interface PaymentTerm {
  id: string
  quotation_id: string
  term_number: number
  term_name: string | null
  percentage: number
  amount: number
  due_date: string | null
  paid_amount: number
  paid_date: string | null
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  description: string | null
  created_at: string
  updated_at: string
}

export interface UnpaidPaymentFilters {
  customer_id?: string
  min_days_overdue?: number
}

export interface UnpaidPaymentWithDetails extends PaymentSchedule {
  customer_name: string
  contract_number: string
  contract_title: string
  days_overdue: number
}

export interface PaymentStatistics {
  current_month: {
    total_collected: number
    total_pending: number
    total_overdue: number
    total_receivable: number
    currency: string
  }
  current_year: {
    total_collected: number
    total_pending: number
    total_overdue: number
    currency: string
  }
  overdue: {
    count: number
    total_amount: number
    average_days: number
  }
}

export interface CurrentMonthReceivable {
  id: string
  schedule_number: number
  total_schedules: number
  customer_id: string
  customer_name_zh: string
  customer_name_en: string
  quotation_id: string | null
  quotation_number: string | null
  contract_id: string | null
  contract_number: string | null
  contract_title: string | null
  due_date: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'overdue'
  paid_date: string | null
  payment_id: string | null
  days_until_due: number
  is_overdue: boolean
  description: string | null
  source_type: 'quotation' | 'manual' | 'contract'
}

export interface CurrentMonthReceivablesSummary {
  total_count: number
  pending_count: number
  paid_count: number
  overdue_count: number
  total_amount: number
  pending_amount: number
  paid_amount: number
  overdue_amount: number
  currency: string
}

export async function getCollectedPayments(
  db: SupabaseClient,
  userId: string,
  filters: CollectedPaymentFilters = {}
): Promise<Payment[]> {
  let query = db
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'confirmed')

  if (filters.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }
  if (filters.start_date) {
    query = query.gte('payment_date', filters.start_date)
  }
  if (filters.end_date) {
    query = query.lte('payment_date', filters.end_date)
  }
  if (filters.payment_type) {
    query = query.eq('payment_type', filters.payment_type)
  }

  query = query.order('payment_date', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get collected payments: ${error.message}`)
  }

  return data || []
}

export async function getPaymentStatistics(
  db: SupabaseClient,
  userId: string
): Promise<PaymentStatistics> {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentYearStart = new Date(now.getFullYear(), 0, 1)
  const today = new Date().toISOString().split('T')[0]

  const [currentMonthResult, currentYearResult, overdueResult] = await Promise.all([
    db.from('payment_schedules')
      .select('status, amount, currency, due_date')
      .eq('user_id', userId)
      .gte('due_date', currentMonthStart.toISOString()),
    db.from('payment_schedules')
      .select('status, amount, currency, due_date')
      .eq('user_id', userId)
      .gte('due_date', currentYearStart.toISOString()),
    db.from('payment_schedules')
      .select('amount, due_date')
      .eq('user_id', userId)
      .eq('status', 'overdue'),
  ])

  if (currentMonthResult.error) {
    throw new Error(`Failed to get current month schedules: ${currentMonthResult.error.message}`)
  }
  if (currentYearResult.error) {
    throw new Error(`Failed to get current year schedules: ${currentYearResult.error.message}`)
  }
  if (overdueResult.error) {
    throw new Error(`Failed to get overdue schedules: ${overdueResult.error.message}`)
  }

  const currentMonthSchedules = currentMonthResult.data || []
  const currentYearSchedules = currentYearResult.data || []
  const overdueSchedules = overdueResult.data || []

  const currentMonthCollected = currentMonthSchedules
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentMonthPending = currentMonthSchedules
    .filter(p => p.status === 'pending' && p.due_date >= today)
    .reduce((sum, p) => sum + p.amount, 0)

  const currentMonthOverdue = currentMonthSchedules
    .filter(p => p.status === 'overdue' || (p.status === 'pending' && p.due_date < today))
    .reduce((sum, p) => sum + p.amount, 0)

  const currentYearCollected = currentYearSchedules
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentYearPending = currentYearSchedules
    .filter(p => p.status === 'pending' && p.due_date >= today)
    .reduce((sum, p) => sum + p.amount, 0)

  const currentYearOverdue = currentYearSchedules
    .filter(p => p.status === 'overdue' || (p.status === 'pending' && p.due_date < today))
    .reduce((sum, p) => sum + p.amount, 0)

  const currency = currentMonthSchedules.find(p => p.currency)?.currency || 'TWD'

  const overdueCount = overdueSchedules.length
  const overdueTotalAmount = overdueSchedules.reduce((sum, p) => sum + p.amount, 0)

  const todayDate = new Date()
  const overdueAverageDays = overdueCount > 0
    ? Math.floor(overdueSchedules.reduce((sum, p) => {
        const dueDate = new Date(p.due_date)
        return sum + Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      }, 0) / overdueCount)
    : 0

  return {
    current_month: {
      total_collected: currentMonthCollected,
      total_pending: currentMonthPending,
      total_overdue: currentMonthOverdue,
      total_receivable: currentMonthPending + currentMonthOverdue,
      currency,
    },
    current_year: {
      total_collected: currentYearCollected,
      total_pending: currentYearPending,
      total_overdue: currentYearOverdue,
      currency,
    },
    overdue: {
      count: overdueCount,
      total_amount: overdueTotalAmount,
      average_days: overdueAverageDays,
    },
  }
}

export async function getCurrentMonthReceivables(
  db: SupabaseClient,
  userId: string,
  month?: string
): Promise<{
  receivables: CurrentMonthReceivable[]
  summary: CurrentMonthReceivablesSummary
}> {
  const targetMonth = month || new Date().toISOString().slice(0, 7)
  const monthStart = `${targetMonth}-01`
  const nextMonth = new Date(`${targetMonth}-01`)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const monthEnd = nextMonth.toISOString().split('T')[0]

  const { data, error } = await db
    .from('payment_schedules')
    .select(`
      *,
      customers (id, name),
      customer_contracts (id, contract_number, title, quotation_id),
      quotations (id, quotation_number)
    `)
    .eq('user_id', userId)
    .gte('due_date', monthStart)
    .lt('due_date', monthEnd)
    .order('due_date')
    .order('schedule_number')

  if (error) {
    throw new Error(`Failed to get current month receivables: ${error.message}`)
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const receivables: CurrentMonthReceivable[] = (data || []).map(row => {
    const customer = row.customers as { id: string; name: { zh: string; en: string } } | null
    const contract = row.customer_contracts as { id: string; contract_number: string; title: string; quotation_id: string | null } | null
    const quotation = row.quotations as { id: string; quotation_number: string } | null

    const dueDate = new Date(row.due_date)
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isOverdue = row.due_date < todayStr && row.status === 'pending'

    return {
      id: row.id,
      schedule_number: row.schedule_number,
      total_schedules: 1,
      customer_id: row.customer_id,
      customer_name_zh: customer?.name?.zh || '',
      customer_name_en: customer?.name?.en || '',
      quotation_id: row.quotation_id || contract?.quotation_id || null,
      quotation_number: quotation?.quotation_number || null,
      contract_id: contract?.id || null,
      contract_number: contract?.contract_number || null,
      contract_title: contract?.title || null,
      due_date: row.due_date,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      paid_date: row.paid_date,
      payment_id: row.payment_id,
      days_until_due: daysUntilDue,
      is_overdue: isOverdue,
      description: row.description,
      source_type: row.source_type,
    }
  })

  const summary: CurrentMonthReceivablesSummary = {
    total_count: receivables.length,
    pending_count: receivables.filter(r => r.status === 'pending' && !r.is_overdue).length,
    paid_count: receivables.filter(r => r.status === 'paid').length,
    overdue_count: receivables.filter(r => r.status === 'overdue' || r.is_overdue).length,
    total_amount: receivables.reduce((sum, r) => sum + r.amount, 0),
    pending_amount: receivables.filter(r => r.status === 'pending' && !r.is_overdue).reduce((sum, r) => sum + r.amount, 0),
    paid_amount: receivables.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0),
    overdue_amount: receivables.filter(r => r.status === 'overdue' || r.is_overdue).reduce((sum, r) => sum + r.amount, 0),
    currency: receivables[0]?.currency || 'TWD',
  }

  return { receivables, summary }
}

export async function markScheduleAsCollected(
  db: SupabaseClient,
  userId: string,
  scheduleId: string,
  data: {
    payment_date: string
    amount?: number
    payment_method?: 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other'
    reference_number?: string
    notes?: string
  }
): Promise<{
  payment_schedule: PaymentSchedule
  payment: Payment | null
}> {
  const { data: schedule, error: scheduleError } = await db
    .from('payment_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .single()

  if (scheduleError && scheduleError.code !== 'PGRST116') {
    throw new Error(`Failed to get schedule: ${scheduleError.message}`)
  }

  if (!schedule) {
    throw new Error('Schedule not found')
  }

  // Debug: 僅開發環境輸出
  if (process.env.NODE_ENV === 'development') {
    console.log('[markScheduleAsCollected] Schedule state:', {
      scheduleId,
      status: schedule.status,
      paymentId: schedule.payment_id,
    })
  }

  if (schedule.status === 'paid') {
    throw new Error('Schedule already paid')
  }

  const now = new Date().toISOString()

  // 處理手動建立的收款單（沒有 quotation_id 和 contract_id）
  // 不需要建立 payment 記錄，直接更新 schedule 狀態
  if (!schedule.quotation_id && !schedule.contract_id) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[markScheduleAsCollected] Manual schedule, skipping payment creation')
    }

    const { error: updateError } = await db
      .from('payment_schedules')
      .update({
        status: 'paid',
        paid_date: data.payment_date,
        paid_amount: data.amount || schedule.amount,
        updated_at: now
      })
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .neq('status', 'paid')

    if (updateError) {
      throw new Error(`Failed to update schedule: ${updateError.message}`)
    }

    const { data: updatedSchedule, error: fetchError } = await db
      .from('payment_schedules')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !updatedSchedule) {
      throw new Error('Failed to update schedule')
    }

    return {
      payment_schedule: updatedSchedule,
      payment: null,
    }
  }

  let quotationId: string | null = schedule.quotation_id

  if (schedule.contract_id) {
    const { data: contract } = await db
      .from('customer_contracts')
      .select('quotation_id')
      .eq('id', schedule.contract_id)
      .single()

    if (contract?.quotation_id) {
      quotationId = contract.quotation_id
    }
  }

  const payment = await createPayment(db, userId, {
    quotation_id: quotationId,
    contract_id: schedule.contract_id,
    customer_id: schedule.customer_id,
    payment_type: 'installment',
    payment_date: data.payment_date,
    amount: data.amount || schedule.amount,
    currency: schedule.currency,
    payment_method: data.payment_method || null,
    reference_number: data.reference_number || null,
    receipt_url: null,
    status: 'confirmed',
    notes: data.notes || null,
  })

  const { error: updateError, count } = await db
    .from('payment_schedules')
    .update({
      status: 'paid',
      paid_date: data.payment_date,
      paid_amount: data.amount || schedule.amount,
      payment_id: payment.id,
      updated_at: now
    })
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .neq('status', 'paid')

  if (updateError) {
    throw new Error(`Failed to update schedule: ${updateError.message}`)
  }

  if (count === 0) {
    // 警告：競態條件偵測到孤立付款記錄
    if (process.env.NODE_ENV === 'development') {
      console.log('[markScheduleAsCollected] Race condition detected, deleting orphaned payment:', payment.id)
    }
    await db.from('payments').delete().eq('id', payment.id)
    throw new Error('Schedule already paid')
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[markScheduleAsCollected] Payment created and linked:', {
      paymentId: payment.id,
      scheduleId,
      updatedRows: count
    })
  }

  if (schedule.contract_id) {
    const { data: nextSchedule } = await db
      .from('payment_schedules')
      .select('*')
      .eq('contract_id', schedule.contract_id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('due_date')
      .limit(1)
      .single()

    if (nextSchedule) {
      await db
        .from('customer_contracts')
        .update({
          next_collection_date: nextSchedule.due_date,
          next_collection_amount: nextSchedule.amount,
          updated_at: now
        })
        .eq('id', schedule.contract_id)
    } else {
      await db
        .from('customer_contracts')
        .update({
          next_collection_date: null,
          next_collection_amount: null,
          updated_at: now
        })
        .eq('id', schedule.contract_id)
    }
  }

  const { data: updatedSchedule, error: fetchError } = await db
    .from('payment_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !updatedSchedule) {
    throw new Error('Failed to update schedule')
  }

  return {
    payment_schedule: updatedSchedule,
    payment,
  }
}

export async function getUnpaidPaymentSchedules(
  db: SupabaseClient,
  userId: string,
  filters: UnpaidPaymentFilters = {}
): Promise<UnpaidPaymentWithDetails[]> {
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)

  let query = db
    .from('payment_schedules')
    .select(`
      *,
      customers (name),
      customer_contracts!inner (contract_number, title, user_id)
    `)
    .eq('customer_contracts.user_id', userId)
    .eq('status', 'overdue')
    .lt('due_date', thirtyDaysAgo.toISOString().split('T')[0])

  if (filters.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }

  query = query.order('due_date')

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get unpaid payment schedules: ${error.message}`)
  }

  return (data || []).map(row => {
    const customer = row.customers as { name: { zh: string; en: string } } | null
    const contract = row.customer_contracts as { contract_number: string; title: string } | null

    const dueDate = new Date(row.due_date)
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (filters.min_days_overdue && daysOverdue < filters.min_days_overdue) {
      return null
    }

    return {
      ...row,
      customers: undefined,
      customer_contracts: undefined,
      customer_name: customer?.name?.zh || customer?.name?.en || '',
      contract_number: contract?.contract_number || '',
      contract_title: contract?.title || '',
      days_overdue: daysOverdue,
    }
  }).filter((item): item is UnpaidPaymentWithDetails => item !== null)
}

export async function markPaymentScheduleAsOverdue(
  db: SupabaseClient,
  userId: string,
  scheduleId: string
): Promise<PaymentSchedule | null> {
  const { data: schedule, error: fetchError } = await db
    .from('payment_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to get schedule: ${fetchError.message}`)
  }

  if (!schedule) {
    return null
  }

  const { error: updateError } = await db
    .from('payment_schedules')
    .update({
      status: 'overdue',
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (updateError) {
    throw new Error(`Failed to mark schedule as overdue: ${updateError.message}`)
  }

  const { data: updated } = await db
    .from('payment_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .single()

  return updated
}

export async function batchMarkOverduePaymentSchedules(
  db: SupabaseClient,
  userId: string
): Promise<{ updated_count: number; schedule_ids: string[] }> {
  const today = new Date().toISOString().split('T')[0]

  const { data: overdueSchedules, error: fetchError } = await db
    .from('payment_schedules')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('due_date', today)

  if (fetchError) {
    throw new Error(`Failed to get overdue schedules: ${fetchError.message}`)
  }

  if (!overdueSchedules || overdueSchedules.length === 0) {
    return { updated_count: 0, schedule_ids: [] }
  }

  const scheduleIds = overdueSchedules.map(s => s.id)

  const { error: updateError } = await db
    .from('payment_schedules')
    .update({
      status: 'overdue',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('due_date', today)

  if (updateError) {
    throw new Error(`Failed to batch update schedules: ${updateError.message}`)
  }

  return {
    updated_count: overdueSchedules.length,
    schedule_ids: scheduleIds,
  }
}

export async function getPaymentReminders(
  db: SupabaseClient,
  userId: string,
  daysAhead: number = 30
): Promise<Array<{
  contract_id: string
  contract_number: string
  contract_title: string
  customer_id: string
  customer_name: string
  next_collection_date: string
  next_collection_amount: number
  currency: string
  days_until_collection: number
  collection_status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming'
}>> {
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + daysAhead)

  const { data, error } = await db
    .from('customer_contracts')
    .select(`
      id,
      contract_number,
      title,
      customer_id,
      customers (name),
      payment_schedules!inner (due_date, amount, currency, status)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('payment_schedules.status', 'pending')
    .lte('payment_schedules.due_date', futureDate.toISOString().split('T')[0])
    .order('due_date', { referencedTable: 'payment_schedules' })

  if (error) {
    throw new Error(`Failed to get payment reminders: ${error.message}`)
  }

  return (data || []).map(row => {
    const customer = (row.customers as unknown) as { name: { zh: string; en: string } } | null
    const schedules = row.payment_schedules as Array<{ due_date: string; amount: number; currency: string }> | null
    const schedule = schedules?.[0]

    if (!schedule) return null

    const collectionDate = new Date(schedule.due_date)
    const daysUntilCollection = Math.floor((collectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let collectionStatus: 'overdue' | 'due_today' | 'due_soon' | 'upcoming'
    if (daysUntilCollection < 0) {
      collectionStatus = 'overdue'
    } else if (daysUntilCollection === 0) {
      collectionStatus = 'due_today'
    } else if (daysUntilCollection <= 7) {
      collectionStatus = 'due_soon'
    } else {
      collectionStatus = 'upcoming'
    }

    return {
      contract_id: row.id,
      contract_number: row.contract_number,
      contract_title: row.title,
      customer_id: row.customer_id,
      customer_name: customer?.name?.zh || customer?.name?.en || '',
      next_collection_date: schedule.due_date,
      next_collection_amount: schedule.amount,
      currency: schedule.currency,
      days_until_collection: daysUntilCollection,
      collection_status: collectionStatus,
    }
  }).filter((item): item is NonNullable<typeof item> => item !== null)
}

export async function recordPayment(
  db: SupabaseClient,
  userId: string,
  data: {
    customer_id: string
    quotation_id?: string
    contract_id?: string
    payment_type: 'deposit' | 'installment' | 'final' | 'full' | 'recurring'
    payment_date: string
    amount: number
    currency: string
    payment_method?: 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other'
    reference_number?: string
    notes?: string
    schedule_id?: string
  }
): Promise<Payment> {
  if (!data.quotation_id && !data.contract_id) {
    throw new Error('Either quotation_id or contract_id must be provided')
  }

  const payment = await createPayment(db, userId, {
    quotation_id: data.quotation_id || null,
    contract_id: data.contract_id || null,
    customer_id: data.customer_id,
    payment_type: data.payment_type as 'deposit' | 'installment' | 'final' | 'full',
    payment_date: data.payment_date,
    amount: data.amount,
    currency: data.currency,
    payment_method: data.payment_method || null,
    reference_number: data.reference_number || null,
    receipt_url: null,
    status: 'confirmed',
    notes: data.notes || null,
  })

  const now = new Date().toISOString()

  if (data.schedule_id) {
    await db
      .from('payment_schedules')
      .update({
        status: 'paid',
        paid_date: data.payment_date,
        payment_id: payment.id,
        paid_amount: data.amount,
        updated_at: now
      })
      .eq('id', data.schedule_id)
      .eq('user_id', userId)
  } else if (data.contract_id) {
    const { data: nextSchedule } = await db
      .from('payment_schedules')
      .select('*')
      .eq('contract_id', data.contract_id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('due_date')
      .limit(1)
      .single()

    if (nextSchedule) {
      await db
        .from('payment_schedules')
        .update({
          status: 'paid',
          paid_date: data.payment_date,
          payment_id: payment.id,
          paid_amount: data.amount,
          updated_at: now
        })
        .eq('id', nextSchedule.id)
        .eq('user_id', userId)
    }
  }

  if (data.contract_id) {
    const { data: nextUnpaid } = await db
      .from('payment_schedules')
      .select('*')
      .eq('contract_id', data.contract_id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('due_date')
      .limit(1)
      .single()

    if (nextUnpaid) {
      await db
        .from('customer_contracts')
        .update({
          next_collection_date: nextUnpaid.due_date,
          next_collection_amount: nextUnpaid.amount,
          updated_at: now
        })
        .eq('id', data.contract_id)
        .eq('user_id', userId)
    } else {
      await db
        .from('customer_contracts')
        .update({
          next_collection_date: null,
          next_collection_amount: null,
          updated_at: now
        })
        .eq('id', data.contract_id)
        .eq('user_id', userId)
    }
  }

  return payment
}

export async function syncQuotationToPaymentSchedules(
  db: SupabaseClient,
  userId: string,
  quotationId: string
): Promise<{ created: number; updated: number; schedules: PaymentSchedule[] }> {
  const { data: quotation, error: quotationError } = await db
    .from('quotations')
    .select('id, customer_id, currency, quotation_number')
    .eq('id', quotationId)
    .eq('user_id', userId)
    .single()

  if (quotationError && quotationError.code !== 'PGRST116') {
    throw new Error(`Failed to get quotation: ${quotationError.message}`)
  }

  if (!quotation) {
    throw new Error('Quotation not found')
  }

  const { data: paymentTerms, error: termsError } = await db
    .from('payment_terms')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('term_number')

  if (termsError) {
    throw new Error(`Failed to get payment terms: ${termsError.message}`)
  }

  if (!paymentTerms || paymentTerms.length === 0) {
    return { created: 0, updated: 0, schedules: [] }
  }

  const { data: existingSchedules, error: schedulesError } = await db
    .from('payment_schedules')
    .select('*')
    .eq('quotation_id', quotationId)
    .eq('user_id', userId)

  if (schedulesError) {
    throw new Error(`Failed to get existing schedules: ${schedulesError.message}`)
  }

  const existingMap = new Map((existingSchedules || []).map(s => [s.schedule_number, s]))
  const now = new Date().toISOString()

  let created = 0
  let updated = 0
  const schedules: PaymentSchedule[] = []

  for (const term of paymentTerms) {
    const existing = existingMap.get(term.term_number)

    if (existing) {
      if (
        existing.amount !== term.amount ||
        existing.due_date !== term.due_date ||
        existing.description !== term.term_name
      ) {
        const { error: updateError } = await db
          .from('payment_schedules')
          .update({
            amount: term.amount,
            due_date: term.due_date,
            description: term.term_name,
            updated_at: now
          })
          .eq('id', existing.id)
          .eq('user_id', userId)

        if (updateError) {
          throw new Error(`Failed to update schedule: ${updateError.message}`)
        }
        updated++
      }

      const { data: updatedSchedule } = await db
        .from('payment_schedules')
        .select('*')
        .eq('id', existing.id)
        .single()

      if (updatedSchedule) {
        schedules.push(updatedSchedule)
      }
    } else {
      const id = crypto.randomUUID()
      const { error: insertError } = await db
        .from('payment_schedules')
        .insert({
          id,
          user_id: userId,
          contract_id: null,
          quotation_id: quotationId,
          customer_id: quotation.customer_id,
          schedule_number: term.term_number,
          due_date: term.due_date,
          amount: term.amount,
          currency: quotation.currency,
          status: 'pending',
          paid_amount: 0,
          description: term.term_name,
          source_type: 'quotation',
          created_at: now,
          updated_at: now
        })

      if (insertError) {
        throw new Error(`Failed to insert schedule: ${insertError.message}`)
      }
      created++

      const { data: newSchedule } = await db
        .from('payment_schedules')
        .select('*')
        .eq('id', id)
        .single()

      if (newSchedule) {
        schedules.push(newSchedule)
      }
    }
  }

  const termNumbers = new Set(paymentTerms.map(t => t.term_number))
  for (const existing of existingSchedules || []) {
    if (!termNumbers.has(existing.schedule_number) && existing.status === 'pending') {
      await db
        .from('payment_schedules')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', userId)
    }
  }

  return { created, updated, schedules }
}

export async function createPaymentSchedule(
  db: SupabaseClient,
  userId: string,
  data: {
    customer_id: string
    quotation_id?: string
    due_date: string
    amount: number
    currency: string
    description?: string
    notes?: string
  }
): Promise<PaymentSchedule> {
  const { data: customer, error: customerError } = await db
    .from('customers')
    .select('id')
    .eq('id', data.customer_id)
    .eq('user_id', userId)
    .single()

  if (customerError && customerError.code !== 'PGRST116') {
    throw new Error(`Failed to verify customer: ${customerError.message}`)
  }

  if (!customer) {
    throw new Error('Customer not found')
  }

  if (data.quotation_id) {
    const { data: quotation, error: quotationError } = await db
      .from('quotations')
      .select('id')
      .eq('id', data.quotation_id)
      .eq('user_id', userId)
      .single()

    if (quotationError && quotationError.code !== 'PGRST116') {
      throw new Error(`Failed to verify quotation: ${quotationError.message}`)
    }

    if (!quotation) {
      throw new Error('Quotation not found')
    }
  }

  const { data: maxResult } = await db
    .from('payment_schedules')
    .select('schedule_number')
    .eq('user_id', userId)
    .eq('customer_id', data.customer_id)
    .eq('source_type', 'manual')
    .order('schedule_number', { ascending: false })
    .limit(1)
    .single()

  const scheduleNumber = (maxResult?.schedule_number || 0) + 1
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const { error: insertError } = await db
    .from('payment_schedules')
    .insert({
      id,
      user_id: userId,
      contract_id: null,
      quotation_id: data.quotation_id || null,
      customer_id: data.customer_id,
      schedule_number: scheduleNumber,
      due_date: data.due_date,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      paid_amount: 0,
      description: data.description || null,
      notes: data.notes || null,
      source_type: 'manual',
      created_at: now,
      updated_at: now
    })

  if (insertError) {
    throw new Error(`Failed to create payment schedule: ${insertError.message}`)
  }

  const { data: schedule, error: fetchError } = await db
    .from('payment_schedules')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !schedule) {
    throw new Error('Failed to create payment schedule')
  }

  return schedule
}

export async function getPaymentTermsByQuotation(
  db: SupabaseClient,
  quotationId: string
): Promise<PaymentTerm[]> {
  const { data, error } = await db
    .from('payment_terms')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('term_number')

  if (error) {
    throw new Error(`Failed to get payment terms: ${error.message}`)
  }

  return data || []
}

export async function updatePaymentSchedule(
  db: SupabaseClient,
  userId: string,
  scheduleId: string,
  data: {
    due_date?: string
    amount?: number
    currency?: string
    description?: string
    notes?: string
    status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
    customer_id?: string
    quotation_id?: string | null
    contract_id?: string | null
    paid_date?: string | null
    payment_id?: string | null
  }
): Promise<PaymentSchedule> {
  const { data: schedule, error: fetchError } = await db
    .from('payment_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to get schedule: ${fetchError.message}`)
  }

  if (!schedule) {
    throw new Error('Payment schedule not found')
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[updatePaymentSchedule] Schedule state:', {
      scheduleId,
      currentStatus: schedule.status,
      newStatus: data.status,
      paymentId: schedule.payment_id,
    })
  }

  if (
    schedule.status === 'paid' &&
    data.status !== undefined &&
    data.status !== 'paid' &&
    schedule.payment_id
  ) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[updatePaymentSchedule] Deleting payment:', schedule.payment_id)
    }
    const { error: deleteError } = await db
      .from('payments')
      .delete()
      .eq('id', schedule.payment_id)
    if (process.env.NODE_ENV === 'development') {
      console.log('[updatePaymentSchedule] Delete result:', { error: deleteError })
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (data.due_date !== undefined) updateData.due_date = data.due_date
  if (data.amount !== undefined) updateData.amount = data.amount
  if (data.currency !== undefined) updateData.currency = data.currency
  if (data.description !== undefined) updateData.description = data.description
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.status !== undefined) updateData.status = data.status
  if (data.customer_id !== undefined) updateData.customer_id = data.customer_id
  if (data.quotation_id !== undefined) updateData.quotation_id = data.quotation_id
  if (data.contract_id !== undefined) updateData.contract_id = data.contract_id
  if (data.paid_date !== undefined) updateData.paid_date = data.paid_date
  if (data.payment_id !== undefined) updateData.payment_id = data.payment_id

  const { error: updateError } = await db
    .from('payment_schedules')
    .update(updateData)
    .eq('id', scheduleId)
    .eq('user_id', userId)

  if (updateError) {
    throw new Error(`Failed to update payment schedule: ${updateError.message}`)
  }

  const { data: updated, error: refetchError } = await db
    .from('payment_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (refetchError || !updated) {
    throw new Error('Failed to update payment schedule')
  }

  return updated
}

export async function deletePaymentSchedule(
  db: SupabaseClient,
  userId: string,
  scheduleId: string
): Promise<void> {
  const { data: schedule, error: fetchError } = await db
    .from('payment_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to get schedule: ${fetchError.message}`)
  }

  if (!schedule) {
    throw new Error('Payment schedule not found')
  }

  if (schedule.status === 'paid') {
    throw new Error('Cannot delete a paid schedule')
  }

  const { error: deleteError } = await db
    .from('payment_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('user_id', userId)

  if (deleteError) {
    throw new Error(`Failed to delete payment schedule: ${deleteError.message}`)
  }
}

export async function getPaymentSchedules(
  db: SupabaseClient,
  userId: string,
  filters?: {
    customer_id?: string
    quotation_id?: string
    status?: string
    source_type?: string
    due_date_from?: string
    due_date_to?: string
  }
): Promise<PaymentSchedule[]> {
  let query = db
    .from('payment_schedules')
    .select('*')
    .eq('user_id', userId)

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }
  if (filters?.quotation_id) {
    query = query.eq('quotation_id', filters.quotation_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.source_type) {
    query = query.eq('source_type', filters.source_type)
  }
  if (filters?.due_date_from) {
    query = query.gte('due_date', filters.due_date_from)
  }
  if (filters?.due_date_to) {
    query = query.lte('due_date', filters.due_date_to)
  }

  query = query.order('due_date')

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get payment schedules: ${error.message}`)
  }

  return data || []
}
