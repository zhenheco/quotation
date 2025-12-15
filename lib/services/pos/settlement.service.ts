/**
 * POS 日結帳業務邏輯服務
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import {
  DailySettlement,
  SettlementQueryOptions,
  getSettlements,
  getSettlementById,
  getSettlementByDate,
  isDateSettled,
  createOrGetSettlement,
  updateSettlement,
  countCash,
  approveSettlement,
  lockSettlement,
  getMonthlySettlementSummary,
} from '@/lib/dal/pos'

// ============================================
// 類型定義
// ============================================

export interface SettlementListResult {
  settlements: DailySettlement[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface SettlementWorkflow {
  settlement: DailySettlement
  canCount: boolean
  canApprove: boolean
  canLock: boolean
  message: string
}

export interface MonthlyReport {
  year: number
  month: number
  branchId: string
  totalSales: number
  totalTransactions: number
  avgDailySales: number
  settlementCount: number
  pendingCount: number
  workingDays: number
}

// ============================================
// 查詢服務
// ============================================

/**
 * 取得日結帳列表（分頁）
 */
export async function listSettlements(
  db: SupabaseClient,
  options: SettlementQueryOptions & { page?: number; pageSize?: number }
): Promise<SettlementListResult> {
  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const offset = (page - 1) * pageSize

  const settlements = await getSettlements(db, {
    ...options,
    limit: pageSize,
    offset,
  })

  // 取得總數
  const allSettlements = await getSettlements(db, {
    ...options,
    limit: 10000,
    offset: 0,
  })

  return {
    settlements,
    total: allSettlements.length,
    page,
    pageSize,
    totalPages: Math.ceil(allSettlements.length / pageSize),
  }
}

/**
 * 取得日結帳詳情
 */
export async function getSettlementDetail(
  db: SupabaseClient,
  settlementId: string
): Promise<DailySettlement | null> {
  return getSettlementById(db, settlementId)
}

/**
 * 取得特定日期的日結帳
 */
export async function getSettlementForDate(
  db: SupabaseClient,
  branchId: string,
  date: string
): Promise<DailySettlement | null> {
  return getSettlementByDate(db, branchId, date)
}

/**
 * 檢查日期是否已結帳
 */
export async function checkDateSettled(
  db: SupabaseClient,
  branchId: string,
  date: string
): Promise<boolean> {
  return isDateSettled(db, branchId, date)
}

/**
 * 取得月度統計
 */
export async function getMonthlyReport(
  db: SupabaseClient,
  branchId: string,
  year: number,
  month: number
): Promise<MonthlyReport> {
  const summary = await getMonthlySettlementSummary(db, branchId, year, month)

  // 計算該月的工作天數（假設每週六天）
  const daysInMonth = new Date(year, month, 0).getDate()
  const workingDays = Math.ceil(daysInMonth * 6 / 7)

  return {
    year,
    month,
    branchId,
    ...summary,
    workingDays,
  }
}

// ============================================
// 工作流程服務
// ============================================

/**
 * 取得日結帳工作流程狀態
 */
export async function getSettlementWorkflow(
  db: SupabaseClient,
  settlementId: string
): Promise<SettlementWorkflow> {
  const settlement = await getSettlementById(db, settlementId)
  if (!settlement) {
    throw new Error('日結帳不存在')
  }

  let canCount = false
  let canApprove = false
  let canLock = false
  let message = ''

  switch (settlement.status) {
    case 'PENDING':
      canCount = true
      message = '請進行現金盤點'
      break
    case 'COUNTING':
      canApprove = true
      message = '已完成盤點，請審核'
      break
    case 'VARIANCE':
      canApprove = true
      message = '有現金差異，請填寫原因後審核'
      break
    case 'APPROVED':
      canLock = true
      message = '已審核，可進行鎖定'
      break
    case 'LOCKED':
      message = '已鎖定，不可修改'
      break
  }

  return {
    settlement,
    canCount,
    canApprove,
    canLock,
    message,
  }
}

// ============================================
// 寫入服務
// ============================================

/**
 * 開始日結帳（建立或取得）
 */
