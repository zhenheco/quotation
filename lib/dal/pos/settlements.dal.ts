/**
 * POS 日結帳資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import { getSalesSummary } from './sales.dal'

// ============================================
// 類型定義
// ============================================

export type SettlementStatus = 'PENDING' | 'COUNTING' | 'VARIANCE' | 'APPROVED' | 'LOCKED'

export interface DailySettlement {
  id: string
  branch_id: string
  settlement_date: string
  total_sales: number
  transaction_count: number
  voided_count: number
  refunded_amount: number
  cash_amount: number
  card_amount: number
  deposit_used: number
  other_amount: number
  deposit_received: number
  expected_cash: number
  actual_cash: number | null
  cash_variance: number | null
  status: SettlementStatus
  variance_reason: string | null
  approved_by: string | null
  approved_at: string | null
  is_locked: boolean
  locked_at: string | null
  created_at: string
  created_by: string | null
  updated_at: string
}

export interface CreateSettlementInput {
  branch_id: string
  settlement_date: string
  deposit_received?: number
  created_by?: string
}

export interface UpdateSettlementInput {
  actual_cash?: number
  cash_variance?: number
  variance_reason?: string
  deposit_received?: number
  status?: SettlementStatus
}

export interface SettlementQueryOptions {
  branchId: string
  startDate?: string
  endDate?: string
  status?: SettlementStatus
  limit?: number
  offset?: number
}

// ============================================
// 查詢函數
// ============================================

/**
 * 取得日結帳列表
 */