export async function startSettlement(
  db: SupabaseClient,
  branchId: string,
  date: string,
  createdBy: string,
  depositReceived?: number
): Promise<DailySettlement> {
  // 檢查是否已鎖定
  const existing = await getSettlementByDate(db, branchId, date)
  if (existing && existing.is_locked) {
    throw new Error('該日期已鎖定，無法重新開始日結')
  }

  return createOrGetSettlement(db, {
    branch_id: branchId,
    settlement_date: date,
    deposit_received: depositReceived,
    created_by: createdBy,
  })
}

/**
 * 盤點現金
 */
export async function countSettlementCash(
  db: SupabaseClient,
  settlementId: string,
  actualCash: number
): Promise<DailySettlement> {
  const settlement = await getSettlementById(db, settlementId)
  if (!settlement) {
    throw new Error('日結帳不存在')
  }

  if (settlement.is_locked) {
    throw new Error('日結帳已鎖定，無法盤點')
  }

  if (actualCash < 0) {
    throw new Error('現金金額不能為負數')
  }

  return countCash(db, settlementId, actualCash)
}

/**
 * 審核日結帳
 */
export async function approveSettlementById(
  db: SupabaseClient,
  settlementId: string,
  approvedBy: string,
  varianceReason?: string
): Promise<DailySettlement> {
  const settlement = await getSettlementById(db, settlementId)
  if (!settlement) {
    throw new Error('日結帳不存在')
  }

  if (settlement.is_locked) {
    throw new Error('日結帳已鎖定')
  }

  if (settlement.actual_cash === null) {
    throw new Error('請先進行現金盤點')
  }

  // 檢查是否有差異但未填寫原因
  if (settlement.cash_variance && Math.abs(settlement.cash_variance) > 0.01) {
    if (!varianceReason || varianceReason.trim().length === 0) {
      throw new Error('有現金差異，請填寫差異原因')
    }
  }

  return approveSettlement(db, settlementId, approvedBy, varianceReason)
}

/**
 * 鎖定日結帳
 */
export async function lockSettlementById(
  db: SupabaseClient,
  settlementId: string
): Promise<DailySettlement> {
  const settlement = await getSettlementById(db, settlementId)
  if (!settlement) {
    throw new Error('日結帳不存在')
  }

  if (settlement.status !== 'APPROVED') {
    throw new Error('只能鎖定已審核的日結帳')
  }

  return lockSettlement(db, settlementId)
}

/**
 * 更新儲值金額
 */
export async function updateDepositReceived(
  db: SupabaseClient,
  settlementId: string,
  depositReceived: number
): Promise<DailySettlement> {
  const settlement = await getSettlementById(db, settlementId)
  if (!settlement) {
    throw new Error('日結帳不存在')
  }

  if (settlement.is_locked) {
    throw new Error('日結帳已鎖定，無法修改')
  }

  if (depositReceived < 0) {
    throw new Error('儲值金額不能為負數')
  }

  return updateSettlement(db, settlementId, {
    deposit_received: depositReceived,
  })
}

// ============================================
// 批次處理
// ============================================

/**
 * 批次鎖定日結帳
 */
export async function batchLockSettlements(
  db: SupabaseClient,
  settlementIds: string[]
): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
  const success: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const id of settlementIds) {
    try {
      await lockSettlementById(db, id)
      success.push(id)
    } catch (error) {
      failed.push({
        id,
        error: error instanceof Error ? error.message : '未知錯誤',
      })
    }
  }

  return { success, failed }
}

/**
 * 自動建立當月日結帳
 */
export async function createMonthlySettlements(
  db: SupabaseClient,
  branchId: string,
  year: number,
  month: number,
  createdBy: string
): Promise<DailySettlement[]> {
  const settlements: DailySettlement[] = []
  const daysInMonth = new Date(year, month, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    // 跳過未來日期
    const dateObj = new Date(date)
    if (dateObj > new Date()) {
      continue
    }

    const settlement = await startSettlement(db, branchId, date, createdBy)
    settlements.push(settlement)
  }

  return settlements
}