export async function getSettlements(
  db: SupabaseClient,
  options: SettlementQueryOptions
): Promise<DailySettlement[]> {
  const { branchId, startDate, endDate, status, limit = 30, offset = 0 } = options

  let query = db
    .from('daily_settlements')
    .select('*')
    .eq('branch_id', branchId)
    .order('settlement_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (startDate) {
    query = query.gte('settlement_date', startDate)
  }

  if (endDate) {
    query = query.lte('settlement_date', endDate)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得日結帳列表失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得日結帳
 */
export async function getSettlementById(
  db: SupabaseClient,
  settlementId: string
): Promise<DailySettlement | null> {
  const { data, error } = await db
    .from('daily_settlements')
    .select('*')
    .eq('id', settlementId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得日結帳失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據日期取得日結帳
 */
export async function getSettlementByDate(
  db: SupabaseClient,
  branchId: string,
  date: string
): Promise<DailySettlement | null> {
  const { data, error } = await db
    .from('daily_settlements')
    .select('*')
    .eq('branch_id', branchId)
    .eq('settlement_date', date)
    .maybeSingle()

  if (error) {
    throw new Error(`取得日結帳失敗: ${error.message}`)
  }

  return data
}

/**
 * 檢查日期是否已結帳
 */
export async function isDateSettled(
  db: SupabaseClient,
  branchId: string,
  date: string
): Promise<boolean> {
  const settlement = await getSettlementByDate(db, branchId, date)
  return settlement !== null && settlement.status !== 'PENDING'
}

// ============================================
// 寫入函數
// ============================================

/**
 * 建立或取得日結帳
 */
export async function createOrGetSettlement(
  db: SupabaseClient,
  input: CreateSettlementInput
): Promise<DailySettlement> {
  // 檢查是否已存在
  const existing = await getSettlementByDate(db, input.branch_id, input.settlement_date)
  if (existing) {
    return existing
  }

  // 取得分店所屬租戶
  const { data: branch, error: branchError } = await db
    .from('branches')
    .select('tenant_id')
    .eq('id', input.branch_id)
    .single()

  if (branchError || !branch) {
    throw new Error('分店不存在')
  }

  // 計算銷售統計
  const summary = await getSalesSummary(
    db,
    branch.tenant_id,
    input.branch_id,
    input.settlement_date
  )

  // 取得當日儲值金額
  // 這裡簡化處理，實際應該從 member_deposits 計算
  const depositReceived = input.deposit_received || 0

  // 計算預期現金 = 現金收入 - 找零 + 儲值現金
  const expectedCash = summary.cashAmount

  const { data, error } = await db
    .from('daily_settlements')
    .insert({
      id: crypto.randomUUID(),
      branch_id: input.branch_id,
      settlement_date: input.settlement_date,
      total_sales: summary.totalSales,
      transaction_count: summary.transactionCount,
      voided_count: summary.voidedCount,
      refunded_amount: summary.refundedAmount,
      cash_amount: summary.cashAmount,
      card_amount: summary.cardAmount,
      deposit_used: summary.balanceUsed,
      other_amount: 0,
      deposit_received: depositReceived,
      expected_cash: expectedCash,
      status: 'PENDING',
      is_locked: false,
      created_by: input.created_by || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      // 競爭條件，重新取得
      return (await getSettlementByDate(db, input.branch_id, input.settlement_date))!
    }
    throw new Error(`建立日結帳失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新日結帳
 */
export async function updateSettlement(
  db: SupabaseClient,
  settlementId: string,
  input: UpdateSettlementInput
): Promise<DailySettlement> {
  const existing = await getSettlementById(db, settlementId)
  if (!existing) {
    throw new Error('日結帳不存在')
  }

  if (existing.is_locked) {
    throw new Error('日結帳已鎖定，無法修改')
  }

  const updateData: Record<string, unknown> = {}

  if (input.actual_cash !== undefined) {
    updateData.actual_cash = input.actual_cash
    updateData.cash_variance = input.actual_cash - existing.expected_cash
    updateData.status = Math.abs(input.actual_cash - existing.expected_cash) > 0 ? 'VARIANCE' : 'COUNTING'
  }

  if (input.variance_reason !== undefined) {
    updateData.variance_reason = input.variance_reason
  }

  if (input.deposit_received !== undefined) {
    updateData.deposit_received = input.deposit_received
  }

  if (input.status !== undefined) {
    updateData.status = input.status
  }

  const { data, error } = await db
    .from('daily_settlements')
    .update(updateData)
    .eq('id', settlementId)
    .select()
    .single()

  if (error) {
    throw new Error(`更新日結帳失敗: ${error.message}`)
  }

  return data
}

/**
 * 盤點現金
 */
export async function countCash(
  db: SupabaseClient,
  settlementId: string,
  actualCash: number
): Promise<DailySettlement> {
  const existing = await getSettlementById(db, settlementId)
  if (!existing) {
    throw new Error('日結帳不存在')
  }

  if (existing.is_locked) {
    throw new Error('日結帳已鎖定，無法盤點')
  }

  const variance = actualCash - existing.expected_cash
  const hasVariance = Math.abs(variance) > 0.01

  const { data, error } = await db
    .from('daily_settlements')
    .update({
      actual_cash: actualCash,
      cash_variance: variance,
      status: hasVariance ? 'VARIANCE' : 'COUNTING',
    })
    .eq('id', settlementId)
    .select()
    .single()

  if (error) {
    throw new Error(`盤點現金失敗: ${error.message}`)
  }

  return data
}

/**
 * 審核日結帳
 */
export async function approveSettlement(
  db: SupabaseClient,
  settlementId: string,
  approvedBy: string,
  varianceReason?: string
): Promise<DailySettlement> {
  const existing = await getSettlementById(db, settlementId)
  if (!existing) {
    throw new Error('日結帳不存在')
  }

  if (existing.is_locked) {
    throw new Error('日結帳已鎖定')
  }

  if (existing.actual_cash === null) {
    throw new Error('請先盤點現金')
  }

  // 如果有差異但沒有說明原因
  if (existing.cash_variance && Math.abs(existing.cash_variance) > 0.01 && !varianceReason) {
    throw new Error('有現金差異，請說明原因')
  }

  const { data, error } = await db
    .from('daily_settlements')
    .update({
      status: 'APPROVED',
      variance_reason: varianceReason || existing.variance_reason,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', settlementId)
    .select()
    .single()

  if (error) {
    throw new Error(`審核日結帳失敗: ${error.message}`)
  }

  return data
}

/**
 * 鎖定日結帳
 */
export async function lockSettlement(
  db: SupabaseClient,
  settlementId: string
): Promise<DailySettlement> {
  const existing = await getSettlementById(db, settlementId)
  if (!existing) {
    throw new Error('日結帳不存在')
  }

  if (existing.status !== 'APPROVED') {
    throw new Error('只能鎖定已審核的日結帳')
  }

  // 關聯交易到此日結帳
  const { error: linkError } = await db
    .from('sales_transactions')
    .update({ settlement_id: settlementId })
    .eq('branch_id', existing.branch_id)
    .eq('transaction_date', existing.settlement_date)
    .is('settlement_id', null)

  if (linkError) {
    throw new Error(`關聯交易失敗: ${linkError.message}`)
  }

  const { data, error } = await db
    .from('daily_settlements')
    .update({
      status: 'LOCKED',
      is_locked: true,
      locked_at: new Date().toISOString(),
    })
    .eq('id', settlementId)
    .select()
    .single()

  if (error) {
    throw new Error(`鎖定日結帳失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得月度統計
 */
export async function getMonthlySettlementSummary(
  db: SupabaseClient,
  branchId: string,
  year: number,
  month: number
): Promise<{
  totalSales: number
  totalTransactions: number
  avgDailySales: number
  settlementCount: number
  pendingCount: number
}> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await db
    .from('daily_settlements')
    .select('total_sales, transaction_count, status')
    .eq('branch_id', branchId)
    .gte('settlement_date', startDate)
    .lte('settlement_date', endDate)

  if (error) {
    throw new Error(`取得月度統計失敗: ${error.message}`)
  }

  const settlements = data || []
  const totalSales = settlements.reduce(
    (sum, s) => sum + (parseFloat(String(s.total_sales)) || 0),
    0
  )
  const totalTransactions = settlements.reduce((sum, s) => sum + (s.transaction_count || 0), 0)
  const pendingCount = settlements.filter((s) => s.status === 'PENDING').length

  return {
    totalSales,
    totalTransactions,
    avgDailySales: settlements.length > 0 ? totalSales / settlements.length : 0,
    settlementCount: settlements.length,
    pendingCount,
  }
}
